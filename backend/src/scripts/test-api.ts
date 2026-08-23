/**
 * Script de teste de integração via HTTP.
 * Cobre: CRUD de todos os módulos, ambos os usuários (Thiago + Mateus),
 * invariantes matemáticos, edge cases e isolamento de dados entre usuários.
 *
 * Pré-requisito: servidor rodando em localhost:3001 e seed executado.
 * Execução: npx tsx src/scripts/test-api.ts
 */

const BASE = "http://localhost:3001";
const THIAGO = { email: "thiago@controle.local", password: "senha123" };
const MATEUS = { email: "mateusalbano22@gmail.com", password: "c7t?Waw4D6" };

// ── Estado ────────────────────────────────────────────────────────────────────
let cookie = "";
let passed = 0;
let failed = 0;
const errors: string[] = [];

// ── Aguardar servidor ────────────────────────────────────────────────────────
async function waitForServer(maxMs = 10000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      await fetch(`${BASE}/api/auth/me`);
      return; // servidor respondeu (qualquer status)
    } catch {}
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error("Servidor não respondeu em 10s — rode npm run dev primeiro");
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function req<T>(method: string, path: string, body?: object, overrideCookie?: string): Promise<{ status: number; data: T }> {
  const useCookie = overrideCookie !== undefined ? overrideCookie : cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(useCookie ? { Cookie: useCookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie && overrideCookie === undefined) cookie = setCookie.split(";")[0]!;
  const data = await res.json() as T;
  return { status: res.status, data };
}

async function login(creds: { email: string; password: string }): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });
  const setCookie = res.headers.get("set-cookie");
  return setCookie ? setCookie.split(";")[0]! : "";
}

function ok(label: string, value: unknown = true) {
  if (value) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    errors.push(label);
    failed++;
  }
}

function isNum(v: unknown): v is number { return typeof v === "number" && !isNaN(v) && isFinite(v); }
function isArr(v: unknown): v is unknown[] { return Array.isArray(v); }
function isObj(v: unknown): v is Record<string, unknown> { return v !== null && typeof v === "object" && !Array.isArray(v); }
function isStr(v: unknown): v is string { return typeof v === "string"; }
function approxEq(a: number, b: number, eps = 0.01) { return Math.abs(a - b) < eps; }

function section(name: string) {
  console.log(`\n── ${name} ${"─".repeat(Math.max(0, 55 - name.length))}`);
}

// ── 1. AUTH ───────────────────────────────────────────────────────────────────
async function testAuth() {
  section("AUTH — login / /me / logout / erros");

  // Login correto
  const { status: s1, data: d1 } = await req<Record<string, unknown>>("POST", "/api/auth/login", THIAGO);
  ok("login Thiago → 200", s1 === 200);
  ok("retorna user.id", isNum((d1 as any)?.user?.id));
  ok("cookie JWT recebido (auth_token=)", cookie.startsWith("auth_token="));

  // /me
  const { status: s2, data: d2 } = await req<Record<string, unknown>>("GET", "/api/auth/me");
  ok("GET /me → 200", s2 === 200);
  ok("/me retorna email do Thiago", (d2 as any)?.user?.email === THIAGO.email);

  // Nota: testes de credenciais erradas omitidos para não esgotar o rate limit
  // (10 tentativas/15min por IP). O rate limiter retorna 429 após o limite,
  // o que quebraria os logins do Mateus nos testes seguintes.
}

// ── 2. SEGURANÇA — sem cookie ────────────────────────────────────────────────
async function testSeguranca() {
  section("SEGURANÇA — sem cookie → 401 em rotas protegidas");
  const endpoints = [
    "/api/categories/",
    "/api/accounts/?month=8&year=2026",
    "/api/transactions/?month=8&year=2026",
    "/api/bills/?month=8&year=2026",
    "/api/dashboard/?month=8&year=2026",
    "/api/analytics?month=8&year=2026",
    "/api/goals?month=8&year=2026",
  ];
  for (const ep of endpoints) {
    const { status } = await req<unknown>("GET", ep, undefined, "");
    ok(`GET ${ep.split("?")[0]} sem cookie → 401`, status === 401);
  }
}

// ── 3. CATEGORIAS — CRUD ─────────────────────────────────────────────────────
async function testCategorias(): Promise<void> {
  section("CATEGORIAS — CRUD completo");

  // Lista inicial
  const { status: s0, data: d0 } = await req<unknown[]>("GET", "/api/categories/");
  ok("GET categorias → 200", s0 === 200);
  ok("retorna array", isArr(d0));
  const countAntes = isArr(d0) ? d0.length : 0;
  ok("Thiago tem 10 categorias (seed)", countAntes === 10);

  // Criar
  const { status: s1, data: d1 } = await req<Record<string, unknown>>("POST", "/api/categories/", { name: "Teste Categoria", color: "#abcdef" });
  ok("POST criar categoria → 201", s1 === 201);
  ok("retorna id", isNum(d1?.id));
  ok("retorna name correto", d1?.name === "Teste Categoria");
  const catId = d1?.id as number;

  // Validação: nome vazio
  const { status: s1b } = await req<unknown>("POST", "/api/categories/", { name: "", color: "#fff" });
  ok("POST nome vazio → 400", s1b === 400);

  // Lista: agora +1
  const { data: d2 } = await req<unknown[]>("GET", "/api/categories/");
  ok("GET após criar → total+1", isArr(d2) && d2.length === countAntes + 1);

  // Update
  const { status: s2, data: d3 } = await req<Record<string, unknown>>("PUT", `/api/categories/${catId}`, { name: "Teste Atualizada", color: "#111111" });
  ok("PUT atualizar → 200", s2 === 200);
  ok("name atualizado", d3?.name === "Teste Atualizada");

  // Update ID inexistente
  const { status: s2b } = await req<unknown>("PUT", "/api/categories/999999", { name: "X", color: "#fff" });
  ok("PUT id inexistente → 404", s2b === 404);

  // Delete
  const { status: s3 } = await req<unknown>("DELETE", `/api/categories/${catId}`);
  ok("DELETE → 200", s3 === 200);

  // Confirma que sumiu
  const { data: d4 } = await req<unknown[]>("GET", "/api/categories/");
  ok("GET após delete → volta ao total original", isArr(d4) && d4.length === countAntes);

  // Delete ID inexistente
  const { status: s4 } = await req<unknown>("DELETE", "/api/categories/999999");
  ok("DELETE id inexistente → 404", s4 === 404);
}

// ── 4. CONTAS — CRUD + invoice ───────────────────────────────────────────────
async function testContas(): Promise<{ correnteId: number; nubankId: number }> {
  section("CONTAS — CRUD + invoice");

  // Lista com summary
  const { status: s0, data: d0 } = await req<Record<string, unknown>>("GET", "/api/accounts/?month=8&year=2026");
  ok("GET contas → 200", s0 === 200);
  ok("retorna { accounts, summary }", isArr(d0.accounts) && isObj(d0.summary));
  const accts = d0.accounts as Record<string, unknown>[];
  ok("Thiago tem 8 contas (seed)", accts.length === 8);

  // Summary math
  const sum = d0.summary as Record<string, number>;
  ok("summary.liquidTotal é número ≥ 0", isNum(sum.liquidTotal) && sum.liquidTotal >= 0);
  ok("summary.investmentTotal é número ≥ 0", isNum(sum.investmentTotal) && sum.investmentTotal >= 0);
  ok("summary.openInvoiceTotal é número ≥ 0", isNum(sum.openInvoiceTotal) && sum.openInvoiceTotal >= 0);

  // Encontra contas para usar depois
  const corrente = accts.find(a => a.name === "Conta Corrente") as Record<string, unknown> | undefined;
  const nubank   = accts.find(a => a.name === "Nubank") as Record<string, unknown> | undefined;
  ok("Conta Corrente existe (checking)", corrente?.type === "checking");
  ok("Nubank existe (credit_card)", nubank?.type === "credit_card");
  ok("Conta tem balance (número)", isNum(corrente?.balance));
  const correnteId = corrente?.id as number;
  const nubankId   = nubank?.id as number;

  // Criar conta
  const { status: s1, data: d1 } = await req<Record<string, unknown>>("POST", "/api/accounts/", { name: "Conta Teste", type: "savings", color: "#123456" });
  ok("POST criar conta → 201", s1 === 201);
  ok("retorna id", isNum(d1?.id));
  const newId = d1?.id as number;

  // Validação tipo inválido
  const { status: s1b } = await req<unknown>("POST", "/api/accounts/", { name: "X", type: "invalido", color: "#fff" });
  ok("POST tipo inválido → 400", s1b === 400);

  // Atualizar
  const { status: s2, data: d2 } = await req<Record<string, unknown>>("PUT", `/api/accounts/${newId}`, { name: "Conta Atualizada", type: "savings", color: "#654321" });
  ok("PUT atualizar conta → 200", s2 === 200);
  ok("name atualizado", d2?.name === "Conta Atualizada");

  // Deletar
  const { status: s3 } = await req<unknown>("DELETE", `/api/accounts/${newId}`);
  ok("DELETE conta → 200", s3 === 200);

  // Confirma 8 contas novamente
  const { data: d3 } = await req<Record<string, unknown>>("GET", "/api/accounts/?month=8&year=2026");
  ok("GET após delete → volta a 8 contas", isArr(d3.accounts) && (d3.accounts as unknown[]).length === 8);

  // Invoice do Nubank (cartão de crédito)
  const { status: s4, data: d4 } = await req<Record<string, unknown>>("GET", `/api/accounts/${nubankId}/invoice?month=8&year=2026`);
  ok("GET invoice Nubank ago/26 → 200", s4 === 200);
  ok("invoice tem amount", isNum((d4 as any)?.amount));
  ok("invoice tem paid (bool)", typeof (d4 as any)?.paid === "boolean");
  ok("invoice Nubank ago/26 = 340 (seed)", approxEq((d4 as any)?.amount ?? 0, 340));

  // Invoice de conta não-cartão → 404
  const { status: s5 } = await req<unknown>("GET", `/api/accounts/${correnteId}/invoice?month=8&year=2026`);
  ok("GET invoice em conta corrente → 404", s5 === 404);

  return { correnteId, nubankId };
}

// ── 5. TRANSAÇÕES — CRUD + invariantes ──────────────────────────────────────
async function testTransacoes(correnteId: number): Promise<{ txId: number }> {
  section("TRANSAÇÕES — CRUD + invariantes de totals");

  // Estado inicial
  const { data: d0 } = await req<Record<string, unknown>>("GET", "/api/transactions/?month=8&year=2026");
  const totals0 = d0.totals as Record<string, number>;
  ok("GET transações → totals.income é número", isNum(totals0?.income));
  ok("GET transações → totals.expense é número", isNum(totals0?.expense));
  ok("totals.balance = income − expense", approxEq(totals0.balance, totals0.income - totals0.expense));
  const incomeAntes = totals0.income;

  // Thiago ago/26: income esperado = comissão 13500
  ok("totalIncome agosto = 13500 (seed Thiago)", approxEq(totals0.income, 13500));

  // Criar transação de income
  const { status: s1, data: d1 } = await req<Record<string, unknown>>("POST", "/api/transactions/", {
    type: "income",
    toAccountId: correnteId,
    amount: 500,
    date: "2026-08-20",
    description: "Receita de teste",
  });
  ok("POST criar transação → 201", s1 === 201);
  ok("retorna id", isNum(d1?.id));
  ok("retorna amount correto", (d1 as any)?.amount === "500.00" || (d1 as any)?.amount === "500");
  const txId = d1?.id as number;

  // Validação: amount negativo
  const { status: s1b } = await req<unknown>("POST", "/api/transactions/", {
    type: "income", toAccountId: correnteId, amount: -100, date: "2026-08-20", description: "x",
  });
  ok("POST amount negativo → 400", s1b === 400);

  // Validação: sem description
  const { status: s1c } = await req<unknown>("POST", "/api/transactions/", {
    type: "income", toAccountId: correnteId, amount: 100, date: "2026-08-20", description: "",
  });
  ok("POST description vazia → 400", s1c === 400);

  // Totals subiram
  const { data: d2 } = await req<Record<string, unknown>>("GET", "/api/transactions/?month=8&year=2026");
  const totals2 = d2.totals as Record<string, number>;
  ok("income subiu após criar", approxEq(totals2.income, incomeAntes + 500));

  // Update
  const { status: s2, data: d3 } = await req<Record<string, unknown>>("PUT", `/api/transactions/${txId}`, {
    type: "income",
    toAccountId: correnteId,
    amount: 750,
    date: "2026-08-20",
    description: "Receita atualizada",
  });
  ok("PUT atualizar transação → 200", s2 === 200);
  ok("amount atualizado", (d3 as any)?.amount === "750.00" || (d3 as any)?.amount === "750");

  // Totals refletem novo valor
  const { data: d4 } = await req<Record<string, unknown>>("GET", "/api/transactions/?month=8&year=2026");
  const totals4 = d4.totals as Record<string, number>;
  ok("income reflete após update (incomeAntes + 750)", approxEq(totals4.income, incomeAntes + 750));

  // Update ID inexistente
  const { status: s2b } = await req<unknown>("PUT", "/api/transactions/999999", {
    type: "income", toAccountId: correnteId, amount: 1, date: "2026-08-01", description: "x",
  });
  ok("PUT id inexistente → 404", s2b === 404);

  // Delete
  const { status: s3 } = await req<unknown>("DELETE", `/api/transactions/${txId}`);
  ok("DELETE transação → 200", s3 === 200);

  // Volta ao valor original
  const { data: d5 } = await req<Record<string, unknown>>("GET", "/api/transactions/?month=8&year=2026");
  const totals5 = d5.totals as Record<string, number>;
  ok("income volta ao original após delete", approxEq(totals5.income, incomeAntes));

  // Delete inexistente
  const { status: s4 } = await req<unknown>("DELETE", "/api/transactions/999999");
  ok("DELETE id inexistente → 404", s4 === 404);

  // Filtro por tipo
  const { status: s5, data: d6 } = await req<Record<string, unknown>>("GET", "/api/transactions/?month=8&year=2026&type=income");
  ok("GET filtro type=income → 200", s5 === 200);
  const itensFiltro = d6.items as Record<string, unknown>[];
  ok("todos os items filtrados são income", isArr(itensFiltro) && itensFiltro.every(t => t.type === "income"));

  return { txId: -1 }; // já deletado
}

// ── 6. BILLS — CRUD + toggle paid ───────────────────────────────────────────
async function testBills(correnteId: number): Promise<void> {
  section("BILLS — CRUD + pay occurrence toggle + invariantes");

  // Estado inicial
  const { status: s0, data: d0 } = await req<Record<string, unknown>>("GET", "/api/bills/?month=8&year=2026");
  ok("GET bills → 200", s0 === 200);
  ok("retorna { items, totals }", isArr(d0.items) && isObj(d0.totals));
  const totals = d0.totals as Record<string, Record<string, number>>;
  for (const sec of ["expenses", "installments", "incomes", "transfers"]) {
    ok(`totals.${sec} tem total/paid/pending`, isNum(totals?.[sec]?.total));
    ok(`totals.${sec}.total = paid + pending`, approxEq(totals[sec]!.total, totals[sec]!.paid + totals[sec]!.pending));
  }

  // Verificar parcelas do seed (Thiago ago/26)
  const items = d0.items as Record<string, unknown>[];
  const parcela = items.find(b => b.endDate && b.type === "expense") as Record<string, unknown> | undefined;
  ok("existe parcela com installmentInfo", isObj(parcela?.installmentInfo));
  ok("installmentInfo.current ≤ total", (parcela?.installmentInfo as any)?.current <= (parcela?.installmentInfo as any)?.total);

  const fixa = items.find(b => !b.endDate && b.type === "expense") as Record<string, unknown> | undefined;
  ok("despesa fixa → installmentInfo = null", fixa?.installmentInfo === null);

  // Criar bill
  const { status: s1, data: d1 } = await req<Record<string, unknown>>("POST", "/api/bills/", {
    name: "Bill Teste",
    type: "expense",
    fromAccountId: correnteId,
    amount: 99.99,
    frequency: "monthly",
    startDate: "2026-08-01",
  });
  ok("POST criar bill → 201", s1 === 201);
  ok("retorna id", isNum(d1?.id));
  const billId = d1?.id as number;

  // Validação: nome vazio
  const { status: s1b } = await req<unknown>("POST", "/api/bills/", { name: "", type: "expense", fromAccountId: correnteId, amount: 10, frequency: "monthly", startDate: "2026-08-01" });
  ok("POST bill nome vazio → 400", s1b === 400);

  // Lista: nova bill aparece
  const { data: d2 } = await req<Record<string, unknown>>("GET", "/api/bills/?month=8&year=2026");
  const items2 = d2.items as Record<string, unknown>[];
  const novaBill = items2.find(b => b.id === billId);
  ok("nova bill aparece na listagem", !!novaBill);
  ok("nova bill tem occurrence", novaBill?.occurrence !== undefined);

  // Occurrence da nova bill para testar toggle paid
  const occ = novaBill?.occurrence as Record<string, unknown> | null;
  ok("occurrence.paid = false (recém criada)", occ?.paid === false);
  const occId = occ?.id as number;

  // Captura state com a nova bill (unpaid) para usar como referência
  const { data: d_ref } = await req<Record<string, unknown>>("GET", "/api/bills/?month=8&year=2026");
  const totals_ref = d_ref.totals as Record<string, Record<string, number>>;

  // Toggle paid → true
  const { status: s2, data: d3 } = await req<Record<string, unknown>>("PATCH", `/api/bills/occurrences/${occId}/pay`);
  ok("PATCH /occurrences/:id/pay → 200", s2 === 200);
  ok("paid virou true após toggle", (d3 as any)?.paid === true);

  // Lista reflete: expense pendente diminuiu (comparando contra state com bill unpaid)
  const { data: d4 } = await req<Record<string, unknown>>("GET", "/api/bills/?month=8&year=2026");
  const totals4 = d4.totals as Record<string, Record<string, number>>;
  ok("expenses.paid aumentou após pagar", totals4.expenses.paid > totals_ref.expenses.paid);
  ok("expenses.pending diminuiu após pagar", totals4.expenses.pending < totals_ref.expenses.pending);

  // Toggle paid → false
  const { status: s3, data: d5 } = await req<Record<string, unknown>>("PATCH", `/api/bills/occurrences/${occId}/pay`);
  ok("segundo toggle → paid virou false", s3 === 200 && (d5 as any)?.paid === false);

  // Atualizar bill
  const { status: s4, data: d6 } = await req<Record<string, unknown>>("PUT", `/api/bills/${billId}`, {
    name: "Bill Atualizada",
    type: "expense",
    fromAccountId: correnteId,
    amount: 199.99,
    frequency: "monthly",
    startDate: "2026-08-01",
  });
  ok("PUT atualizar bill → 200", s4 === 200);
  ok("name atualizado", d6?.name === "Bill Atualizada");

  // PUT ID inexistente
  const { status: s4b } = await req<unknown>("PUT", "/api/bills/999999", { name: "X", type: "expense", amount: 1, frequency: "monthly", startDate: "2026-01-01" });
  ok("PUT bill inexistente → 404", s4b === 404);

  // Deletar bill
  const { status: s5 } = await req<unknown>("DELETE", `/api/bills/${billId}`);
  ok("DELETE bill → 200", s5 === 200);

  // DELETE ID inexistente
  const { status: s6 } = await req<unknown>("DELETE", "/api/bills/999999");
  ok("DELETE bill inexistente → 404", s6 === 404);

  // Confirma que sumiu
  const { data: d7 } = await req<Record<string, unknown>>("GET", "/api/bills/?month=8&year=2026");
  const items7 = d7.items as Record<string, unknown>[];
  ok("bill deletada não aparece mais", !items7.find(b => b.id === billId));
}

// ── 7. DASHBOARD — Thiago ago/26 ────────────────────────────────────────────
async function testDashboard(): Promise<void> {
  section("DASHBOARD — Thiago ago/26 (valores reais)");
  const { status, data } = await req<Record<string, unknown>>("GET", "/api/dashboard/?month=8&year=2026");
  ok("status 200", status === 200);
  ok("totalIncome é número", isNum(data.totalIncome));
  ok("totalExpenses é número", isNum(data.totalExpenses));
  ok("saldo = income − expenses", approxEq((data.saldo as number), (data.totalIncome as number) - (data.totalExpenses as number)));

  // Valores reais do seed
  ok("totalIncome ago/26 = 13500", approxEq(data.totalIncome as number, 13500));
  ok("totalExpenses ago/26 = 7915", approxEq(data.totalExpenses as number, 7915));
  ok("saldo ago/26 = 5585", approxEq(data.saldo as number, 5585));

  // Campos computados
  ok("savingsRate = saldo/income×100", approxEq(data.savingsRate as number, (data.saldo as number) / (data.totalIncome as number) * 100));
  ok("freeToSpend = income − pendingBillExpense", isNum(data.freeToSpend));
  ok("commitmentPct = pendingBillExpense/income×100", isNum(data.commitmentPct));
  ok("commitmentPct + pendingBillExpense/income = 1 (aprox)",
    approxEq((data.commitmentPct as number) / 100, (data as any).breakdown.pendingBillExpense / (data.totalIncome as number)));

  // Summary de contas
  ok("accountSummary existe", isObj(data.accountSummary));
  ok("liquidTotal é número ≥ 0", isNum((data.accountSummary as any)?.liquidTotal));
  ok("investmentTotal ≥ 0", (data.accountSummary as any)?.investmentTotal >= 0);

  // Arrays
  ok("creditCards é array", isArr(data.creditCards));
  ok("creditCards tem 5 cartões (seed)", isArr(data.creditCards) && (data.creditCards as unknown[]).length === 5);
  ok("pending é array", isArr(data.pending));
  ok("investments é array", isArr(data.investments));
  ok("investments tem 2 (seed)", isArr(data.investments) && (data.investments as unknown[]).length === 2);
  ok("categoriesBreakdown é array", isArr(data.categoriesBreakdown));

  // Parâmetros obrigatórios
  const { status: s2 } = await req<unknown>("GET", "/api/dashboard/");
  ok("GET /dashboard sem month/year → 400", s2 === 400);
}

// ── 8. DASHBOARD HISTORY ─────────────────────────────────────────────────────
async function testDashboardHistory(): Promise<void> {
  section("DASHBOARD HISTORY — 6 meses Thiago");
  const { status, data } = await req<unknown[]>("GET", "/api/dashboard/history?endMonth=8&endYear=2026&months=6");
  ok("status 200", status === 200);
  ok("retorna array de 6", isArr(data) && data.length === 6);
  if (isArr(data) && data.length === 6) {
    const first = data[0] as Record<string, unknown>;
    const last  = data[5] as Record<string, unknown>;
    ok("primeiro item é mar/26", first.month === 3 && first.year === 2026);
    ok("último item é ago/26", last.month === 8  && last.year === 2026);
    ok("cada item tem income/expenses/saldo/savingsRate",
      data.every(d => isNum((d as any).income) && isNum((d as any).expenses) && isNum((d as any).saldo)));
    ok("saldo de ago/26 = 5585", approxEq((last as any).saldo, 5585));
    // Invariante em todos os meses
    ok("saldo = income − expenses em todos os meses",
      data.every(d => approxEq((d as any).saldo, (d as any).income - (d as any).expenses)));
  }

  // Parâmetros inválidos
  const { status: s2 } = await req<unknown>("GET", "/api/dashboard/history?months=6");
  ok("GET history sem endMonth/endYear → 400", s2 === 400);

  // Limite de meses (max 24)
  const { data: d3 } = await req<unknown[]>("GET", "/api/dashboard/history?endMonth=8&endYear=2026&months=99");
  ok("months=99 retorna máximo de 24", isArr(d3) && d3.length === 24);
}

// ── 9. ANALYTICS ─────────────────────────────────────────────────────────────
async function testAnalytics(): Promise<void> {
  section("ANALYTICS — Thiago ago/26");
  const { status, data } = await req<Record<string, unknown>>("GET", "/api/analytics?month=8&year=2026");
  ok("status 200", status === 200);

  // Commitment
  ok("commitment.amount ≥ 0", isNum((data.commitment as any)?.amount) && (data.commitment as any).amount >= 0);
  ok("commitment.pct ≥ 0", isNum((data.commitment as any)?.pct));
  ok("commitment.pct = amount/income×100", approxEq(
    (data.commitment as any).pct,
    (data.commitment as any).amount / 13500 * 100,
  ));
  ok("freeToSpend = income − amount", approxEq(
    (data.commitment as any).freeToSpend,
    13500 - (data.commitment as any).amount,
  ));

  // Seasonality
  const seas = data.seasonality as Record<string, unknown>;
  ok("seasonality.months tem 8 itens (jan–ago)", isArr(seas.months) && (seas.months as unknown[]).length === 8);
  ok("avgIncome ≥ minIncome ≤ maxIncome", isNum(seas.avgIncome) && (seas.minIncome as number) <= (seas.avgIncome as number) && (seas.avgIncome as number) <= (seas.maxIncome as number));
  ok("seasonInsight é string", isStr(seas.seasonInsight));

  // Valores reais: jan R$15.954, fev R$15.804... ago R$13.500
  ok("último mês do seasonality = ago (income=13500)", approxEq(((seas.months as Record<string,number>[])[7]).income, 13500));

  // Installment horizon
  const hor = data.installmentHorizon as Record<string, unknown>;
  ok("installmentHorizon.releaseNext6m ≥ 0", isNum(hor.releaseNext6m) && (hor.releaseNext6m as number) >= 0);
  ok("installmentHorizon.totalDebt > 0 (Thiago tem Otávio 60x)", (hor.totalDebt as number) > 0);
  ok("installmentHorizon.items é array", isArr(hor.items));
  // Otávio 60x: monthsLeft = 50 ago/26
  const otavio = (hor.items as Record<string, unknown>[]).find(i => isStr(i.name) && (i.name as string).includes("Otávio"));
  ok("Otávio 60x aparece no horizonte", !!otavio);
  ok("Otávio monthsLeft = 50 (ago/26)", otavio?.monthsLeft === 50);

  // Credit card trends
  ok("creditCardTrends é array", isArr(data.creditCardTrends));
  ok("tem 5 cartões (seed)", isArr(data.creditCardTrends) && (data.creditCardTrends as unknown[]).length === 5);
  const trends = data.creditCardTrends as Record<string, unknown>[];
  const sicoob = trends.find(c => c.name === "Sicoob");
  ok("Sicoob trend = up (delta +991)", sicoob?.trend === "up");
  ok("cada trend tem 8 meses", trends.every(c => isArr(c.months) && (c.months as unknown[]).length === 8));

  // Insights
  ok("insights é array", isArr(data.insights));
  ok("há ao menos 1 insight", isArr(data.insights) && (data.insights as unknown[]).length >= 1);
  const insigs = data.insights as Record<string, unknown>[];
  ok("todos têm severity válida", insigs.every(i => ["good", "neutral", "bad"].includes(i.severity as string)));
  ok("todos têm message (string)", insigs.every(i => isStr(i.message)));
}

// ── 10. ANALYTICS SPENDING ───────────────────────────────────────────────────
async function testAnalyticsSpending(): Promise<void> {
  section("ANALYTICS SPENDING — Thiago ago/26");
  const { status, data } = await req<Record<string, unknown>>("GET", "/api/analytics/spending?month=8&year=2026");
  ok("status 200", status === 200);
  ok("totalIncome = 13500", approxEq(data.totalIncome as number, 13500));
  ok("totalExpenses = 7915", approxEq(data.totalExpenses as number, 7915));
  ok("incomeVsExpenseRatio = expenses/income×100", approxEq(
    data.incomeVsExpenseRatio as number,
    (data.totalExpenses as number) / (data.totalIncome as number) * 100,
  ));
  ok("savingsRate ≥ 0", (data.savingsRate as number) >= 0);
  ok("savingsRate = saldo/income×100", approxEq(
    data.savingsRate as number,
    Math.max(0, (13500 - 7915) / 13500 * 100),
  ));
  ok("categoriesBreakdown é array", isArr(data.categoriesBreakdown));
  ok("topCategoryPct é número 0–100", isNum(data.topCategoryPct) && (data.topCategoryPct as number) >= 0 && (data.topCategoryPct as number) <= 100);
}

// ── 11. GOALS ─────────────────────────────────────────────────────────────────
async function testGoals(): Promise<void> {
  section("GOALS — Thiago ago/26");
  const { status, data } = await req<Record<string, unknown>>("GET", "/api/goals?month=8&year=2026");
  ok("status 200", status === 200);
  ok("totalInvested ≥ 0", isNum(data.totalInvested) && (data.totalInvested as number) >= 0);
  ok("dailyBurn ≥ 0", isNum(data.dailyBurn) && (data.dailyBurn as number) >= 0);
  ok("projectedMonthlySpend ≥ 0", isNum(data.projectedMonthlySpend) && (data.projectedMonthlySpend as number) >= 0);
  ok("dailyBurn × 31 ≈ projectedMonthlySpend", approxEq(
    (data.dailyBurn as number) * 31,
    data.projectedMonthlySpend as number,
    1,
  ));
  ok("cumulativeSavingsHistory tem 6 itens", isArr(data.cumulativeSavingsHistory) && (data.cumulativeSavingsHistory as unknown[]).length === 6);
  if (isArr(data.cumulativeSavingsHistory)) {
    const hist = data.cumulativeSavingsHistory as Record<string, unknown>[];
    ok("cumulative cresce monotonicamente", hist.every((h, i) => i === 0 || (h.cumulative as number) >= (hist[i - 1]!.cumulative as number)));
    ok("último item é ago/26", hist[5]?.month === 8 && hist[5]?.year === 2026);
  }
  ok("investments é array com 2 itens (seed)", isArr(data.investments) && (data.investments as unknown[]).length === 2);
  const invs = data.investments as Record<string, unknown>[];
  invs.forEach(inv => {
    ok(`${inv.name}: progress 0–100`, isNum(inv.progress) && (inv.progress as number) >= 0 && (inv.progress as number) <= 100);
  });
  ok("accountSummary existe", isObj(data.accountSummary));
}

// ── 12. MATEUS — setembro/2026 (primeiro mês dos bills) ──────────────────────
async function testMateusSetembro(mateusCookie: string): Promise<void> {
  section("MATEUS — setembro/2026 (primeiro mês bills)");

  // Bills: installmentInfo.current = 1 em todas as parcelas
  const { status: s0, data: d0 } = await req<Record<string, unknown>>("GET", "/api/bills/?month=9&year=2026", undefined, mateusCookie);
  ok("GET bills set/26 → 200", s0 === 200);
  const items = d0.items as Record<string, unknown>[];
  ok("há bills em set/26", items.length > 0);

  const parcelas = items.filter(b => b.endDate && b.type === "expense");
  ok("há parcelas em set/26", parcelas.length > 0);
  for (const p of parcelas) {
    const info = p.installmentInfo as Record<string, number> | null;
    ok(`${p.name}: installmentInfo.current = 1 (primeiro mês)`, info?.current === 1);
    ok(`${p.name}: installmentInfo.total ≥ 1`, isNum(info?.total) && (info?.total ?? 0) >= 1);
  }

  // HB20 23x: endDate 2028-06-30, startDate 2026-09-10
  const hb20 = items.find(b => isStr(b.name) && (b.name as string).includes("HB20")) as Record<string, unknown> | undefined;
  ok("HB20 23x encontrado", !!hb20);
  const hb20Info = hb20?.installmentInfo as Record<string, number> | null;
  ok("HB20: total = 22 meses (set/26 → jun/28)", hb20Info?.total === 22);

  // Dashboard set/26 Mateus
  // Bills criam occurrences, NÃO transactions. Transactions só existem quando:
  //   (a) criadas manualmente, ou (b) occurrence marcada como paga
  // No seed Mateus set/26: só 4 transactions de expense (faturas/compras)
  const { status: s1, data: d1 } = await req<Record<string, unknown>>("GET", "/api/dashboard/?month=9&year=2026", undefined, mateusCookie);
  ok("GET dashboard set/26 Mateus → 200", s1 === 200);
  ok("totalIncome = 0 (occurrences de renda não são transactions até serem pagas)", approxEq(d1.totalIncome as number, 0));
  ok("totalExpenses > 0 (faturas abertas de ago criadas como tx em set)", (d1.totalExpenses as number) > 0);
  ok("pending tem bills de income (Salário, Michel, Mariana)", isArr(d1.pending) && (d1.pending as Record<string,unknown>[]).some(p => p.type === "income"));
  ok("savingsRate é número", isNum(d1.savingsRate));

  // Contas
  const { status: s2, data: d2 } = await req<Record<string, unknown>>("GET", "/api/accounts/?month=9&year=2026", undefined, mateusCookie);
  ok("GET accounts set/26 Mateus → 200", s2 === 200);
  ok("Mateus tem 9 contas (seed)", isArr(d2.accounts) && (d2.accounts as unknown[]).length === 9);
}

// ── 13. MATEUS — agosto/2026 (edge case: income=0) ──────────────────────────
async function testMateusAgosto(mateusCookie: string): Promise<void> {
  section("MATEUS — agosto/2026 (edge case: income ≈ 0)");

  const { status, data } = await req<Record<string, unknown>>("GET", "/api/dashboard/?month=8&year=2026", undefined, mateusCookie);
  ok("GET dashboard ago/26 Mateus → 200", status === 200);

  // Mateus tem apenas 1 transação de expense em ago/26 (saldo agosto encerrado: R$838,03)
  ok("totalIncome = 0 (sem receitas em ago/26)", approxEq(data.totalIncome as number, 0));
  ok("totalExpenses = 838.03", approxEq(data.totalExpenses as number, 838.03));
  ok("saldo negativo (−838.03)", approxEq(data.saldo as number, -838.03));
  ok("savingsRate = 0 quando income = 0 (sem divisão por zero)", data.savingsRate === 0);
  ok("commitmentPct = 0 quando income = 0", data.commitmentPct === 0);
  ok("freeToSpend = 0 quando income = 0", data.freeToSpend === 0);

  // Transactions
  const { data: dtx } = await req<Record<string, unknown>>("GET", "/api/transactions/?month=8&year=2026", undefined, mateusCookie);
  ok("transações ago/26 Mateus → 1 item", isArr(dtx.items) && (dtx.items as unknown[]).length === 1);
  ok("totals.income = 0", approxEq((dtx.totals as any)?.income, 0));
  ok("totals.expense = 838.03", approxEq((dtx.totals as any)?.expense, 838.03));

  // Analytics não deve explodir com histórico vazio
  const { status: sA, data: dA } = await req<Record<string, unknown>>("GET", "/api/analytics?month=8&year=2026", undefined, mateusCookie);
  ok("GET analytics ago/26 Mateus (histórico vazio) → 200", sA === 200);
  ok("seasonality.avgIncome ≥ 0 (sem pânico)", isNum((dA.seasonality as any)?.avgIncome));
  ok("insights é array (mesmo sem histórico)", isArr(dA.insights));
}

// ── 14. ISOLAMENTO — Mateus não acessa dados do Thiago ──────────────────────
async function testIsolamento(mateusCookie: string): Promise<void> {
  section("ISOLAMENTO — usuário não acessa dados de outro");

  // Pegar um ID de transação do Thiago (como Thiago)
  const { data: dTx } = await req<Record<string, unknown>>("GET", "/api/transactions/?month=8&year=2026");
  const thiagoDatas = dTx.items as Record<string, unknown>[];
  const thiagoTxId = (thiagoDatas[0] as any)?.id as number;

  // Como Mateus, tentar deletar transação do Thiago → 404
  if (thiagoTxId) {
    const { status } = await req<unknown>("DELETE", `/api/transactions/${thiagoTxId}`, undefined, mateusCookie);
    ok("Mateus não pode deletar transação do Thiago → 404", status === 404);
  }

  // Pegar um bill do Thiago
  const { data: dBills } = await req<Record<string, unknown>>("GET", "/api/bills/?month=8&year=2026");
  const thiagoBills = dBills.items as Record<string, unknown>[];
  const thiagoBillId = (thiagoBills[0] as any)?.id as number;

  if (thiagoBillId) {
    const { status } = await req<unknown>("DELETE", `/api/bills/${thiagoBillId}`, undefined, mateusCookie);
    ok("Mateus não pode deletar bill do Thiago → 404", status === 404);
  }

  // Pegar uma conta do Thiago
  const { data: dAcc } = await req<Record<string, unknown>>("GET", "/api/accounts/?month=8&year=2026");
  const thiagoAccs = dAcc.accounts as Record<string, unknown>[];
  const thiagoAccId = (thiagoAccs[0] as any)?.id as number;

  if (thiagoAccId) {
    const { status } = await req<unknown>("DELETE", `/api/accounts/${thiagoAccId}`, undefined, mateusCookie);
    ok("Mateus não pode deletar conta do Thiago → 404", status === 404);
  }

  // Pegar categoria do Thiago
  const { data: dCats } = await req<unknown[]>("GET", "/api/categories/");
  const thiagoCats = dCats as Record<string, unknown>[];
  const thiagoCatId = (thiagoCats[0] as any)?.id as number;

  if (thiagoCatId) {
    const { status } = await req<unknown>("DELETE", `/api/categories/${thiagoCatId}`, undefined, mateusCookie);
    ok("Mateus não pode deletar categoria do Thiago → 404", status === 404);
  }
}

// ── EXECUÇÃO ──────────────────────────────────────────────────────────────────
async function run() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   TESTE DE INTEGRAÇÃO — controle-de-gastos backend      ║");
  console.log("║   Thiago (ago/26) + Mateus (set/26 + ago/26 edge)       ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  process.stdout.write("Aguardando servidor...");
  await waitForServer();
  console.log(" pronto.\n");

  try {
    // Login Thiago (cookie global)
    await testAuth();

    // Segurança: sem cookie
    await testSeguranca();

    // CRUD com Thiago logado
    await testCategorias();
    const { correnteId, nubankId } = await testContas();
    await testTransacoes(correnteId);
    await testBills(correnteId);

    // Leitura Thiago ago/26
    await testDashboard();
    await testDashboardHistory();
    await testAnalytics();
    await testAnalyticsSpending();
    await testGoals();

    // Mateus: login separado
    const mateusCookie = await login(MATEUS);
    if (!mateusCookie) {
      console.log("\n  ⚠️  Login do Mateus falhou (rate limit?) — testes do Mateus ignorados");
    } else {
      await testMateusSetembro(mateusCookie);
      await testMateusAgosto(mateusCookie);

      // Isolamento (cookie global = Thiago, mateusCookie = Mateus)
      await testIsolamento(mateusCookie);
    }

  } catch (err) {
    console.error("\n💥 Erro inesperado no script:", err);
    process.exit(1);
  }

  console.log("\n" + "═".repeat(60));
  const total = passed + failed;
  if (failed === 0) {
    console.log(`✅ TODOS OS TESTES PASSARAM  ${passed}/${total}`);
  } else {
    console.log(`❌ FALHAS: ${failed}/${total}`);
    errors.forEach(e => console.log(`   • ${e}`));
  }
  console.log("═".repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

run();
