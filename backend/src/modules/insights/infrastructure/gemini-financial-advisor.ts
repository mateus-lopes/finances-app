import type { FinancialAnalysis, FinancialSnapshot } from "../domain/financial-analysis";
import type { FinancialAdvisor } from "../application/ports";

const MODEL = "gemini-3.6-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent`;

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const pct = (n: number) => `${n.toFixed(1)}%`;

function buildPrompt(s: FinancialSnapshot): string {
  const monthLabel = `${MONTH_NAMES[s.period.month - 1]}/${s.period.year}`;

  const categoriesText = s.categories
    .map((c) => {
      const share = s.totalExpenses > 0 ? ((c.total / s.totalExpenses) * 100).toFixed(1) : "0.0";
      return `  ${c.name}: ${fmt(c.total)} (${share}%)`;
    })
    .join("\n");

  const historyText = s.history
    .map((h) => `  ${MONTH_NAMES[h.month - 1]}/${h.year}: receita ${fmt(h.income)} | despesas ${fmt(h.expenses)} | poupança ${pct(h.savingsRate)}`)
    .join("\n");

  return `Você é um assistente financeiro pessoal. Analise os dados do mês ${monthLabel} e responda APENAS com JSON válido, sem texto adicional, sem markdown, sem blocos de código.

DADOS DO MÊS:
- Receita: ${fmt(s.totalIncome)}
- Despesas: ${fmt(s.totalExpenses)}
- Saldo: ${fmt(s.saldo)}
- Investido no mês: ${fmt(s.invested)}
- Taxa de poupança: ${pct(s.savingsRate)}
- Comprometimento da renda: ${pct(s.commitmentPct)}
- Livre para gastar: ${fmt(s.freeToSpend)}

GASTOS POR CATEGORIA:
${categoriesText || "  (nenhum gasto categorizado)"}

HISTÓRICO DOS ÚLTIMOS 6 MESES:
${historyText}

Formato de resposta (JSON puro, sem markdown):
{
  "sentimento": "positivo" ou "neutro" ou "negativo",
  "avaliacao": "1 a 2 frases sobre o desempenho geral do mês, com valores em R$",
  "destaques": [
    { "tipo": "positivo" ou "atencao" ou "negativo", "texto": "ponto específico com valor em R$ se relevante" },
    { "tipo": "...", "texto": "..." },
    { "tipo": "...", "texto": "..." }
  ],
  "sugestao": "uma sugestão prática e específica para o próximo mês"
}

Regras: exatamente 3 itens em destaques; sentimento positivo se saldo > 0 e poupança > 10%, negativo se saldo < 0, neutro caso contrário; português; valores em R$.`;
}

/** Adaptador do Google Gemini. Trocar de provedor = nova implementação de FinancialAdvisor. */
export class GeminiFinancialAdvisor implements FinancialAdvisor {
  constructor(private readonly apiKey: string) {}

  async analyze(snapshot: FinancialSnapshot): Promise<FinancialAnalysis> {
    if (!this.apiKey) throw new Error("GEMINI_API_KEY não configurada");

    const response = await fetch(ENDPOINT, {
      method: "POST",
      // Chave no header (não na URL) para não vazar em logs de erro/proxy.
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: buildPrompt(snapshot) }] }] }),
    });

    if (!response.ok) {
      throw new Error(`Gemini ${response.status}: ${await response.text()}`);
    }

    const result = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
    };
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") throw new Error(`Resposta inesperada: ${JSON.stringify(result)}`);

    return JSON.parse(text.replace(/```json|```/g, "").trim()) as FinancialAnalysis;
  }
}
