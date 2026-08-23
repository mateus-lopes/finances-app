import { eq, and, sum, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { transactions, bills, billOccurrences, accounts, categories, creditCardInvoices } from "../../db/schema";
import { getMonthStats } from "../dashboard/dashboard.service";

function stepMonth(month: number, year: number, steps: number): { month: number; year: number } {
  let m = month + steps;
  let y = year;
  while (m <= 0) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return { month: m, year: y };
}

function fmt(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function buildSeasonInsight(months: { income: number }[]): string {
  const positiveMonths = months.map(m => m.income).filter(v => v > 0);
  if (positiveMonths.length < 2) return "Dados insuficientes para análise de sazonalidade";
  const avg = positiveMonths.reduce((a, b) => a + b, 0) / positiveMonths.length;
  const last = positiveMonths[positiveMonths.length - 1];
  const pct = avg > 0 ? ((last - avg) / avg) * 100 : 0;
  if (pct > 10) return `Receita do mês ${pct.toFixed(0)}% acima da média dos últimos meses`;
  if (pct < -10) return `Receita do mês ${Math.abs(pct).toFixed(0)}% abaixo da média dos últimos meses`;
  return "Receita estável nos últimos meses";
}

function buildInsights(params: {
  commitmentPct: number;
  freeToSpend: number;
  totalIncome: number;
  installmentsPct: number;
  releaseNext6m: number;
  totalDebt: number;
  cardTrends: { name: string; delta: number }[];
}): { severity: "good" | "neutral" | "bad"; message: string }[] {
  const insights: { severity: "good" | "neutral" | "bad"; message: string }[] = [];

  if (params.freeToSpend < 0) {
    insights.push({ severity: "bad", message: "Comprometimentos superam a receita do mês" });
  } else if (params.commitmentPct >= 80) {
    insights.push({ severity: "bad", message: `${params.commitmentPct.toFixed(0)}% da renda está comprometida com despesas fixas` });
  } else if (params.commitmentPct >= 55) {
    insights.push({ severity: "neutral", message: "Parcelas e despesas fixas pesam bastante no orçamento" });
  } else {
    insights.push({ severity: "good", message: "Boa margem de manobra — menos de 55% da renda comprometida" });
  }

  if (params.installmentsPct >= 30) {
    insights.push({ severity: "neutral", message: "Parcelas representam mais de 30% da receita — considere renegociar ou adiantar pagamentos" });
  }

  if (params.releaseNext6m > 0) {
    insights.push({ severity: "good", message: `Parcelas que encerram nos próximos 6 meses liberam ${fmt(params.releaseNext6m)}/mês` });
  }

  if (params.totalDebt > 20000) {
    insights.push({ severity: "bad", message: `Dívida total em parcelas: ${fmt(params.totalDebt)} — mantenha atenção` });
  }

  for (const card of params.cardTrends) {
    if (card.delta > 100) {
      insights.push({ severity: "bad", message: `Fatura do ${card.name} cresceu ${fmt(card.delta)} em relação ao mês anterior` });
    }
  }

  return insights;
}

export async function getAnalytics(userId: number, month: number, year: number) {
  // 1. Histórico de 8 meses (do mais antigo para o mais recente)
  const historyPeriods = Array.from({ length: 8 }, (_, i) =>
    stepMonth(month, year, -(7 - i))
  );
  const historyStats = await Promise.all(
    historyPeriods.map(p => getMonthStats(userId, p.month, p.year))
  );

  const currentStats = historyStats[historyStats.length - 1]!;
  const { income: totalIncome, expenses: totalExpenses, saldo } = currentStats;

  // 2. Bills pendentes do mês para commitmentPct
  const pendingOccs = await db
    .select({ occ: billOccurrences, bill: bills })
    .from(billOccurrences)
    .innerJoin(bills, eq(billOccurrences.billId, bills.id))
    .where(and(
      eq(billOccurrences.userId, userId),
      eq(billOccurrences.month, month),
      eq(billOccurrences.year, year),
      eq(billOccurrences.paid, false),
      eq(bills.active, true),
    ));

  const pendingBillExpense = pendingOccs
    .filter(({ bill }) => bill.type === "expense")
    .reduce((acc, { occ }) => acc + parseFloat(occ.amount), 0);

  const commitmentPct = totalIncome > 0 ? (pendingBillExpense / totalIncome) * 100 : 0;
  const freeToSpend = totalIncome - pendingBillExpense;

  // 3. Sazonalidade
  const incomeValues = historyStats.map(m => m.income).filter(v => v > 0);
  const avgIncome = incomeValues.length > 0
    ? incomeValues.reduce((a, b) => a + b, 0) / incomeValues.length
    : 0;
  const maxIncome = incomeValues.length > 0 ? Math.max(...incomeValues) : 0;
  const minIncome = incomeValues.length > 0 ? Math.min(...incomeValues) : 0;

  // 4. Horizonte de parcelas (bills expense com endDate)
  const allExpenseBills = await db
    .select()
    .from(bills)
    .where(and(eq(bills.userId, userId), eq(bills.active, true), eq(bills.type, "expense")));

  const installmentBills = allExpenseBills.filter(b => b.endDate);

  let releaseNext6m = 0;
  let totalDebt = 0;
  let installmentsTotal = 0;

  const installmentItems = installmentBills.map(bill => {
    const end = new Date(bill.endDate! + "T00:00:00");
    const monthsLeft =
      (end.getFullYear() - year) * 12 + (end.getMonth() - (month - 1)) + 1;
    const amount = parseFloat(bill.amount ?? "0");

    if (monthsLeft > 0) {
      totalDebt += amount * monthsLeft;
      installmentsTotal += amount;
      if (monthsLeft <= 6) releaseNext6m += amount;
    }

    return { billId: bill.id, name: bill.name, amount, monthsLeft: Math.max(0, monthsLeft), endDate: bill.endDate };
  }).filter(i => i.monthsLeft > 0);

  const installmentsPct = totalIncome > 0 ? (installmentsTotal / totalIncome) * 100 : 0;

  // 5. Tendências de cartão de crédito (últimos 8 meses)
  const cardAccounts = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.type, "credit_card"), eq(accounts.active, true)));

  const cardTrends = await Promise.all(
    cardAccounts.map(async card => {
      const monthAmounts = await Promise.all(
        historyPeriods.map(async p => {
          const [res] = await db
            .select({ total: sum(transactions.amount) })
            .from(transactions)
            .where(and(
              eq(transactions.userId, userId),
              eq(transactions.fromAccountId, card.id),
              eq(transactions.type, "expense"),
              eq(transactions.month, p.month),
              eq(transactions.year, p.year),
            ));
          return { month: p.month, year: p.year, amount: parseFloat(res?.total ?? "0") };
        })
      );

      const lastAmount = monthAmounts[monthAmounts.length - 1]!.amount;
      const prevAmount = monthAmounts[monthAmounts.length - 2]?.amount ?? 0;
      const delta = lastAmount - prevAmount;
      const trend: "up" | "down" | "stable" =
        delta > 10 ? "up" : delta < -10 ? "down" : "stable";

      return {
        accountId: card.id,
        name: card.name,
        months: monthAmounts,
        delta,
        trend,
      };
    })
  );

  // 6. Insights
  const insights = buildInsights({
    commitmentPct,
    freeToSpend,
    totalIncome,
    installmentsPct,
    releaseNext6m,
    totalDebt,
    cardTrends: cardTrends.map(c => ({ name: c.name, delta: c.delta })),
  });

  return {
    commitment: {
      amount: pendingBillExpense,
      pct: commitmentPct,
      freeToSpend,
    },
    seasonality: {
      months: historyStats,
      avgIncome,
      maxIncome,
      minIncome,
      seasonInsight: buildSeasonInsight(historyStats),
    },
    installmentHorizon: {
      releaseNext6m,
      totalDebt,
      items: installmentItems,
    },
    creditCardTrends: cardTrends,
    insights,
  };
}

export async function getSpendingAnalytics(userId: number, month: number, year: number) {
  const [incomeResult, expenseResult, txRows] = await Promise.all([
    db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.month, month), eq(transactions.year, year), eq(transactions.type, "income"))),
    db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.month, month), eq(transactions.year, year), eq(transactions.type, "expense"))),
    db
      .select({ categoryId: transactions.categoryId, amount: transactions.amount })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.month, month), eq(transactions.year, year), eq(transactions.type, "expense"))),
  ]);

  const totalIncome = parseFloat(incomeResult[0]?.total ?? "0");
  const totalExpenses = parseFloat(expenseResult[0]?.total ?? "0");
  const saldo = totalIncome - totalExpenses;

  const categoryIds = [...new Set(txRows.map(r => r.categoryId).filter(Boolean) as number[])];
  const cats = categoryIds.length
    ? await db.select().from(categories).where(and(eq(categories.userId, userId), inArray(categories.id, categoryIds)))
    : [];
  const categoryMap = new Map(cats.map(c => [c.id, c]));

  const categoryTotals = new Map<number, number>();
  for (const row of txRows) {
    if (!row.categoryId) continue;
    categoryTotals.set(row.categoryId, (categoryTotals.get(row.categoryId) ?? 0) + parseFloat(row.amount ?? "0"));
  }

  const categoriesBreakdown = [...categoryTotals.entries()]
    .map(([id, total]) => {
      const cat = categoryMap.get(id);
      return { categoryId: id, categoryName: cat?.name ?? null, categoryColor: cat?.color ?? null, total };
    })
    .sort((a, b) => b.total - a.total);

  const totalCatExpenses = categoriesBreakdown.reduce((acc, c) => acc + c.total, 0);
  const topCategory = categoriesBreakdown[0] ?? null;
  const topCategoryPct = topCategory && totalCatExpenses > 0
    ? (topCategory.total / totalCatExpenses) * 100
    : 0;

  return {
    totalIncome,
    totalExpenses,
    saldo,
    incomeVsExpenseRatio: totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0,
    savingsRate: totalIncome > 0 ? Math.max(0, (saldo / totalIncome) * 100) : 0,
    topCategory,
    topCategoryPct,
    categoriesBreakdown,
  };
}
