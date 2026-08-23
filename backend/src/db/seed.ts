import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { users, accounts, categories, bills, transactions, billOccurrences, creditCardInvoices } from "./schema";

async function seed() {
  const hash = (pwd: string) => bcrypt.hash(pwd, 10);

  // ---- Remover conta antiga de exemplo se existir ----
  const old = await db.select().from(users).where(eq(users.email, "mateus@controle.local")).then(r => r[0]);
  if (old) {
    await db.delete(billOccurrences).where(eq(billOccurrences.userId, old.id));
    await db.delete(transactions).where(eq(transactions.userId, old.id));
    await db.delete(creditCardInvoices).where(eq(creditCardInvoices.userId, old.id));
    await db.delete(bills).where(eq(bills.userId, old.id));
    await db.delete(accounts).where(eq(accounts.userId, old.id));
    await db.delete(categories).where(eq(categories.userId, old.id));
    await db.delete(users).where(eq(users.id, old.id));
  }

  // ---- Upsert Mateus ----
  const pwdHash = await hash("c7t?Waw4D6");
  let mateus = await db.select().from(users).where(eq(users.email, "mateusalbano22@gmail.com")).then(r => r[0]);
  if (!mateus) {
    [mateus] = await db.insert(users).values({ name: "Mateus", email: "mateusalbano22@gmail.com", passwordHash: pwdHash }).returning();
  } else {
    [mateus] = await db.update(users).set({ passwordHash: pwdHash }).where(eq(users.id, mateus.id)).returning();
  }

  const uid = mateus.id;

  // ---- Limpar dados existentes ----
  await db.delete(billOccurrences).where(eq(billOccurrences.userId, uid));
  await db.delete(transactions).where(eq(transactions.userId, uid));
  await db.delete(creditCardInvoices).where(eq(creditCardInvoices.userId, uid));
  await db.delete(bills).where(eq(bills.userId, uid));
  await db.delete(accounts).where(eq(accounts.userId, uid));
  await db.delete(categories).where(eq(categories.userId, uid));

  // ---- Accounts ----
  const [bbCorrente, bbCredito, brad2397, brad2415, bradCorrente, havanCard, carteira, interMariana, aptFerias] = await db.insert(accounts).values([
    { userId: uid, name: "BB Corrente",        type: "checking",    color: "#facc15", isReal: true },
    { userId: uid, name: "BB Crédito 1000",    type: "credit_card", color: "#60a5fa" },
    { userId: uid, name: "Bradesco 2397",       type: "credit_card", color: "#fb923c" },
    { userId: uid, name: "Bradesco 2415",       type: "credit_card", color: "#f43f5e" },
    { userId: uid, name: "Bradesco Corrente",   type: "checking",    color: "#10b981", isReal: true },
    { userId: uid, name: "Havan",               type: "credit_card", color: "#ef4444" },
    { userId: uid, name: "Carteira",            type: "cash",        color: "#a3e635", isReal: true },
    { userId: uid, name: "Inter (Mariana)",     type: "checking",    color: "#f97316", isReal: true },
    { userId: uid, name: "Apartamento Férias",  type: "investment",  color: "#34d399", currentAmount: "0", showProgress: false },
  ]).returning();

  // ---- Categories ----
  const [cDate, cLanches, cUber, cOnibus, cCasa, cMariana, cSaude, cAssinaturas, cRoupas] = await db.insert(categories).values([
    { userId: uid, name: "Date",        color: "#ec4899" },
    { userId: uid, name: "Lanches",     color: "#f97316" },
    { userId: uid, name: "Uber",        color: "#6b7280" },
    { userId: uid, name: "Ônibus",      color: "#60a5fa" },
    { userId: uid, name: "Casa",        color: "#fbbf24" },
    { userId: uid, name: "Mariana",     color: "#c084fc" },
    { userId: uid, name: "Saúde",       color: "#34d399" },
    { userId: uid, name: "Assinaturas", color: "#a78bfa" },
    { userId: uid, name: "Roupas",      color: "#f43f5e" },
  ]).returning();

  const start = "2026-09-01";

  // ---- Bills ----
  await db.insert(bills).values([
    // Receitas
    { userId: uid, name: "Salário",          type: "income",   amount: "5100",    frequency: "monthly", startDate: start, toAccountId: bbCorrente.id },
    { userId: uid, name: "Michel (9x)",      type: "income",   amount: "160",     frequency: "monthly", startDate: start, endDate: "2027-04-30", toAccountId: bbCorrente.id },
    { userId: uid, name: "Mariana fixo",     type: "income",   amount: "1000",    frequency: "monthly", startDate: start, toAccountId: interMariana.id },
    // Parcelas
    { userId: uid, name: "HB20 (23x)",           type: "expense", amount: "1453.42", frequency: "monthly", startDate: "2026-09-10", endDate: "2028-06-30", fromAccountId: bbCorrente.id },
    { userId: uid, name: "Havan (9x)",            type: "expense", amount: "228.85",  frequency: "monthly", startDate: "2026-09-10", endDate: "2027-04-30", fromAccountId: havanCard.id },
    { userId: uid, name: "Apartamento (4x)",      type: "expense", amount: "300",     frequency: "monthly", startDate: start, endDate: "2026-11-30", fromAccountId: bbCorrente.id, categoryId: cCasa.id },
    { userId: uid, name: "Dentista Mariana (19x)",type: "expense", amount: "256",     frequency: "monthly", startDate: start, endDate: "2028-02-29", fromAccountId: bbCorrente.id, categoryId: cSaude.id },
    // Fixas mensais
    { userId: uid, name: "Internet Mateus",   type: "expense", amount: "30.25", frequency: "monthly", startDate: start, fromAccountId: bbCorrente.id, categoryId: cCasa.id },
    { userId: uid, name: "Internet Mariana",  type: "expense", amount: "42",   frequency: "monthly", startDate: start, fromAccountId: bbCorrente.id, categoryId: cCasa.id },
    { userId: uid, name: "Totalpass Mariana", type: "expense", amount: "109",  frequency: "monthly", startDate: start, fromAccountId: bbCorrente.id, categoryId: cSaude.id },
    { userId: uid, name: "Dentista Mateus",   type: "expense", amount: "200",  frequency: "monthly", startDate: start, fromAccountId: bbCorrente.id, categoryId: cSaude.id },
    { userId: uid, name: "Ônibus Mariana",    type: "expense", amount: "140",  frequency: "monthly", startDate: start, fromAccountId: bbCorrente.id, categoryId: cOnibus.id },
    { userId: uid, name: "Ônibus Mateus",     type: "expense", amount: "50",   frequency: "monthly", startDate: start, fromAccountId: bbCorrente.id, categoryId: cOnibus.id },
    { userId: uid, name: "Anuidade 2397",     type: "expense", amount: "50",   frequency: "monthly", startDate: start, fromAccountId: bbCorrente.id, categoryId: cAssinaturas.id },
    // Parcelas Bradesco 2397 (a partir de setembro = 3ª parcela de cada)
    { userId: uid, name: "Americanas SA (3/5)",                    type: "expense", amount: "5.37",   frequency: "monthly", startDate: start, endDate: "2026-11-30", fromAccountId: brad2397.id },
    { userId: uid, name: "Marisa (3/3)",                           type: "expense", amount: "53.32",  frequency: "monthly", startDate: start, endDate: "2026-09-30", fromAccountId: brad2397.id, categoryId: cRoupas.id },
    { userId: uid, name: "MP*Manicure (tela iPhone Mariana) (3/7)",type: "expense", amount: "108.38", frequency: "monthly", startDate: start, endDate: "2027-01-31", fromAccountId: brad2397.id, categoryId: cSaude.id },
    // Parcelas BB Crédito 1000 (a partir de setembro = 4ª parcela de cada)
    { userId: uid, name: "Costao lua de mel (4/10)",  type: "expense", amount: "278.75", frequency: "monthly", startDate: start, endDate: "2027-03-31", fromAccountId: bbCredito.id, categoryId: cDate.id },
    { userId: uid, name: "Milium Loja 04 (4/5)",      type: "expense", amount: "21.30",  frequency: "monthly", startDate: start, endDate: "2026-10-31", fromAccountId: bbCredito.id },
    { userId: uid, name: "Milium Loja 05 (4/10)",     type: "expense", amount: "24.55",  frequency: "monthly", startDate: start, endDate: "2027-03-31", fromAccountId: bbCredito.id },
    { userId: uid, name: "Sorria Odontologia (4/15)", type: "expense", amount: "133.33", frequency: "monthly", startDate: start, endDate: "2027-08-31", fromAccountId: bbCredito.id, categoryId: cSaude.id },
    { userId: uid, name: "Cosmeticos Carioca (4/4)",  type: "expense", amount: "51.97",  frequency: "monthly", startDate: start, endDate: "2026-09-30", fromAccountId: bbCredito.id },
    { userId: uid, name: "Havan Joinville (5/5)",     type: "expense", amount: "20.00",  frequency: "monthly", startDate: start, endDate: "2026-09-30", fromAccountId: bbCredito.id },
  ]);

  // ---- Transações de abertura ----
  await db.insert(transactions).values([
    // Agosto encerrado: saldo real do BB Corrente
    { userId: uid, type: "expense", amount: "838.03",  date: "2026-08-31", month: 8, year: 2026, description: "Saldo agosto (encerrado)",       fromAccountId: bbCorrente.id, toAccountId: null, categoryId: null },
    // Setembro: fatura atrasada de agosto e compras à vista no BB Crédito
    { userId: uid, type: "expense", amount: "1185.54", date: "2026-09-01", month: 9, year: 2026, description: "Fatura agosto (atrasada)",              fromAccountId: bbCredito.id, toAccountId: null, categoryId: null },
    { userId: uid, type: "expense", amount: "119.00",  date: "2026-09-01", month: 9, year: 2026, description: "Compras à vista setembro (BB)",         fromAccountId: bbCredito.id, toAccountId: null, categoryId: null },
    // Setembro: compras à vista Bradesco 2397
    { userId: uid, type: "expense", amount: "6.32",    date: "2026-09-01", month: 9, year: 2026, description: "Compras à vista setembro (Brad 2397)",  fromAccountId: brad2397.id,  toAccountId: null, categoryId: null },
    // Setembro: compras à vista Bradesco 2415
    { userId: uid, type: "expense", amount: "26.00",   date: "2026-09-01", month: 9, year: 2026, description: "Compras à vista setembro (Brad 2415)",  fromAccountId: brad2415.id,  toAccountId: null, categoryId: null },
  ]);

  console.log("✅ Seed Mateus completo:");
  console.log("   → 9 contas | 9 categorias | 20 recorrentes | 3 transações (ago encerrado + set BB)");
  console.log("   → Login: mateusalbano22@gmail.com / c7t?Waw4D6");

  await seedThiago(hash);

  process.exit(0);
}

async function seedThiago(hash: (pwd: string) => Promise<string>) {
  const pwdHash = await hash("senha123");
  const D = (y: number, m: number, day: number) =>
    `${y}-${String(m).padStart(2, "0")}-${String(Math.min(day, new Date(y, m, 0).getDate())).padStart(2, "0")}`;

  // ---- Upsert Thiago ----
  let thiago = await db.select().from(users).where(eq(users.email, "thiago@controle.local")).then(r => r[0]);
  if (!thiago) {
    [thiago] = await db.insert(users).values({ name: "Thiago", email: "thiago@controle.local", passwordHash: pwdHash }).returning();
  } else {
    [thiago] = await db.update(users).set({ passwordHash: pwdHash }).where(eq(users.id, thiago.id)).returning();
  }

  const tid = thiago.id;

  // ---- Limpar dados existentes de Thiago ----
  await db.delete(billOccurrences).where(eq(billOccurrences.userId, tid));
  await db.delete(transactions).where(eq(transactions.userId, tid));
  await db.delete(creditCardInvoices).where(eq(creditCardInvoices.userId, tid));
  await db.delete(bills).where(eq(bills.userId, tid));
  await db.delete(accounts).where(eq(accounts.userId, tid));
  await db.delete(categories).where(eq(categories.userId, tid));

  // ---- Accounts ----
  const [tcorrente, tnubank, tcaixa, tsicoob, thavan, tnubankPj, treserva, trendimento] = await db.insert(accounts).values([
    { userId: tid, name: "Conta Corrente",      type: "checking",    color: "#60a5fa" },
    { userId: tid, name: "Nubank",              type: "credit_card", color: "#a855f7" },
    { userId: tid, name: "Caixa",               type: "credit_card", color: "#4ade80" },
    { userId: tid, name: "Sicoob",              type: "credit_card", color: "#fb923c" },
    { userId: tid, name: "Havan",               type: "credit_card", color: "#f43f5e" },
    { userId: tid, name: "Nubank PJ",           type: "credit_card", color: "#c084fc" },
    { userId: tid, name: "Reserva Emergencial", type: "investment",  color: "#34d399", targetAmount: "30000", currentAmount: "0", showProgress: true },
    { userId: tid, name: "Rendimento Nubank",   type: "investment",  color: "#facc15", targetAmount: "50000", currentAmount: "0", showProgress: true },
  ]).returning();

  // ---- Categories ----
  const [cMor, cTrans, cAlim, cSaud, cComun, cLaz, cParc, cServ, cFam, cImp] = await db.insert(categories).values([
    { userId: tid, name: "Moradia",     color: "#fbbf24" },
    { userId: tid, name: "Transporte",  color: "#60a5fa" },
    { userId: tid, name: "Alimentação", color: "#f97316" },
    { userId: tid, name: "Saúde",       color: "#34d399" },
    { userId: tid, name: "Comunicação", color: "#22d3ee" },
    { userId: tid, name: "Lazer",       color: "#a78bfa" },
    { userId: tid, name: "Parcelas",    color: "#6366f1" },
    { userId: tid, name: "Serviços",    color: "#f43f5e" },
    { userId: tid, name: "Família",     color: "#ec4899" },
    { userId: tid, name: "Impostos",    color: "#fb923c" },
  ]).returning();

  // ---- Bills ----
  const [
    bSalario, bLucas,
    bApartamento, bCondominio, bTim, bSeguro, bLixo, bIngles, bCurso,
    bGol, bCelularDaniel, bVh7, bVh8, bMaeNicolas, bCartao, bOtavio,
  ] = await db.insert(bills).values([
    // Receitas fixas
    { userId: tid, name: "Salário Fixo",         type: "income",  amount: "1600",   frequency: "monthly", startDate: "2024-01-01", toAccountId: tcorrente.id },
    { userId: tid, name: "Lucas Apartamento",    type: "income",  amount: "1800",   frequency: "monthly", startDate: "2024-01-01", toAccountId: tcorrente.id },
    // Despesas fixas
    { userId: tid, name: "Apartamento",          type: "expense", amount: "1117",   frequency: "monthly", startDate: "2024-01-01", fromAccountId: tcorrente.id, categoryId: cMor.id },
    { userId: tid, name: "Condomínio",           type: "expense", amount: "300",    frequency: "monthly", startDate: "2024-01-01", fromAccountId: tcorrente.id, categoryId: cMor.id },
    { userId: tid, name: "TIM",                  type: "expense", amount: "76",     frequency: "monthly", startDate: "2024-01-01", fromAccountId: tcorrente.id, categoryId: cComun.id },
    { userId: tid, name: "Seguro",               type: "expense", amount: "138.50", frequency: "monthly", startDate: "2024-01-01", fromAccountId: tcorrente.id, categoryId: cTrans.id },
    { userId: tid, name: "Lixo / IPTU",          type: "expense", amount: "31",     frequency: "monthly", startDate: "2026-03-01", fromAccountId: tcorrente.id, categoryId: cMor.id },
    { userId: tid, name: "Inglês",               type: "expense", amount: "250",    frequency: "monthly", startDate: "2026-08-01", fromAccountId: tcorrente.id, categoryId: cServ.id },
    { userId: tid, name: "Curso",                type: "expense", amount: "250",    frequency: "monthly", startDate: "2026-08-01", fromAccountId: tcorrente.id, categoryId: cServ.id },
    // Parcelas
    { userId: tid, name: "GOL (20x)",            type: "expense", amount: "790",    frequency: "monthly", startDate: "2025-07-01", endDate: "2027-02-28",  fromAccountId: tcorrente.id, categoryId: cTrans.id },
    { userId: tid, name: "Celular Daniel (12x)", type: "expense", amount: "240",    frequency: "monthly", startDate: "2026-01-01", endDate: "2026-12-31",  fromAccountId: tcorrente.id, categoryId: cFam.id },
    { userId: tid, name: "VH (7x)",              type: "expense", amount: "428",    frequency: "monthly", startDate: "2026-02-01", endDate: "2026-08-31",  fromAccountId: tcorrente.id, categoryId: cParc.id },
    { userId: tid, name: "VH (8x)",              type: "expense", amount: "1100",   frequency: "monthly", startDate: "2026-04-01", endDate: "2026-11-30",  fromAccountId: tcorrente.id, categoryId: cParc.id },
    { userId: tid, name: "Mãe Nicolas (10x)",    type: "expense", amount: "210",    frequency: "monthly", startDate: "2026-03-01", endDate: "2026-12-31",  fromAccountId: tcorrente.id, categoryId: cFam.id },
    { userId: tid, name: "Cartão (10x)",         type: "expense", amount: "338",    frequency: "monthly", startDate: "2026-03-01", endDate: "2026-12-31",  fromAccountId: tcorrente.id, categoryId: cParc.id },
    { userId: tid, name: "Otávio (60x)",         type: "expense", amount: "2900",   frequency: "monthly", startDate: "2025-10-01", endDate: "2030-09-30",  fromAccountId: tcorrente.id, categoryId: cFam.id },
  ]).returning();

  // ---- Bill occurrences (Jan-Ago 2026) ----
  type Occ = typeof billOccurrences.$inferInsert;
  const occs: Occ[] = [];
  const addOcc = (billId: number, m: number, amount: string, paid: boolean) =>
    occs.push({
      userId: tid, billId, month: m, year: 2026,
      dueDate: D(2026, m, 10),
      amount, paid,
      paidAt: paid ? new Date(2026, m - 1, 12) : null,
    });

  // Salário Fixo (todos pagos)
  for (let m = 1; m <= 8; m++) addOcc(bSalario.id, m, "1600", true);

  // Lucas Apartamento (todos pagos)
  for (let m = 1; m <= 8; m++) addOcc(bLucas.id, m, "1800", true);

  // Apartamento (Jan-Jun pago, Jul-Ago aberto)
  for (let m = 1; m <= 6; m++) addOcc(bApartamento.id, m, "1117", true);
  addOcc(bApartamento.id, 7, "1117", false);
  addOcc(bApartamento.id, 8, "1117", false);

  // Condomínio (valor real por mês, Jul pago, Ago aberto)
  const condData: [number, string, boolean][] = [
    [1,"340",true],[2,"220",true],[3,"220",true],[4,"220",true],
    [5,"300",true],[6,"340",true],[7,"316.26",true],[8,"220",false],
  ];
  condData.forEach(([m, a, p]) => addOcc(bCondominio.id, m, a, p));

  // TIM (Jan-Jun pago, Jul-Ago aberto)
  for (let m = 1; m <= 6; m++) addOcc(bTim.id, m, "76", true);
  addOcc(bTim.id, 7, "76", false);
  addOcc(bTim.id, 8, "76", false);

  // Seguro (Jan-Jul pago, Ago aberto)
  for (let m = 1; m <= 7; m++) addOcc(bSeguro.id, m, "138.50", true);
  addOcc(bSeguro.id, 8, "138.50", false);

  // Lixo / IPTU (começa Mar; Jul pago com valor real, Ago aberto)
  for (let m = 3; m <= 7; m++) addOcc(bLixo.id, m, m === 7 ? "32.96" : "31", true);
  addOcc(bLixo.id, 8, "31", false);

  // Inglês e Curso (só Ago, abertos)
  addOcc(bIngles.id, 8, "250", false);
  addOcc(bCurso.id, 8, "250", false);

  // GOL 20x (Jan com valor real 2500, demais 790)
  const golData: [number, string, boolean][] = [
    [1,"2500",true],[2,"790",true],[3,"790",false],[4,"790",true],
    [5,"790",false],[6,"790",true],[7,"790",true],[8,"790",false],
  ];
  golData.forEach(([m, a, p]) => addOcc(bGol.id, m, a, p));

  // Celular Daniel (Jan 490 = entrada, demais 240; Jul-Ago aberto)
  addOcc(bCelularDaniel.id, 1, "490", true);
  for (let m = 2; m <= 6; m++) addOcc(bCelularDaniel.id, m, "240", true);
  addOcc(bCelularDaniel.id, 7, "240", false);
  addOcc(bCelularDaniel.id, 8, "240", false);

  // VH 7x (Fev-Ago; Ago = última parcela, aberto)
  for (let m = 2; m <= 7; m++) addOcc(bVh7.id, m, "428", true);
  addOcc(bVh7.id, 8, "428", false);

  // VH 8x (Abr-Ago; Ago aberto)
  for (let m = 4; m <= 7; m++) addOcc(bVh8.id, m, "1100", true);
  addOcc(bVh8.id, 8, "1100", false);

  // Mãe Nicolas (Mar-Ago; Mar=220, demais=210; Jul-Ago aberto)
  addOcc(bMaeNicolas.id, 3, "220", true);
  addOcc(bMaeNicolas.id, 4, "210", true);
  addOcc(bMaeNicolas.id, 5, "210", true);
  addOcc(bMaeNicolas.id, 6, "210", true);
  addOcc(bMaeNicolas.id, 7, "210", false);
  addOcc(bMaeNicolas.id, 8, "210", false);

  // Cartão 10x (Mar-Ago; Jul-Ago aberto)
  for (let m = 3; m <= 6; m++) addOcc(bCartao.id, m, "338", true);
  addOcc(bCartao.id, 7, "338", false);
  addOcc(bCartao.id, 8, "338", false);

  // Otávio 60x (Jan-Ago; Mar=0 anomalia; Jul-Ago aberto)
  addOcc(bOtavio.id, 1, "2900", true);
  addOcc(bOtavio.id, 2, "2900", true);
  addOcc(bOtavio.id, 3, "0",    true);
  addOcc(bOtavio.id, 4, "2900", true);
  addOcc(bOtavio.id, 5, "2900", true);
  addOcc(bOtavio.id, 6, "2900", true);
  addOcc(bOtavio.id, 7, "2900", false);
  addOcc(bOtavio.id, 8, "2900", false);

  await db.insert(billOccurrences).values(occs);

  // ---- Transactions ----
  type Tx = typeof transactions.$inferInsert;
  const txs: Tx[] = [];
  const addTx = (
    type: "income" | "expense",
    amount: string,
    m: number,
    desc: string,
    from?: number,
    to?: number,
    cat?: number,
  ) => txs.push({
    userId: tid, type, amount, month: m, year: 2026,
    date: D(2026, m, 15),
    description: desc,
    fromAccountId: from ?? null,
    toAccountId: to ?? null,
    categoryId: cat ?? null,
  });

  // COMISSÃO mensal (receita variável)
  const comissao = [11400, 13500, 11800, 15800, 10500, 15900, 13500, 13500];
  comissao.forEach((amt, i) => addTx("income", String(amt), i + 1, "Comissão", undefined, tcorrente.id));

  // Salário extra Fev (1900 - 1600 = 300)
  addTx("income", "300", 2, "Salário extra", undefined, tcorrente.id);

  // ---- Receitas variáveis por mês ----
  // Janeiro
  addTx("income", "304",  1, "João Celta 6/12",   undefined, tcorrente.id);
  addTx("income", "1000", 1, "Daniel Celta 1/5",  undefined, tcorrente.id);
  addTx("income", "350",  1, "Jadiel 2/3",         undefined, tcorrente.id);
  addTx("income", "300",  1, "Hallepher 2/2",      undefined, tcorrente.id);
  addTx("income", "2600", 1, "PS5",                undefined, tcorrente.id);
  // Fevereiro
  addTx("income", "304",  2, "João Celta 7/12",   undefined, tcorrente.id);
  addTx("income", "1000", 2, "Daniel Celta 2/5",  undefined, tcorrente.id);
  addTx("income", "300",  2, "Jadiel 3/3",         undefined, tcorrente.id);
  addTx("income", "250",  2, "Fran 1/4",           undefined, tcorrente.id);
  addTx("income", "150",  2, "Natha",              undefined, tcorrente.id);
  // Março
  addTx("income", "304",  3, "João Celta 10/12",  undefined, tcorrente.id);
  addTx("income", "1000", 3, "Daniel Celta 3/5",  undefined, tcorrente.id);
  addTx("income", "297",  3, "João 1/5",           undefined, tcorrente.id);
  // Abril
  addTx("income", "304",  4, "João Celta 11/12",  undefined, tcorrente.id);
  addTx("income", "1000", 4, "Daniel Celta 4/5",  undefined, tcorrente.id);
  addTx("income", "300",  4, "Fran 2/4",           undefined, tcorrente.id);
  addTx("income", "297",  4, "João 2/5",           undefined, tcorrente.id);
  addTx("income", "200",  4, "Natha",              undefined, tcorrente.id);
  // Maio
  addTx("income", "304",  5, "João Celta 12/12",  undefined, tcorrente.id);
  addTx("income", "1000", 5, "Daniel Celta 5/5",  undefined, tcorrente.id);
  addTx("income", "297",  5, "João 3/5",           undefined, tcorrente.id);
  addTx("income", "200",  5, "Natha",              undefined, tcorrente.id);
  // Junho
  addTx("income", "297",  6, "João 4/5",           undefined, tcorrente.id);
  addTx("income", "100",  6, "Adriano 1/2",        undefined, tcorrente.id);
  addTx("income", "50",   6, "Sogro 1/5",          undefined, tcorrente.id);
  addTx("income", "150",  6, "Natha",              undefined, tcorrente.id);
  addTx("income", "235",  6, "Jean",               undefined, tcorrente.id);
  // Julho
  addTx("income", "297",   7, "João 5/5",          undefined, tcorrente.id);
  addTx("income", "100",   7, "Adriano 2/2",       undefined, tcorrente.id);
  addTx("income", "50",    7, "Sogro 3/6",         undefined, tcorrente.id);
  addTx("income", "383",   7, "Jean",              undefined, tcorrente.id);
  addTx("income", "87.48", 7, "Condomínio Lucas",  undefined, tcorrente.id);

  // ---- Pagamentos Daniel (despesa variável) ----
  addTx("expense", "1600", 4, "Daniel", tcorrente.id, undefined, cFam.id);
  addTx("expense", "1300", 5, "Daniel", tcorrente.id, undefined, cFam.id);
  addTx("expense", "1300", 6, "Daniel", tcorrente.id, undefined, cFam.id);
  addTx("expense", "1300", 7, "Daniel", tcorrente.id, undefined, cFam.id);
  addTx("expense", "1600", 8, "Daniel", tcorrente.id, undefined, cFam.id);

  // ---- Despesas variáveis por mês ----
  // Janeiro
  addTx("expense", "83",   1, "Comidas Nicolas",  tcorrente.id, undefined, cAlim.id);
  addTx("expense", "550",  1, "Thainna",          tcorrente.id, undefined, cFam.id);
  addTx("expense", "330",  1, "Luz Sogra",        tcorrente.id, undefined, cFam.id);
  addTx("expense", "31",   1, "Lixo e IPTU",      tcorrente.id, undefined, cMor.id);
  addTx("expense", "84",   1, "Celular Nicolas",  tcorrente.id, undefined, cFam.id);
  // Fevereiro
  addTx("expense", "600",  2, "Imposto",          tcorrente.id, undefined, cImp.id);
  addTx("expense", "140",  2, "Comidas Nicolas",  tcorrente.id, undefined, cAlim.id);
  addTx("expense", "400",  2, "Thainna",          tcorrente.id, undefined, cFam.id);
  addTx("expense", "200",  2, "Assessoritec",     tcorrente.id, undefined, cServ.id);
  // Março
  addTx("expense", "747",  3, "Imposto",          tcorrente.id, undefined, cImp.id);
  addTx("expense", "138",  3, "Comidas Nicolas",  tcorrente.id, undefined, cAlim.id);
  addTx("expense", "50",   3, "Josué",            tcorrente.id, undefined, cFam.id);
  addTx("expense", "70",   3, "Lavação",          tcorrente.id, undefined, cTrans.id);
  addTx("expense", "170",  3, "Multa Celta",      tcorrente.id, undefined, cTrans.id);
  addTx("expense", "120",  3, "IPTU",             tcorrente.id, undefined, cMor.id);
  // Abril
  addTx("expense", "265",   4, "Contabilidade",   tcorrente.id, undefined, cServ.id);
  addTx("expense", "165",   4, "Guia Imposto",    tcorrente.id, undefined, cImp.id);
  addTx("expense", "77.50", 4, "Comidas Nicolas", tcorrente.id, undefined, cAlim.id);
  addTx("expense", "120",   4, "DAS MEI atrasadas",tcorrente.id, undefined, cImp.id);
  addTx("expense", "350",   4, "Dívida Caixa",    tcorrente.id, undefined, cServ.id);
  addTx("expense", "120",   4, "IPTU",            tcorrente.id, undefined, cMor.id);
  // Maio
  addTx("expense", "265",   5, "Contabilidade",   tcorrente.id, undefined, cServ.id);
  addTx("expense", "165",   5, "Guia Imposto",    tcorrente.id, undefined, cImp.id);
  addTx("expense", "102.10",5, "Marmita",         tcorrente.id, undefined, cAlim.id);
  addTx("expense", "175",   5, "UNIFECAF",        tcorrente.id, undefined, cServ.id);
  addTx("expense", "120",   5, "Lavação",         tcorrente.id, undefined, cTrans.id);
  // Junho
  addTx("expense", "265",  6, "Contabilidade",    tcorrente.id, undefined, cServ.id);
  addTx("expense", "165",  6, "Guia Imposto",     tcorrente.id, undefined, cImp.id);
  addTx("expense", "250",  6, "Andi",             tcorrente.id, undefined, cFam.id);
  addTx("expense", "240",  6, "Presente Augusto", tcorrente.id, undefined, cFam.id);
  addTx("expense", "120",  6, "Lavação",          tcorrente.id, undefined, cTrans.id);
  // Julho
  addTx("expense", "265",    7, "Contabilidade",  tcorrente.id, undefined, cServ.id);
  addTx("expense", "178.31", 7, "Guia Imposto",   tcorrente.id, undefined, cImp.id);
  addTx("expense", "120",    7, "Lavação",        tcorrente.id, undefined, cTrans.id);
  // Agosto
  addTx("expense", "800",  8, "Imposto",          tcorrente.id, undefined, cImp.id);
  addTx("expense", "265",  8, "Contabilidade",    tcorrente.id, undefined, cServ.id);
  addTx("expense", "165",  8, "Guia Imposto",     tcorrente.id, undefined, cImp.id);

  // ---- Faturas de cartão (1 transação agregada por cartão por mês) ----
  // NUBANK
  const nubankFat: [number, number][] = [[1,550],[2,758],[3,376],[4,642],[5,322.41],[6,500],[7,433],[8,340]];
  nubankFat.forEach(([m, a]) => addTx("expense", String(a), m, "Fatura Nubank", tnubank.id));

  // CAIXA
  const caixaFat: [number, number][] = [[1,2597.45],[2,1970],[3,2600],[4,2900],[5,3200],[6,2800],[7,1800],[8,1500]];
  caixaFat.forEach(([m, a]) => addTx("expense", String(a), m, "Fatura Caixa", tcaixa.id));

  // SICOOB
  const sicoobFat: [number, number][] = [[1,2400],[2,2739],[3,2770],[4,3200],[5,2817],[6,1900],[7,1808.77],[8,2800]];
  sicoobFat.forEach(([m, a]) => addTx("expense", String(a), m, "Fatura Sicoob", tsicoob.id));

  // HAVAN (sem março)
  const havanFat: [number, number][] = [[1,397.09],[2,340],[4,452],[5,556.25],[6,400],[7,365.75],[8,220]];
  havanFat.forEach(([m, a]) => addTx("expense", String(a), m, "Fatura Havan", thavan.id));

  // NUBANK PJ
  const nubankPjFat: [number, number][] = [[1,1200],[2,585],[3,270],[4,286],[5,576],[6,500],[7,360.52],[8,225]];
  nubankPjFat.forEach(([m, a]) => addTx("expense", String(a), m, "Fatura Nubank PJ", tnubankPj.id));

  await db.insert(transactions).values(txs);

  // ---- Credit card invoices (status pago/aberto) ----
  type Invoice = typeof creditCardInvoices.$inferInsert;
  const invoices: Invoice[] = [];
  const addInv = (accountId: number, m: number, paid: boolean) =>
    invoices.push({ userId: tid, accountId, month: m, year: 2026, paid, paidAt: paid ? new Date(2026, m - 1, 20) : null });

  // Nubank: Jan-Jul pago, Ago aberto
  for (let m = 1; m <= 7; m++) addInv(tnubank.id, m, true);
  addInv(tnubank.id, 8, false);

  // Caixa: Jan-Jun pago, Jul-Ago aberto
  for (let m = 1; m <= 6; m++) addInv(tcaixa.id, m, true);
  addInv(tcaixa.id, 7, false);
  addInv(tcaixa.id, 8, false);

  // Sicoob: Jan-Jun pago, Jul-Ago aberto
  for (let m = 1; m <= 6; m++) addInv(tsicoob.id, m, true);
  addInv(tsicoob.id, 7, false);
  addInv(tsicoob.id, 8, false);

  // Havan: Jan-Jul pago (sem março), Ago aberto
  [1, 2, 4, 5, 6, 7].forEach(m => addInv(thavan.id, m, true));
  addInv(thavan.id, 8, false);

  // Nubank PJ: Jan-Jul pago, Ago aberto
  for (let m = 1; m <= 7; m++) addInv(tnubankPj.id, m, true);
  addInv(tnubankPj.id, 8, false);

  await db.insert(creditCardInvoices).values(invoices).onConflictDoNothing();

  console.log("\n✅ Seed Thiago completo (dados reais da planilha FINANÇAS 2026):");
  console.log("   → 8 contas: Corrente, Nubank, Caixa, Sicoob, Havan, Nubank PJ, 2 investimentos");
  console.log("   → 10 categorias");
  console.log("   → 16 bills (2 rendas, 7 fixas, 7 parcelas)");
  console.log("   → Occurrences Jan-Ago 2026 com status PAGO/ABERTO reais");
  console.log("   → COMISSÃO como transação mensal (Jan R$11.400 → Ago R$13.500)");
  console.log("   → Faturas dos 5 cartões com status correto");
  console.log("   → Login: thiago@controle.local / senha123");
}

seed().catch((e) => { console.error(e); process.exit(1); });
