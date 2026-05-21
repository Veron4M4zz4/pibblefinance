import type { Transaction, Wallet } from "../types";

export type FinancialAlertTone = "success" | "warning" | "danger";

export interface FinancialInsight {
  tone: FinancialAlertTone;
  title: string;
  text: string;
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
  mainInsight: FinancialInsight;
}

function isCreditWallet(wallet?: Wallet | null) {
  return String(wallet?.type || "").toLowerCase() === "credit";
}

function getTransactionWalletId(transaction: Transaction) {
  return transaction.walletId || (transaction as any).wallet_id || "";
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

export function buildFinancialSnapshot(
  wallets: Wallet[],
  transactions: Transaction[]
): FinancialSnapshot {
  const walletById = wallets.reduce<Record<string, Wallet>>((acc, wallet) => {
    acc[wallet.id] = wallet;
    return acc;
  }, {});

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
  const netCashFlow = income - totalExpenses;

  let healthScore = 100;

  if (income === 0 && totalExpenses > 0) healthScore -= 18;
  if (income > 0 && totalExpenses > income) healthScore -= 28;
  if (creditExpenses > debitExpenses && creditExpenses > 0) healthScore -= 12;
  if (creditRemaining > 0 && creditExpenses > creditRemaining) healthScore -= 24;
  if (cashBalance < totalExpenses * 0.25 && totalExpenses > 0) healthScore -= 14;
  if (cashBalance < 0) healthScore -= 18;

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
    mainInsight,
  };
}
