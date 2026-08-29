import { db } from "../../db/client";
import { transactions, categories } from "../../db/schema";
import { eq } from "drizzle-orm";

export interface ParsedTransaction {
  fitid: string;
  date: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  description: string;
  categoryId: number | null;
  toAccountId?: number | null;
}

export interface PreviewItem extends ParsedTransaction {
  duplicate: boolean;
  suggestedCategoryId: number | null;
}

// Padrões baseados nas transações reais do usuário.
// Mapeados por nome de categoria para sobreviver a recriações de categoria.
const RULES: { pattern: RegExp; categoryName: string }[] = [
  // Mariana
  { pattern: /HELOISA\s+LOPES\s+ALBANO/i,  categoryName: "Mariana" },
  { pattern: /MARIANA\s+ADACIA/i,           categoryName: "Mariana" },
  { pattern: /limpeza\s+de\s+pele/i,        categoryName: "Mariana" },
  { pattern: /uber\s+mariana/i,             categoryName: "Mariana" },

  // Uber / 99
  { pattern: /99\s+TECNOLOGIA/i,            categoryName: "Uber" },
  { pattern: /\bUBER\b/i,                   categoryName: "Uber" },

  // Saúde
  { pattern: /DROGARIA/i,                   categoryName: "Saúde" },
  { pattern: /FARMAC/i,                     categoryName: "Saúde" },
  { pattern: /CLINICA/i,                    categoryName: "Saúde" },
  { pattern: /MEDIC/i,                      categoryName: "Saúde" },

  // Lanches / Alimentação
  { pattern: /FORT\s+ATACADISTA/i,          categoryName: "Lanches" },
  { pattern: /SUPERMERCADO/i,               categoryName: "Lanches" },
  { pattern: /ATACADAO/i,                   categoryName: "Lanches" },
  { pattern: /SNACK\s+BAR/i,               categoryName: "Lanches" },
  { pattern: /CAPPTA/i,                     categoryName: "Lanches" },
  { pattern: /OFC\s+CHICKEN/i,             categoryName: "Lanches" },
  { pattern: /IFOOD/i,                      categoryName: "Lanches" },
  { pattern: /RAPPI/i,                      categoryName: "Lanches" },

  // Assinaturas
  { pattern: /DLOCAL/i,                     categoryName: "Assinaturas" },
  { pattern: /APPFIN\.NET/i,               categoryName: "Assinaturas" },
  { pattern: /NETFLIX/i,                    categoryName: "Assinaturas" },
  { pattern: /SPOTIFY/i,                    categoryName: "Assinaturas" },
  { pattern: /AMAZON\s+PRIME/i,            categoryName: "Assinaturas" },
  { pattern: /YOUTUBE\s+PREMIUM/i,         categoryName: "Assinaturas" },

  // Casa
  { pattern: /OUROCARD/i,                   categoryName: "Casa" },
  { pattern: /ENERGIA\s+ELETRICA/i,        categoryName: "Casa" },
  { pattern: /CELPE/i,                      categoryName: "Casa" },
  { pattern: /SANEAMENTO/i,                 categoryName: "Casa" },

  // Roupas
  { pattern: /HAVAN/i,                      categoryName: "Roupas" },
  { pattern: /RENNER/i,                     categoryName: "Roupas" },
  { pattern: /RIACHUELO/i,                  categoryName: "Roupas" },
  { pattern: /C&A/i,                        categoryName: "Roupas" },
];

// Lançamentos informativos do BB — não são movimentações reais
const INFORMATIONAL = [
  /saldo do dia/i,
  /saldo anterior/i,
];

// PIX enviado para Mateus ou Mariana = transferência interna entre contas da família
function isTransfer(memo: string): boolean {
  return /pix\s+enviado/i.test(memo) && /(mateus|mariana)/i.test(memo);
}

function extractTag(block: string, name: string): string {
  const m = new RegExp(`<${name}>([^<\\r\\n]+)`, "i").exec(block);
  return m ? m[1].trim() : "";
}

function parseOFXDate(raw: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(raw);
  if (!m) return null;
  const year = parseInt(m[1]!);
  if (year < 2000 || year > 2100) return null; // rejeita datas inválidas do BB
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function parseOFX(content: string): ParsedTransaction[] {
  const results: ParsedTransaction[] = [];
  const blockRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let m: RegExpExecArray | null;

  while ((m = blockRe.exec(content)) !== null) {
    const block = m[1];
    const fitid   = extractTag(block, "FITID");
    const dtposted = extractTag(block, "DTPOSTED");
    const trnamt  = extractTag(block, "TRNAMT");
    const memo    = extractTag(block, "MEMO") || extractTag(block, "NAME");

    const raw = parseFloat(trnamt.replace(",", "."));
    if (isNaN(raw) || !memo || !dtposted) continue;
    if (INFORMATIONAL.some(re => re.test(memo))) continue;
    // Artefato do BB: OUROCARD aparece como crédito espelho do débito da fatura
    if (raw >= 0 && /ourocard/i.test(memo)) continue;

    const date = parseOFXDate(dtposted);
    if (!date) continue;

    const type = isTransfer(memo) ? "transfer" : raw >= 0 ? "income" : "expense";
    results.push({
      fitid,
      date,
      amount: Math.abs(raw),
      type,
      description: memo,
      categoryId: null,
    });
  }

  return results;
}

export async function previewOFX(userId: number, content: string): Promise<PreviewItem[]> {
  const parsed = parseOFX(content);
  if (!parsed.length) return [];

  const [existing, userCategories] = await Promise.all([
    db
      .select({ date: transactions.date, amount: transactions.amount, description: transactions.description })
      .from(transactions)
      .where(eq(transactions.userId, userId)),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.userId, userId)),
  ]);

  const existingSet = new Set(
    existing.map(t =>
      `${t.date}|${parseFloat(t.amount ?? "0").toFixed(2)}|${(t.description ?? "").toLowerCase().trim()}`
    )
  );

  const categoryByName = new Map(userCategories.map(c => [c.name.toLowerCase(), c.id]));

  function suggest(description: string): number | null {
    for (const rule of RULES) {
      if (rule.pattern.test(description)) {
        return categoryByName.get(rule.categoryName.toLowerCase()) ?? null;
      }
    }
    return null;
  }

  return parsed.map(t => {
    const suggested = suggest(t.description);
    return {
      ...t,
      categoryId: suggested,
      suggestedCategoryId: suggested,
      duplicate: existingSet.has(`${t.date}|${t.amount.toFixed(2)}|${t.description.toLowerCase().trim()}`),
    };
  });
}

export async function confirmOFX(
  userId: number,
  items: ParsedTransaction[],
  accountId: number | null
): Promise<number> {
  if (!items.length) return 0;

  const rows = items.map(t => {
    const parts = t.date.split("-").map(Number);
    const year  = parts[0]!;
    const month = parts[1]!;

    let fromId: number | null = null;
    let toId: number | null = null;
    if (t.type === "transfer") {
      fromId = accountId;
      toId   = t.toAccountId ?? null;
    } else if (t.type === "expense") {
      fromId = accountId;
    } else {
      toId = accountId;
    }

    return {
      userId,
      type: t.type,
      fromAccountId: fromId,
      toAccountId: toId,
      amount: t.amount.toFixed(2),
      date: t.date,
      month,
      year,
      description: t.description,
      categoryId: t.categoryId ?? null,
    };
  });

  await db.insert(transactions).values(rows);
  return rows.length;
}
