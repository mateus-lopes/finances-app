/**
 * Fronteiras arquiteturais do monólito modular — rode `pnpm lint:arch`.
 * Detalhes e motivação em docs/architecture.md.
 */
const MODULE = "^src/modules/([^/]+)/";

/** Tabelas que cada módulo pode acessar via db/schema/<arquivo>. */
const TABLE_OWNERSHIP = {
  identity: ["users"],
  ledger: ["accounts", "transactions", "categories", "creditCardInvoices"],
  planning: ["bills"],
};

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Ciclos entre arquivos impedem entender e extrair módulos.",
      from: {},
      to: { circular: true },
    },

    // ── Camadas ────────────────────────────────────────────────────────────
    {
      name: "domain-is-pure",
      severity: "error",
      comment: "domain/ só conhece o próprio domínio e o shared/kernel (nada de framework, banco ou pacotes npm).",
      from: { path: `${MODULE}domain/` },
      to: {
        pathNot: [`^src/modules/$1/domain/`, "^src/shared/kernel/"],
      },
    },
    {
      name: "application-depends-inward",
      severity: "error",
      comment: "application/ orquestra o domínio via ports; não importa infraestrutura, apresentação, banco ou Express.",
      from: { path: `${MODULE}application/` },
      to: {
        pathNot: [
          `^src/modules/$1/(domain|application)/`,
          "^src/modules/[^/]+/contracts\\.ts$",
          "^src/shared/kernel/",
        ],
      },
    },
    {
      name: "presentation-not-to-infrastructure",
      severity: "error",
      comment: "presentation/ fala com casos de uso; nunca com repositórios/adaptadores ou o banco.",
      from: { path: `${MODULE}presentation/` },
      to: { path: [`^src/modules/[^/]+/infrastructure/`, "^src/db/"] },
    },
    {
      name: "infrastructure-not-to-presentation",
      severity: "error",
      from: { path: `${MODULE}infrastructure/` },
      to: { path: `^src/modules/[^/]+/presentation/` },
    },

    // ── Módulos ────────────────────────────────────────────────────────────
    {
      name: "modules-talk-through-contracts",
      severity: "error",
      comment: "Outro módulo só pode ser acessado pelo seu contracts.ts (API pública).",
      from: { path: MODULE },
      to: {
        path: "^src/modules/([^/]+)/",
        pathNot: ["^src/modules/$1/", "^src/modules/[^/]+/contracts\\.ts$"],
      },
    },
    {
      name: "module-factory-only-in-bootstrap",
      severity: "error",
      comment: "*.module.ts monta implementações concretas; só o composition root pode usá-lo.",
      from: { pathNot: "^src/bootstrap/" },
      to: { path: "^src/modules/[^/]+/[^/]+\\.module\\.ts$" },
    },
    {
      name: "shared-does-not-know-modules",
      severity: "error",
      from: { path: "^src/shared/" },
      to: { path: "^src/modules/" },
    },

    // ── Dono das tabelas ───────────────────────────────────────────────────
    ...Object.entries(TABLE_OWNERSHIP).flatMap(([owner, tables]) => [
      {
        name: `tables-owned-by-${owner}`,
        severity: "error",
        comment: `Somente ${owner} (e o read model de insights) acessa ${tables.join(", ")}.`,
        from: {
          path: "^src/modules/",
          pathNot: [`^src/modules/(${owner}|insights)/`],
        },
        to: { path: `^src/db/schema/(${tables.join("|")})\\.ts$` },
      },
    ]),
    {
      name: "schema-registry-only-in-read-model",
      severity: "error",
      comment: "O barrel db/schema/index.ts expõe todas as tabelas; módulos (exceto insights) importam o arquivo da tabela.",
      from: { path: "^src/modules/", pathNot: "^src/modules/insights/" },
      to: { path: "^src/db/schema/index\\.ts$" },
    },
    {
      name: "db-only-in-infrastructure",
      severity: "error",
      comment: "Acesso a banco só em infrastructure/ (o *.module.ts recebe a conexão para injetá-la).",
      from: {
        path: MODULE,
        pathNot: [`${MODULE}infrastructure/`, "^src/modules/[^/]+/[^/]+\\.module\\.ts$"],
      },
      to: { path: "^src/db/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^src/__tests__/|/__tests__/|^src/scripts/)" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
