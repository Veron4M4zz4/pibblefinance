import type { Transaction, Wallet } from "../types";
import { parseLocalDateValue } from "./date";

export type FinancialAlertTone = "success" | "warning" | "danger";

export interface FinancialInsight {
  tone: FinancialAlertTone;
  title: string;
  text: string;
}

export interface FinancialAlert {
  tone: FinancialAlertTone;
  title: string;
  text: string;
  suggestion: string;
}

export interface FinancialSnapshot {
  cashBalance: number;
  creditRemaining: number;
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
  creditRemaining: number;
  income: number;
  debitExpenses: number;
  creditExpenses: number;
  totalExpenses: number;
  netCashFlow: number;
  byType: Record<string, number>;
}

export function isCreditWallet(wallet?: Wallet | null) {
  return String(wallet?.type || "").toLowerCase() === "credit";
}

export function getTransactionWalletId(transaction: Transaction) {
  return transaction.walletId || (transaction as any).wallet_id || "";
}

export function getTransactionToWalletId(transaction: Transaction) {
  return transaction.toWalletId || (transaction as any).to_wallet_id || "";
}

export function buildWalletBalanceSummary(
  wallets: Wallet[],
  transactions: Transaction[] = []
): WalletBalanceSummary {
  const walletById = wallets.reduce<Record<string, Wallet>>((acc, wallet) => {
    acc[wallet.id] = wallet;
    return acc;
  }, {});

  const totalBalance = wallets.reduce(
    (acc, wallet) => acc + Number(wallet.balance || 0),
    0
  );

  const cashBalance = wallets
    .filter((wallet) => !isCreditWallet(wallet))
    .reduce((acc, wallet) => acc + Number(wallet.balance || 0), 0);

  const creditRemaining = wallets
    .filter((wallet) => isCreditWallet(wallet))
    .reduce((acc, wallet) => acc + Number(wallet.balance || 0), 0);

  const income = transactions
    .filter((item) => item.type === "income")
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);

  const creditExpenses = transactions
    .filter((item) => {
      const wallet = walletById[getTransactionWalletId(item)];
      return item.type === "expense" && isCreditWallet(wallet);
    })
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);

  const debitExpenses = transactions
    .filter((item) => {
      const wallet = walletById[getTransactionWalletId(item)];
      return item.type === "expense" && !isCreditWallet(wallet);
    })
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);

  const totalExpenses = creditExpenses + debitExpenses;
  const byType = wallets.reduce<Record<string, number>>((acc, wallet) => {
    const typeKey = String(wallet.type || "checking");
    acc[typeKey] = (acc[typeKey] || 0) + Number(wallet.balance || 0);
    return acc;
  }, {});

  return {
    walletById,
    totalBalance,
    cashBalance,
    creditRemaining,
    income,
    debitExpenses,
    creditExpenses,
    totalExpenses,
    netCashFlow: income - totalExpenses,
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

export function buildFinancialSnapshot(
  wallets: Wallet[],
  transactions: Transaction[]
): FinancialSnapshot {
  const summary = buildWalletBalanceSummary(wallets, transactions);
  const { walletById } = summary;
  const {
    cashBalance,
    creditRemaining,
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

  let healthScore = 100;

  if (income === 0 && totalExpenses > 0) healthScore -= 18;
  if (income > 0 && totalExpenses > income) healthScore -= 28;
  if (creditExpenses > debitExpenses && creditExpenses > 0) healthScore -= 12;
  if (creditRemaining > 0 && creditExpenses > creditRemaining) healthScore -= 24;
  if (cashBalance < totalExpenses * 0.25 && totalExpenses > 0) healthScore -= 14;
  if (cashBalance < 0) healthScore -= 18;

  if (expenseTrendPercent > 15) healthScore -= 10;
  if (daysSinceLastIncome !== null && daysSinceLastIncome > 14) healthScore -= 8;

  healthScore = clamp(Math.round(healthScore), 0, 100);

  let mainInsight: FinancialInsight = {
    tone: "success",
    title: "Sua estrutura está bem organizada",
    text: "Não encontrei sinais críticos na leitura atual.",
  };

  if (income === 0 && totalExpenses > 0) {
    mainInsight = {
      tone: "danger",
      title: "Você está gastando sem renda registrada",
      text: "Registrar entradas vai deixar a leitura mais precisa e útil para decisão.",
    };
  } else if (income > 0 && totalExpenses > income) {
    mainInsight = {
      tone: "danger",
      title: "As saídas já estão acima das entradas",
      text: "Vale revisar os maiores gastos antes que o mês fique apertado.",
    };
  } else if (creditExpenses > creditRemaining && creditExpenses > 0) {
    mainInsight = {
      tone: "warning",
      title: "O cartão está carregando peso demais",
      text: "O uso do crédito está alto frente ao limite disponível.",
    };
  } else if (creditExpenses > debitExpenses && creditExpenses > 0) {
    mainInsight = {
      tone: "warning",
      title: "Grande parte das saídas está indo para o crédito",
      text: "Isso merece atenção para não virar efeito bola de neve no fechamento.",
    };
  } else if (cashBalance < totalExpenses * 0.5 && totalExpenses > 0) {
    mainInsight = {
      tone: "warning",
      title: "Sua folga de caixa está curta",
      text: "A reserva atual pode não cobrir muitas oscilações de gasto.",
    };
  } else if (expenseTrendPercent > 15) {
    mainInsight = {
      tone: "warning",
      title: "Seus gastos subiram recentemente",
      text: "Os últimos 7 dias ficaram mais caros do que o período anterior.",
    };
  }

  const alerts: FinancialAlert[] = [];

  if (creditExpenses > Math.max(creditRemaining * 0.6, totalExpenses * 0.35)) {
    alerts.push({
      tone: "danger",
      title: "Você está usando muito crédito",
      text: "Os gastos no cartão estão pesando mais do que o ideal.",
      suggestion: "Revise a fatura e evite novas parcelas por enquanto.",
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
    creditRemaining,
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
