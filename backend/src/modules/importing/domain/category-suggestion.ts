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
  { pattern: /ENERGIA\s+ELETRICA/i,        categoryName: "Casa" },
  { pattern: /CELPE/i,                      categoryName: "Casa" },
  { pattern: /SANEAMENTO/i,                 categoryName: "Casa" },

  // Roupas
  { pattern: /HAVAN/i,                      categoryName: "Roupas" },
  { pattern: /RENNER/i,                     categoryName: "Roupas" },
  { pattern: /RIACHUELO/i,                  categoryName: "Roupas" },
  { pattern: /C&A/i,                        categoryName: "Roupas" },
];

/** Nome da categoria sugerida para a descrição, ou null. */
export function suggestCategoryName(description: string): string | null {
  return RULES.find((rule) => rule.pattern.test(description))?.categoryName ?? null;
}
