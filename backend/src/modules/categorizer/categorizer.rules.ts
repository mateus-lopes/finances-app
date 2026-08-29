export const MATEUS_USER_ID = 11;

function normalize(raw: string): string {
  let d = raw.trim();
  d = d.replace(/^\d{2}\/\d{2}\s+\d{2}:\d{2}\s+/, "");
  const pix = d.match(/Pix (?:enviado|recebido):\s*"Cp\s*:\d+-(.+?)"/i);
  if (pix) { d = pix[1]; }
  else {
    const compra = d.match(/Compra no d[eé]bito:\s*"No estabelecimento\s+(.+?)"/i);
    if (compra) {
      d = compra[1];
      d = d.replace(/\s+[A-Z]{3,}\s+[A-Z]{2,3}\s*$/, "");
    }
  }
  d = d.replace(/\*.*$/, "");
  return d.replace(/\s+/g, " ").trim().toUpperCase();
}

const RULES: { pattern: RegExp; categoryName: string }[] = [
  // Mariana — nomes específicos e CPF
  { pattern: /MARIANA ADACIA/,            categoryName: "Mariana" },
  { pattern: /HELOISA LOPES ALBANO/,      categoryName: "Mariana" },
  { pattern: /08534924929/,               categoryName: "Mariana" },

  // Investimentos
  { pattern: /HB20/,                      categoryName: "Investimentos" },
  { pattern: /VALOR QUE PAGOU OS INVESTIMENTOS/, categoryName: "Investimentos" },

  // Salário
  { pattern: /TS SOLUTIONS/,              categoryName: "Salario Mateus" },
  { pattern: /AJUSTE DE SALARIO/,         categoryName: "Salario Mateus" },

  // Mateus (pessoal — SK luthier)
  { pattern: /SK LUTHIER/i,              categoryName: "Mateus" },

  // Casamento
  { pattern: /CERIMONIALISTA/i,           categoryName: "Casamento" },
  { pattern: /LUA DE MEL/i,              categoryName: "Casamento" },
  { pattern: /PRESENTE FAMILIA NECO/i,   categoryName: "Casamento" },

  // Saúde
  { pattern: /DROGARIA/,                  categoryName: "Saúde" },
  { pattern: /FARMAC/,                    categoryName: "Saúde" },

  // Transporte (99/Uber — vem antes do \bUBER\b genérico)
  { pattern: /99 TECNOLOGIA/,             categoryName: "Uber" },
  { pattern: /UBER DO BRASIL TECNOLOGIA/, categoryName: "Uber" },
  { pattern: /\bUBER\b/,                  categoryName: "Uber" },

  // Assinaturas
  { pattern: /DLOCAL/,                    categoryName: "Assinaturas" },
  { pattern: /APPFIN\.NET/,              categoryName: "Assinaturas" },

  // Lanches / Alimentação
  { pattern: /FORT ATACADISTA/,           categoryName: "Lanches" },
  { pattern: /SUPERMERCADO/i,             categoryName: "Lanches" },
  { pattern: /SNACK BAR/,                 categoryName: "Lanches" },
  { pattern: /CAPPTA/,                    categoryName: "Lanches" },
  { pattern: /IFOODCOM/,                  categoryName: "Lanches" },

  // Roupas / Compras (HAVAN — usuário categorizou assim)
  { pattern: /HAVAN/,                     categoryName: "Roupas" },

  // Casa
  { pattern: /OUROCARD/,                  categoryName: "Casa" },
];

export function categorize(description: string): string | null {
  const norm = normalize(description);
  for (const rule of RULES) {
    if (rule.pattern.test(norm)) return rule.categoryName;
  }
  return null;
}
