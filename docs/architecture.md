# Arquitetura — monólito modular

Um único serviço Node serve a API em `/api/*` e o build do Vue em todo o resto.
Mesma origem ⇒ sem CORS e cookie de sessão first-party (`SameSite=Lax`).

```
finances-app/
├── backend/                 Express + Drizzle (Postgres/Neon)
├── frontend/                Vue 3 + Pinia + Vite (PWA)
├── railway.toml             deploy: 1 serviço, nixpacks
├── nixpacks.toml
└── package.json             scripts da raiz (build/start/dev/test/lint:arch)
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
├── server.ts                    entrypoint (listen)
├── app.ts                       monta o app (usado também pelos testes)
├── bootstrap/
│   ├── container.ts             composition root — único lugar que instancia implementações
│   └── http-app.ts              Express: helmet, /api, SPA estático, error handler
├── db/
│   ├── client.ts                pool pg + drizzle (pool.on('error') por causa do Neon)
│   └── schema/                  schema físico (1 arquivo por tabela) + index.ts (registro)
├── shared/
│   ├── kernel/                  Period, money, Clock, refs — puro, sem dependências
│   └── infrastructure/          env, helpers HTTP (asyncHandler, validação, SPA, erros)
├── scripts/                     manutenção (`npx tsx src/scripts/<nome>.ts`)
└── modules/<módulo>/
    ├── domain/                  regras puras (entidades, políticas, cálculos)
    ├── application/
    │   ├── ports.ts             interfaces que a infraestrutura implementa
    │   └── use-cases/           1 classe por caso de uso (`execute`)
    ├── infrastructure/          repositórios Drizzle, adaptadores externos (Gemini, leitor OFX)
    ├── presentation/http/       routers Express + validação Zod do contrato HTTP
    ├── contracts.ts             API pública consumida por outros módulos (só tipos/interfaces)
    └── <módulo>.module.ts       factory que monta o módulo (usada só pelo bootstrap)
```

### Regras de dependência (verificadas por `pnpm lint:arch`)

- `domain` → só o próprio domínio e `shared/kernel`. Nada de Express, Drizzle ou pacotes npm.
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
pnpm dev            # backend :3001 + Vite :5174 (proxy /api → :3001)
pnpm test           # testes de integração do backend (Vitest)
pnpm test:e2e       # Playwright
pnpm typecheck
pnpm lint:arch
```

## Deploy (Railway)

Um serviço apontando para a **raiz** do repositório. `railway.toml` usa nixpacks
(não crie Dockerfile — o Railway passaria a ignorar o `railway.toml`).

- build: `pnpm build` (frontend → `frontend/dist`, backend → `backend/dist`)
- start: `pnpm start` (roda migrações e sobe `backend/dist/server.js`)
- healthcheck: `GET /api/health`

Variáveis: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `ADMIN_RESET_PASSWORD`,
`GEMINI_API_KEY`. (`PORT` é injetada pelo Railway; `CORS_ORIGIN` e `VITE_API_URL` não existem mais.)
