import { eq, and, sum } from "drizzle-orm";
import { db } from "../../db/client";
import { transactions, bills, accounts } from "../../db/schema";
import { getMonthStats, getDashboardHistory } from "../dashboard/dashboard.service";
import { listAccountsWithBalances } from "../accounts/accounts.service";

export async function getGoals(userId: number, month: number, year: number) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [accountsData, investmentBills, expenseResult] = await Promise.all([
    listAccountsWithBalances(userId, month, year),

    // Bills de aporte mensal (transfer para conta de investimento)
    db
      .select()
      .from(bills)
      .where(and(eq(bills.userId, userId), eq(bills.active, true), eq(bills.type, "transfer"))),

    // Total de despesas do mês selecionado
    db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.month, month),
        eq(transactions.year, year),
        eq(transactions.type, "expense"),
      )),
  ]);

  const investmentAccounts = accountsData.accounts.filter(a => a.type === "investment");

  // Mapa: toAccountId → valor do aporte mensal
  const monthlyContribMap = new Map<number, number>();
  for (const bill of investmentBills) {
    if (bill.toAccountId) {
      const prev = monthlyContribMap.get(bill.toAccountId) ?? 0;
      monthlyContribMap.set(bill.toAccountId, prev + parseFloat(bill.amount ?? "0"));
    }
  }

  const investments = investmentAccounts.map(acc => {
    const currentAmount = acc.balance;
    const targetAmount = acc.targetAmount ? parseFloat(acc.targetAmount) : null;
    const monthlyContrib = monthlyContribMap.get(acc.id) ?? null;
    const progress = targetAmount && targetAmount > 0
      ? Math.min(100, (currentAmount / targetAmount) * 100)
      : null;
    const monthsToGoal =
      targetAmount && monthlyContrib && monthlyContrib > 0 && targetAmount > currentAmount
        ? Math.ceil((targetAmount - currentAmount) / monthlyContrib)
        : null;

    return {
      id: acc.id,
      name: acc.name,
      color: acc.color,
      currentAmount,
      targetAmount,
      monthlyContribution: monthlyContrib,
      progress,
      monthsToGoal,
    };
  });

  const totalInvested = investments.reduce((acc, i) => acc + i.currentAmount, 0);
  const totalTargets = investments.reduce((acc, i) => acc + (i.targetAmount ?? 0), 0);
  const overallProgress = totalTargets > 0 ? Math.min(100, (totalInvested / totalTargets) * 100) : null;

  // Daily burn
  const totalExpenses = parseFloat(expenseResult[0]?.total ?? "0");
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysElapsed =
    month === currentMonth && year === currentYear ? now.getDate() : daysInMonth;
  const dailyBurn = daysElapsed > 0 ? totalExpenses / daysElapsed : 0;
  const projectedMonthlySpend = dailyBurn * daysInMonth;

  // Histórico cumulativo de poupança (6 meses)
  const history = await getDashboardHistory(userId, month, year, 6);
  let cumulative = 0;
  const cumulativeSavingsHistory = history.map(m => {
    cumulative += Math.max(0, m.saldo);
    return { month: m.month, year: m.year, saldo: m.saldo, cumulative };
  });

  return {
    overallProgress,
    totalInvested,
    totalTargets,
    dailyBurn,
    projectedMonthlySpend,
    cumulativeSavingsHistory,
    investments,
    accountSummary: accountsData.summary,
  };
}
