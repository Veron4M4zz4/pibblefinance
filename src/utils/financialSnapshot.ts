import type { Transaction, Wallet } from "../types";
import { parseLocalDateValue } from "./date";
import { normalizeMoneyNumber } from "./numbers";
import {
  getCreditAvailable,
  getCreditLimit,
  getCreditUsagePercentage,
  getCreditUsed,
  isCreditCardWallet,
} from "./creditCards";
import type { DashboardSectionId } from "./dashboardNavigation";
import { buildSubscriptionOverview } from "./subscriptions";

export type FinancialAlertTone = "success" | "warning" | "danger";
export type FinancialInsightType =
  | "CATEGORY_SPENDING"
  | "CREDIT_USAGE"
  | "CASHFLOW"
  | "SUBSCRIPTIONS"
  | "SAVINGS"
  | "GOALS"
  | "WALLET_PERFORMANCE"
  | "INCOME"
  | "INSTALLMENTS"
  | "ANOMALY";

export type FinancialInsightPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type FinancialInsightSourceValue = string | number | boolean | null | Array<string | number>;
export type FinancialInsightSourceData = Record<string, FinancialInsightSourceValue>;

export interface FinancialInsight {
  type: FinancialInsightType;
  priority: FinancialInsightPriority;
  tone: FinancialAlertTone;
  title: string;
  text: string;
  chartTarget: DashboardSectionId;
  relatedSectionIds: DashboardSectionId[];
  actionSuggestion: string;
  sourceData: FinancialInsightSourceData;
  impactEstimate: string;
}

export interface FinancialAlert {
  tone: FinancialAlertTone;
  title: string;
  text: string;
  suggestion: string;
  priority?: FinancialInsightPriority;
  chartTarget?: DashboardSectionId;
  type?: FinancialInsightType;
}

export interface FinancialSnapshot {
  cashBalance: number;
  creditLimitTotal: number;
  creditUsed: number;
  creditAvailable: number;
  creditRemaining: number;
  creditUsagePercentage: number;
  income: number;
  totalExpenses: number;
  creditExpenses: number;
  debitExpenses: number;
  netCashFlow: number;
  healthScore: number;
  healthLabel: "Excelente" | "Estável" | "Atenção" | "Crítico";
  incomeLast7Days: number;
  incomePrev7Days: number;
  expenseLast7Days: number;
  expensePrev7Days: number;
  incomeTrendPercent: number;
  expenseTrendPercent: number;
  daysSinceLastIncome: number | null;
  daysSinceLastExpense: number | null;
  alerts: FinancialAlert[];
  mainInsight: FinancialInsight;
}

export interface WalletBalanceSummary {
  walletById: Record<string, Wallet>;
  totalBalance: number;
  cashBalance: number;
  creditLimitTotal: number;
  creditUsed: number;
  creditAvailable: number;
  creditRemaining: number;
  creditUsagePercentage: number;
  income: number;
  debitExpenses: number;
  creditExpenses: number;
  totalExpenses: number;
  netCashFlow: number;
  creditWalletCount: number;
  byType: Record<string, number>;
}

export function getTransactionWalletId(transaction: Transaction) {
  return transaction.walletId || (transaction as any).wallet_id || "";
}

export function getTransactionToWalletId(transaction: Transaction) {
  return transaction.toWalletId || (transaction as any).to_wallet_id || "";
}

export function isCreditWallet(wallet?: Wallet | null) {
  return isCreditCardWallet(wallet);
}

export function buildWalletBalanceSummary(
  wallets: Wallet[],
  transactions: Transaction[] = []
): WalletBalanceSummary {
  const walletById = wallets.reduce<Record<string, Wallet>>((acc, wallet) => {
    acc[wallet.id] = wallet;
    return acc;
  }, {});

  const creditWallets = wallets.filter((wallet) => isCreditCardWallet(wallet));
  const creditLimitTotal = creditWallets.reduce(
    (acc, wallet) => acc + getCreditLimit(wallet, transactions),
    0
  );
  const creditUsed = creditWallets.reduce(
    (acc, wallet) => acc + getCreditUsed(wallet, transactions),
    0
  );
  const creditAvailable = creditWallets.reduce(
    (acc, wallet) => acc + getCreditAvailable(wallet, transactions),
    0
  );

  const cashBalance = wallets
    .filter((wallet) => !isCreditCardWallet(wallet))
    .reduce((acc, wallet) => acc + normalizeMoneyNumber(wallet.balance, 0), 0);

  const totalBalance = cashBalance;

  const income = transactions
    .filter((item) => item.type === "income")
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);

  const creditExpenses = transactions
    .filter((item) => {
      const wallet = walletById[getTransactionWalletId(item)];
      return item.type === "expense" && isCreditCardWallet(wallet);
    })
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);

  const debitExpenses = transactions
    .filter((item) => {
      const wallet = walletById[getTransactionWalletId(item)];
      return item.type === "expense" && !isCreditCardWallet(wallet);
    })
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);

  const totalExpenses = creditExpenses + debitExpenses;
  const creditUsagePercentage =
    creditWallets.length > 0
      ? Math.min(100, Math.max(0, (creditUsed / Math.max(creditLimitTotal, 1)) * 100))
      : 0;

  const byType = wallets.reduce<Record<string, number>>((acc, wallet) => {
    const typeKey = String(wallet.type || "checking");

    if (isCreditCardWallet(wallet)) {
      acc[typeKey] = (acc[typeKey] || 0) + getCreditLimit(wallet, transactions);
      return acc;
    }

    acc[typeKey] = (acc[typeKey] || 0) + normalizeMoneyNumber(wallet.balance, 0);
    return acc;
  }, {});

  return {
    walletById,
    totalBalance,
    cashBalance,
    creditLimitTotal,
    creditUsed,
    creditAvailable,
    creditRemaining: creditAvailable,
    creditUsagePercentage,
    income,
    debitExpenses,
    creditExpenses,
    totalExpenses,
    netCashFlow: income - totalExpenses,
    creditWalletCount: creditWallets.length,
    byType,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getHealthLabel(score: number) {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Estável";
  if (score >= 45) return "Atenção";
  return "Crítico";
}

function safePercent(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function daysBetween(dateA: Date, dateB: Date) {
  const diffMs = dateA.getTime() - dateB.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function toDateOrNull(value?: string | null) {
  return parseLocalDateValue(value);
}

function getAlertTone(score: number): FinancialAlertTone {
  if (score >= 80) return "success";
  if (score >= 55) return "warning";
  return "danger";
}

function buildInsight(
  insight: FinancialInsight
): FinancialInsight {
  return insight;
}

function normalizeCategoryName(value: string) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

export function buildFinancialSnapshot(
  wallets: Wallet[],
  transactions: Transaction[]
): FinancialSnapshot {
  const summary = buildWalletBalanceSummary(wallets, transactions);
  const { walletById } = summary;
  const {
    cashBalance,
    creditLimitTotal,
    creditUsed,
    creditAvailable,
    creditRemaining,
    creditUsagePercentage,
    income,
    debitExpenses,
    creditExpenses,
    totalExpenses,
    netCashFlow,
  } = summary;

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date(startOfToday);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  let incomeLast7Days = 0;
  let incomePrev7Days = 0;
  let expenseLast7Days = 0;
  let expensePrev7Days = 0;
  let lastIncomeDate: Date | null = null;
  let lastExpenseDate: Date | null = null;

  let smallExpenseCount = 0;
  let smallExpenseTotal = 0;
  const expenseByCategory: Record<string, number> = {};
  const creditWallets = wallets.filter((wallet) => isCreditCardWallet(wallet));
  const subscriptionOverview = buildSubscriptionOverview(wallets, transactions);

  const smallExpenseThreshold = Math.max(
    40,
    Math.round(Math.max(totalExpenses, 1) * 0.08)
  );

  transactions.forEach((transaction) => {
    const date = toDateOrNull(transaction.date);
    const amount = Number(transaction.amount || 0);

    if (!date) return;

    if (transaction.type === "income") {
      if (!lastIncomeDate || date > lastIncomeDate) {
        lastIncomeDate = date;
      }

      if (date >= sevenDaysAgo) {
        incomeLast7Days += amount;
      } else if (date >= fourteenDaysAgo) {
        incomePrev7Days += amount;
      }
    }

    if (transaction.type === "expense") {
      if (!lastExpenseDate || date > lastExpenseDate) {
        lastExpenseDate = date;
      }

      if (date >= sevenDaysAgo) {
        expenseLast7Days += amount;
      } else if (date >= fourteenDaysAgo) {
        expensePrev7Days += amount;
      }

      if (amount <= smallExpenseThreshold) {
        smallExpenseCount += 1;
        smallExpenseTotal += amount;
      }

      const categoryKey = normalizeCategoryName(transaction.category || "Outros");
      expenseByCategory[categoryKey] = (expenseByCategory[categoryKey] || 0) + amount;
    }
  });

  const daysSinceLastIncome = lastIncomeDate
    ? Math.max(0, daysBetween(startOfToday, lastIncomeDate))
    : null;
  const daysSinceLastExpense = lastExpenseDate
    ? Math.max(0, daysBetween(startOfToday, lastExpenseDate))
    : null;

  const incomeTrendPercent = safePercent(incomeLast7Days, incomePrev7Days);
  const expenseTrendPercent = safePercent(expenseLast7Days, expensePrev7Days);
  const topExpenseCategoryEntry = Object.entries(expenseByCategory).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const topExpenseCategoryName = topExpenseCategoryEntry?.[0] || "";
  const topExpenseCategoryValue = topExpenseCategoryEntry?.[1] || 0;
  const topExpenseCategoryShare =
    totalExpenses > 0 ? (topExpenseCategoryValue / totalExpenses) * 100 : 0;

  let healthScore = 100;

  if (income === 0 && totalExpenses > 0) healthScore -= 18;
  if (income > 0 && totalExpenses > income) healthScore -= 28;
  if (creditUsed > creditLimitTotal && creditLimitTotal > 0) healthScore -= 24;
  if (creditUsagePercentage > 80) healthScore -= 12;
  if (cashBalance < totalExpenses * 0.25 && totalExpenses > 0) healthScore -= 14;
  if (cashBalance < 0) healthScore -= 18;

  if (expenseTrendPercent > 15) healthScore -= 10;
  if (daysSinceLastIncome !== null && daysSinceLastIncome > 14) healthScore -= 8;

  healthScore = clamp(Math.round(healthScore), 0, 100);

  const primaryCreditWallet = creditWallets[0];
  const topSubscriptionEntity = subscriptionOverview.entities[0];

  let mainInsight: FinancialInsight = buildInsight({
    type: "SAVINGS",
    priority: "LOW",
    tone: "success",
    title: "Sua estrutura está bem organizada",
    text: "Não encontrei sinais críticos na leitura atual.",
    chartTarget: "dashboard-summary",
    relatedSectionIds: ["financial-evolution-chart"],
    actionSuggestion: "Ver panorama geral",
    sourceData: {
      cashBalance,
      creditRemaining,
      totalExpenses,
      income,
      netCashFlow,
    },
    impactEstimate: "Situação estável no momento.",
  });

  if (income === 0 && totalExpenses > 0) {
    mainInsight = buildInsight({
      type: "INCOME",
      priority: "CRITICAL",
      tone: "danger",
      title: "Você está gastando sem renda registrada",
      text: "Registrar entradas vai deixar a leitura mais precisa e útil para decisão.",
      chartTarget: "financial-evolution-chart",
      relatedSectionIds: ["dashboard-summary", "expense-categories-chart"],
      actionSuggestion: "Ver entradas",
      sourceData: {
        income,
        totalExpenses,
        daysSinceLastIncome,
      },
      impactEstimate: `Sem entradas registradas e ${totalExpenses.toFixed(2)} em gastos ativos.`,
    });
  } else if (income > 0 && totalExpenses > income) {
    const overspend = totalExpenses - income;
    mainInsight = buildInsight({
      type: "CASHFLOW",
      priority: overspend / Math.max(income, 1) > 0.25 ? "CRITICAL" : "HIGH",
      tone: "danger",
      title: "As saídas já estão acima das entradas",
      text: "Vale revisar os maiores gastos antes que o mês fique apertado.",
      chartTarget: "financial-evolution-chart",
      relatedSectionIds: ["expense-categories-chart", "wallet-performance-chart"],
      actionSuggestion: "Analisar fluxo",
      sourceData: {
        income,
        totalExpenses,
        netCashFlow,
        overspend,
      },
      impactEstimate: `O fluxo está negativo em ${overspend.toFixed(2)} no período atual.`,
    });
  } else if (creditUsagePercentage > 80) {
    mainInsight = buildInsight({
      type: "CREDIT_USAGE",
      priority: creditUsagePercentage >= 95 ? "CRITICAL" : "HIGH",
      tone: "warning",
      title: "O limite do cartão está ficando apertado",
      text: "O uso do crédito já passou do ponto confortável para o período.",
      chartTarget: "credit-utilization-chart",
      relatedSectionIds: ["wallet-performance-chart", "financial-evolution-chart"],
      actionSuggestion: "Ver cartão",
      sourceData: {
        creditUsagePercentage: Math.round(creditUsagePercentage),
        creditUsed,
        creditLimitTotal,
        creditRemaining,
        walletName: primaryCreditWallet?.name || "Cartão de crédito",
      },
      impactEstimate: `${Math.round(creditUsagePercentage)}% do limite já está ocupado.`,
    });
  } else if (subscriptionOverview.monthlyTotal >= 50 && topSubscriptionEntity) {
    mainInsight = buildInsight({
      type: "SUBSCRIPTIONS",
      priority: subscriptionOverview.monthlyTotal >= 150 ? "HIGH" : "MEDIUM",
      tone: "warning",
      title: "Suas assinaturas já merecem atenção",
      text: `O painel identificou ${subscriptionOverview.entities.length} recorrências ativas.`,
      chartTarget: "subscriptions-dashboard",
      relatedSectionIds: ["subscriptions-chart", "wallet-performance-chart"],
      actionSuggestion: "Analisar assinaturas",
      sourceData: {
        subscriptionName: topSubscriptionEntity.name,
        walletName: topSubscriptionEntity.walletName,
        subscriptionCount: subscriptionOverview.entities.length,
        subscriptionMonthlyTotal: subscriptionOverview.monthlyTotal,
        subscriptionAnnualTotal: subscriptionOverview.annualTotal,
      },
      impactEstimate: `Total mensal estimado de ${subscriptionOverview.monthlyTotal.toFixed(2)}.`,
    });
  } else if (topExpenseCategoryValue > 0 && topExpenseCategoryShare >= 25) {
    mainInsight = buildInsight({
      type: "CATEGORY_SPENDING",
      priority: topExpenseCategoryShare >= 40 ? "HIGH" : "MEDIUM",
      tone: topExpenseCategoryShare >= 40 ? "warning" : "success",
      title: `${topExpenseCategoryName} está puxando seus gastos`,
      text: `Essa categoria representa ${Math.round(topExpenseCategoryShare)}% do total de despesas.`,
      chartTarget: "expense-categories-chart",
      relatedSectionIds: ["financial-evolution-chart"],
      actionSuggestion: "Ver categorias",
      sourceData: {
        categoryName: topExpenseCategoryName,
        categoryValue: topExpenseCategoryValue,
        categoryShare: Math.round(topExpenseCategoryShare),
        totalExpenses,
      },
      impactEstimate: `${topExpenseCategoryValue.toFixed(2)} concentrados em ${topExpenseCategoryName}.`,
    });
  } else if (creditExpenses > debitExpenses && creditExpenses > 0) {
    mainInsight = buildInsight({
      type: "WALLET_PERFORMANCE",
      priority: "HIGH",
      tone: "warning",
      title: "Grande parte das saídas está indo para o crédito",
      text: "Isso merece atenção para não virar efeito bola de neve no fechamento.",
      chartTarget: "credit-utilization-chart",
      relatedSectionIds: ["wallet-performance-chart", "financial-evolution-chart"],
      actionSuggestion: "Ver cartão",
      sourceData: {
        creditExpenses,
        debitExpenses,
        creditUsagePercentage: Math.round(creditUsagePercentage),
      },
      impactEstimate: `Cerca de ${creditExpenses.toFixed(2)} do gasto total está indo para o cartão.`,
    });
  } else if (cashBalance < totalExpenses * 0.5 && totalExpenses > 0) {
    mainInsight = buildInsight({
      type: "SAVINGS",
      priority: "HIGH",
      tone: "warning",
      title: "Sua folga de caixa está curta",
      text: "A reserva atual pode não cobrir muitas oscilações de gasto.",
      chartTarget: "financial-evolution-chart",
      relatedSectionIds: ["dashboard-summary", "goals-section"],
      actionSuggestion: "Continuar economizando",
      sourceData: {
        cashBalance,
        totalExpenses,
        creditRemaining,
      },
      impactEstimate: `A folga atual cobre menos de metade dos seus gastos.`,
    });
  } else if (expenseTrendPercent > 15) {
    mainInsight = buildInsight({
      type: "ANOMALY",
      priority: expenseTrendPercent >= 35 ? "HIGH" : "MEDIUM",
      tone: "warning",
      title: "Seus gastos subiram recentemente",
      text: "Os últimos 7 dias ficaram mais caros do que o período anterior.",
      chartTarget: "anomaly-analysis-chart",
      relatedSectionIds: ["expense-categories-chart", "financial-evolution-chart"],
      actionSuggestion: "Investigar gasto",
      sourceData: {
        expenseTrendPercent: Math.round(expenseTrendPercent),
        expenseLast7Days,
        expensePrev7Days,
      },
      impactEstimate: `Os gastos estão ${Math.round(expenseTrendPercent)}% acima da semana anterior.`,
    });
  }

  const alerts: FinancialAlert[] = [];

  if (creditUsagePercentage > 80 && creditLimitTotal > 0) {
    alerts.push({
      tone: "danger",
      title: "Você está usando muito crédito",
      text: "O uso do cartão já ultrapassou uma faixa confortável.",
      suggestion: "Revise a fatura e evite novas compras até aliviar o limite.",
    });
  }

  if (expenseTrendPercent > 15 && expenseLast7Days > expensePrev7Days) {
    alerts.push({
      tone: "warning",
      title: "Seus gastos cresceram nos últimos dias",
      text: `Os últimos 7 dias ficaram ${Math.round(
        expenseTrendPercent
      )}% acima do período anterior.`,
      suggestion: "Compare os lançamentos recentes e corte o que não é essencial.",
    });
  }

  if (daysSinceLastIncome === null || daysSinceLastIncome > 14) {
    alerts.push({
      tone: "warning",
      title: "Você não tem entrada registrada recentemente",
      text: "Sem entrada nova, fica mais difícil medir a folga do mês.",
      suggestion: "Confira se faltou lançar salário, recebimento ou transferência.",
    });
  }

  if (smallExpenseCount >= 6 && smallExpenseTotal >= totalExpenses * 0.25) {
    alerts.push({
      tone: "warning",
      title: "Cuidado com gastos pequenos acumulados",
      text: `Há ${smallExpenseCount} lançamentos pequenos somando ${smallExpenseTotal.toFixed(
        2
      )} no período analisado.`,
      suggestion: "Vale agrupar esses microgastos e ver onde o orçamento está vazando.",
    });
  }

  if (cashBalance >= totalExpenses * 1.2 && income >= totalExpenses) {
    alerts.push({
      tone: "success",
      title: "Seu saldo disponível está saudável",
      text: "Hoje o caixa está cobrindo os gastos com alguma folga.",
      suggestion: "Mantenha esse ritmo e considere separar uma reserva.",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      tone: getAlertTone(healthScore),
      title: "Seu panorama está estável",
      text: "Não apareceu nenhum alerta crítico no momento.",
      suggestion: "Continue monitorando cartão, saldo e entradas recentes.",
    });
  }

  return {
    cashBalance,
    creditLimitTotal,
    creditUsed,
    creditAvailable,
    creditRemaining,
    creditUsagePercentage,
    income,
    totalExpenses,
    creditExpenses,
    debitExpenses,
    netCashFlow,
    healthScore,
    healthLabel: getHealthLabel(healthScore),
    incomeLast7Days,
    incomePrev7Days,
    expenseLast7Days,
    expensePrev7Days,
    incomeTrendPercent,
    expenseTrendPercent,
    daysSinceLastIncome,
    daysSinceLastExpense,
    alerts,
    mainInsight,
  };
}
