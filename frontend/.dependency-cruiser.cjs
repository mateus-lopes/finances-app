/**
 * Fronteiras do frontend — rode `pnpm lint:arch`.
 * Espelham os módulos do backend; detalhes em docs/architecture.md.
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "shared-is-generic",
      severity: "error",
      comment: "shared/ não conhece módulos de negócio nem o shell da aplicação.",
      from: { path: "^src/shared/" },
      to: { path: "^src/(modules|app)/" },
    },
    {
      name: "modules-do-not-know-app",
      severity: "error",
      comment: "Módulos não dependem do shell (layout, navegação, router).",
      from: { path: "^src/modules/" },
      to: { path: "^src/app/" },
    },
    {
      name: "modules-talk-through-index",
      severity: "error",
      comment: "Outro módulo só pode ser importado pelo seu index.ts (API pública).",
      from: { path: "^src/modules/([^/]+)/" },
      to: {
        path: "^src/modules/[^/]+/",
        pathNot: ["^src/modules/$1/", "^src/modules/[^/]+/index\.ts$"],
      },
    },
    {
      name: "app-uses-module-index",
      severity: "error",
      comment: "O shell (app/) também só usa a API pública dos módulos.",
      from: { path: "^src/app/" },
      to: { path: "^src/modules/[^/]+/", pathNot: "^src/modules/[^/]+/index\.ts$" },
    },
    {
      name: "http-only-in-gateways",
      severity: "error",
      comment: "Chamadas HTTP ficam nos api.ts dos módulos; telas e stores usam esses gateways.",
      from: { path: "^src/", pathNot: ["^src/modules/[^/]+/api\.ts$", "^src/shared/api/"] },
      to: { path: "^src/shared/api/http\.ts$" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.app.json" },
    enhancedResolveOptions: { extensions: [".ts", ".vue", ".js"] },
  },
};
