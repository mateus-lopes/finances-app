import { eq, and, sum, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { transactions, bills, billOccurrences, accounts, categories } from "../../db/schema";
import { ensureOccurrencesForMonth } from "../bills/bills.service";
import { getAllInvoicesForMonth, getRealBalance, listAccountsWithBalances } from "../accounts/accounts.service";

async function queryMonthSums(userId: number, month: number, year: number) {
  const [incomeResult, expenseResult] = await Promise.all([
    db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.month, month), eq(transactions.year, year), eq(transactions.type, "income"))),
    db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.month, month), eq(transactions.year, year), eq(transactions.type, "expense"))),
  ]);
  return {
    income: parseFloat(incomeResult[0]?.total ?? "0"),
    expenses: parseFloat(expenseResult[0]?.total ?? "0"),
  };
}

export async function getDashboard(userId: number, month: number, year: number) {
  await ensureOccurrencesForMonth(userId, month, year);

  const [
    { income: totalIncome, expenses: totalExpenses },
    txRows,
    txTransfers,
    pendingOccurrences,
    investments,
    creditCardInvoices,
    investmentBillOccs,
    realBalance,
  ] = await Promise.all([
    queryMonthSums(userId, month, year),

    db
      .select({ categoryId: transactions.categoryId, amount: transactions.amount })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.month, month), eq(transactions.year, year), eq(transactions.type, "expense"))),

    db
      .select({ amount: transactions.amount, toAccountId: transactions.toAccountId })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.month, month), eq(transactions.year, year), eq(transactions.type, "transfer"))),

    db
      .select({ occ: billOccurrences, bill: bills })
      .from(billOccurrences)
      .innerJoin(bills, eq(billOccurrences.billId, bills.id))
      .where(and(
        eq(billOccurrences.userId, userId),
        eq(billOccurrences.month, month),
        eq(billOccurrences.year, year),
        eq(billOccurrences.paid, false),
        eq(bills.active, true)
      )),

    db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.type, "investment"), eq(accounts.active, true))),

    getAllInvoicesForMonth(userId, month, year),

    db
      .select({ occ: billOccurrences, bill: bills })
      .from(billOccurrences)
      .innerJoin(bills, eq(billOccurrences.billId, bills.id))
      .where(and(
        eq(billOccurrences.userId, userId),
        eq(billOccurrences.month, month),
        eq(billOccurrences.year, year),
        eq(bills.type, "transfer")
      )),

    getRealBalance(userId),
  ]);

  const accountsData = await listAccountsWithBalances(userId, month, year);

  const investmentIds = new Set(investments.map(inv => inv.id));
  const invested = txTransfers
    .filter(t => t.toAccountId != null && investmentIds.has(t.toAccountId))
    .reduce((s, t) => s + parseFloat(t.amount ?? "0"), 0);

  const saldo = totalIncome - totalExpenses - invested;

  const pendingBillExpense = pendingOccurrences
    .filter(({ bill }) => bill.type === "expense")
    .reduce((acc, { occ }) => acc + parseFloat(occ.amount), 0);
  const pendingBillIncome = pendingOccurrences
    .filter(({ bill }) => bill.type === "income")
    .reduce((acc, { occ }) => acc + parseFloat(occ.amount), 0);

  const categoryIds = [...new Set([
    ...txRows.map((r) => r.categoryId),
    ...pendingOccurrences.map(({ bill }) => bill.categoryId),
  ].filter(Boolean) as number[])];
  const cats = categoryIds.length
    ? await db.select().from(categories).where(and(eq(categories.userId, userId), inArray(categories.id, categoryIds)))
    : [];
  const categoryMap = new Map(cats.map((c) => [c.id, c]));

  const categoryTotals = new Map<number, number>();
  for (const row of txRows) {
    if (!row.categoryId) continue;
    categoryTotals.set(row.categoryId, (categoryTotals.get(row.categoryId) ?? 0) + parseFloat(row.amount ?? "0"));
  }

  const categoriesBreakdown = [...categoryTotals.entries()].map(([id, total]) => {
    const cat = categoryMap.get(id);
    return { categoryId: id, categoryName: cat?.name ?? null, categoryColor: cat?.color ?? null, total };
  });

  const investmentOccMap = new Map(investmentBillOccs.map((o) => [o.bill.toAccountId, o]));

  const investmentWithOcc = investments.map((inv) => {
    const occ = investmentOccMap.get(inv.id);
    return {
      id: inv.id,
      name: inv.name,
      type: inv.type,
      currentAmount: parseFloat(inv.currentAmount ?? "0"),
      targetAmount: inv.targetAmount ? parseFloat(inv.targetAmount) : null,
      showProgress: inv.showProgress,
      monthlyAmount: occ ? parseFloat(occ.occ.amount) : null,
      occurrence: occ?.occ ?? null,
      paid: occ?.occ.paid ?? false,
    };
  });

  const savingsRate = totalIncome > 0 ? (saldo / totalIncome) * 100 : 0;
  const freeToSpend = totalIncome - pendingBillExpense;
  const commitmentPct = totalIncome > 0 ? (pendingBillExpense / totalIncome) * 100 : 0;

  return {
    month,
    year,
    totalIncome,
    totalExpenses,
    invested,
    saldo,
    savingsRate,
    freeToSpend,
    commitmentPct,
    realBalance,
    accountSummary: accountsData.summary,
    breakdown: {
      pendingBillExpense,
      pendingBillIncome,
    },
    categoriesBreakdown,
    creditCards: creditCardInvoices,
    pending: pendingOccurrences.map(({ occ, bill }) => {
      const cat = bill.categoryId ? categoryMap.get(bill.categoryId) : null;
      return {
        id: occ.id,
        billId: bill.id,
        name: bill.name,
        type: bill.type,
        amount: parseFloat(occ.amount),
        dueDate: occ.dueDate,
        category: cat ? { id: cat.id, name: cat.name, color: cat.color } : null,
      };
    }),
    investments: investmentWithOcc,
  };
}

export async function getMonthStats(userId: number, month: number, year: number) {
  const { income, expenses } = await queryMonthSums(userId, month, year);
  const saldo = income - expenses;
  return { month, year, income, expenses, saldo, savingsRate: income > 0 ? (saldo / income) * 100 : 0 };
}

function stepMonth(month: number, year: number, steps: number): { month: number; year: number } {
  let m = month + steps;
  let y = year;
  while (m <= 0) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return { month: m, year: y };
}

export async function getDashboardHistory(
  userId: number,
  endMonth: number,
  endYear: number,
  months: number,
) {
  const periods = Array.from({ length: months }, (_, i) => stepMonth(endMonth, endYear, -(months - 1 - i)));
  const results = await Promise.all(periods.map(p => getMonthStats(userId, p.month, p.year)));
  return results;
}
