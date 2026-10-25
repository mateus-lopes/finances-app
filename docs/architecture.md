# Arquitetura — monólito modular

Um único Cloudflare Worker serve a API em `/api/*`; o build do Vue sai dos static assets do
mesmo Worker em todo o resto.
Mesma origem ⇒ sem CORS e cookie de sessão first-party (`SameSite=Lax`).

```
finances-app/
├── backend/                 Hono + Drizzle (Postgres/Neon, driver HTTP)
├── frontend/                Vue 3 + Pinia + Vite (PWA)
├── wrangler.jsonc           deploy: Worker + static assets + rate limit do login
└── package.json             scripts da raiz (dev/build/preview/deploy/test/lint:arch)
```

## Bounded contexts

| Módulo        | Responsabilidade                                                    | Depende de          |
|---------------|---------------------------------------------------------------------|---------------------|
| `identity`    | login, sessão (JWT em cookie), redefinição de senha                 | —                   |
| `ledger`      | **core**: contas, transações, categorias, faturas de cartão, saldos | —                   |
| `planning`    | recorrentes (bills) e ocorrências mensais — apenas lembretes        | ledger              |
| `categorizer` | regras de categorização por palavra-chave                           | ledger              |
| `importing`   | importação de extrato OFX (regras do Banco do Brasil)               | ledger              |
| `insights`    | dashboard, históricos e análise por IA (lado de **leitura**)        | ledger, planning    |

Ninguém depende de `importing`, `categorizer` ou `insights` — podem ser removidos sem impacto.
O OFX importado é a fonte de verdade das transações: marcar um recorrente como pago **não** cria transação.

## Backend

```
backend/src/
├── worker.ts                    entrypoint do Cloudflare Worker (config vem do `env` do Worker)
├── server.ts                    entrypoint Node para dev local (@hono/node-server)
├── app.ts                       app Node configurado pelo `.env` (dev e testes)
├── bootstrap/
│   ├── container.ts             composition root — único lugar que instancia implementações
│   └── http-app.ts              Hono: secure headers, limite de corpo, /api, 404 e error handler
├── db/
│   ├── client.ts                createDatabase: drizzle + neon-http (1 fetch por query, sem pool)
│   ├── node.ts                  `db` pronto a partir do `.env` — só para scripts e testes
│   └── schema/                  schema físico (1 arquivo por tabela) + index.ts (registro)
├── shared/
│   ├── kernel/                  Period, money, Clock, refs — puro, sem dependências
│   └── infrastructure/          config, helpers HTTP (validação, erros, rate limiter)
├── scripts/                     manutenção (`npx tsx src/scripts/<nome>.ts`)
└── modules/<módulo>/
    ├── domain/                  regras puras (entidades, políticas, cálculos)
    ├── application/
    │   ├── ports.ts             interfaces que a infraestrutura implementa
    │   └── use-cases/           1 classe por caso de uso (`execute`)
    ├── infrastructure/          repositórios Drizzle, adaptadores externos (Gemini, leitor OFX)
    ├── presentation/http/       routers Hono + validação Zod do contrato HTTP
    ├── contracts.ts             API pública consumida por outros módulos (só tipos/interfaces)
    └── <módulo>.module.ts       factory que monta o módulo (usada só pelo bootstrap)
```

### Regras de dependência (verificadas por `pnpm lint:arch`)

- `domain` → só o próprio domínio e `shared/kernel`. Nada de Hono, Drizzle ou pacotes npm.
- `application` → domínio, ports e `contracts.ts` de outros módulos. Nunca infraestrutura/apresentação.
- `presentation` → casos de uso e tipos de domínio. Nunca repositórios nem `db/`.
- `infrastructure` → implementa ports; não conhece apresentação.
- Entre módulos: **somente** via `contracts.ts` (ex.: `planning` usa `LedgerApi`).
- `*.module.ts` só é importado por `bootstrap/`.
- `shared/` não conhece módulos.
- Sem ciclos.

### Dono de cada tabela

O banco é um só, mas cada tabela tem um dono — só a infraestrutura do dono a acessa:

| Tabela                                                       | Dono       |
|--------------------------------------------------------------|------------|
| `users`                                                      | identity   |
| `accounts`, `transactions`, `categories`, `credit_card_invoices` | ledger |
| `bills`, `bill_occurrences`                                  | planning   |

Exceção deliberada: `insights` é um **read model** e consulta qualquer tabela (joins entre
contextos para relatórios). Para não duplicar regra de negócio, saldos/faturas/saldo real
vêm do `LedgerApi`.

Módulos importam o arquivo da tabela (`db/schema/transactions`), nunca o barrel `db/schema`
— é isso que permite ao lint verificar a posse. Migrações continuam em `backend/drizzle/`.

### Como adicionar uma funcionalidade

1. Regra de negócio pura → `domain/` (testável sem banco).
2. Orquestração → novo caso de uso em `application/use-cases/`; se precisar de dados, declare/estenda um port.
3. Persistência → implemente o port em `infrastructure/`.
4. Endpoint → router em `presentation/http/` (valide a entrada com Zod ali).
5. Ligue tudo em `<módulo>.module.ts`. Se outro módulo precisar, exponha em `contracts.ts`.
6. Rode `pnpm lint:arch` e `pnpm typecheck`.

## Frontend

```
frontend/src/
├── main.ts
├── app/                         shell: App.vue, router, layouts, navegação, plugins
├── shared/                      genérico: ui/, api/http.ts, composables, stores (mês, tema), types
└── modules/<módulo>/            espelha os contextos do backend
    ├── api.ts                   gateway HTTP do módulo (único lugar que chama a API)
    ├── types.ts                 contratos da API
    ├── routes.ts                rotas do módulo (lazy)
    ├── views/ components/ composables/ stores/
    └── index.ts                 API pública do módulo
```

Regras (`pnpm --filter @cg/frontend lint:arch`):
- outro módulo ou o `app/` só importam `modules/<x>/index.ts`;
- `shared/` não conhece módulos nem `app/`; módulos não conhecem `app/`;
- só os `api.ts` usam o cliente HTTP.

Convenção de import: dentro do módulo, caminhos relativos; para `shared/` e outros módulos, `@/`.

## Desenvolvimento

```bash
pnpm install
pnpm dev            # API Node :3001 (tsx) + Vite :5174 (proxy /api → :3001)
pnpm preview        # build + wrangler dev :8787 — o Worker real, com os secrets do .dev.vars
pnpm test           # testes de integração do backend (Vitest, contra o banco do .env)
pnpm test:e2e       # Playwright (FRONTEND_URL/BACKEND_URL=http://127.0.0.1:8787 testa o Worker)
pnpm typecheck
pnpm lint:arch
```

O `.dev.vars` (gitignored) tem as mesmas chaves do `backend/.env`: `DATABASE_URL`, `JWT_SECRET`,
`ADMIN_RESET_PASSWORD`, `GEMINI_API_KEY`.

## Deploy (Cloudflare Workers)

```bash
pnpm deploy         # typecheck + lint:arch + build do frontend + wrangler deploy
```

- O Worker só é invocado para `/api/*` (`run_worker_first`); o resto é asset estático, com
  fallback para `index.html` (`not_found_handling: single-page-application`).
- Headers dos assets (CSP, cache imutável de `/assets/*`) ficam em `frontend/public/_headers`.
- Rate limit do login: binding `LOGIN_LIMITER` (10 tentativas/min por IP).
- Secrets: `npx wrangler secret put <NOME>` para `DATABASE_URL`, `JWT_SECRET`,
  `ADMIN_RESET_PASSWORD` e `GEMINI_API_KEY`. `NODE_ENV=production` vem de `vars`.
- Logs: `npx wrangler tail` ou o painel do Worker (observability ligado).

**Migrações não rodam no deploy.** O histórico do Drizzle foi resetado e a tabela
`drizzle.__drizzle_migrations` do banco está vazia, embora o schema já esteja na versão de
`0001`. Rodar `db:migrate` hoje tentaria recriar as tabelas. Antes da próxima migration,
registre as duas existentes nessa tabela (baseline) e então rode `pnpm --filter @cg/backend db:migrate`.
