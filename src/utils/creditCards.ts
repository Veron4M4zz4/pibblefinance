import type { Transaction, Wallet } from "../types";
import { parseLocalDateValue } from "./date";
import { normalizeMoneyNumber } from "./numbers";

const DAY_MS = 24 * 60 * 60 * 1000;

function toPositiveInteger(value?: number | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return null;

  const normalized = Math.trunc(parsed);
  if (normalized < 1 || normalized > 31) return null;

  return normalized;
}

function getWalletTransactions(wallet: Wallet, transactions: Transaction[]) {
  return transactions.filter((transaction) => {
    const transactionWalletId = transaction.walletId || (transaction as any).wallet_id || "";
    return transactionWalletId === wallet.id;
  });
}

function getCardExpenseTransactions(wallet: Wallet, transactions: Transaction[]) {
  return getWalletTransactions(wallet, transactions).filter(
    (transaction) => transaction.type === "expense"
  );
}

function getLegacyCreditAvailable(wallet?: Wallet | null) {
  return Math.max(normalizeMoneyNumber(wallet?.balance, 0), 0);
}

function getExplicitCreditLimit(wallet?: Wallet | null) {
  if (!wallet) return null;
  if (wallet.creditLimit === undefined || wallet.creditLimit === null) return null;
  const limit = normalizeMoneyNumber(wallet.creditLimit, 0);
  return Number.isFinite(limit) ? Math.max(limit, 0) : 0;
}

export function isCreditCardWallet(wallet?: Wallet | null) {
  return String(wallet?.type || "").toLowerCase() === "credit";
}

export function getCreditUsed(wallet: Wallet, transactions: Transaction[] = []) {
  if (!isCreditCardWallet(wallet)) return 0;

  return getCardExpenseTransactions(wallet, transactions).reduce(
    (acc, transaction) => acc + normalizeMoneyNumber(transaction.amount, 0),
    0
  );
}

export function getCreditLimit(wallet: Wallet, transactions: Transaction[] = []) {
  if (!isCreditCardWallet(wallet)) return 0;

  const explicitLimit = getExplicitCreditLimit(wallet);

  if (explicitLimit !== null) {
    return explicitLimit;
  }

  const used = getCreditUsed(wallet, transactions);
  return getLegacyCreditAvailable(wallet) + used;
}

export function getCreditAvailable(wallet: Wallet, transactions: Transaction[] = []) {
  if (!isCreditCardWallet(wallet)) return 0;

  const explicitLimit = getExplicitCreditLimit(wallet);

  if (explicitLimit !== null) {
    return Math.max(explicitLimit - getCreditUsed(wallet, transactions), 0);
  }

  return getLegacyCreditAvailable(wallet);
}

export function getCreditUsagePercentage(
  wallet: Wallet,
  transactions: Transaction[] = []
) {
  if (!isCreditCardWallet(wallet)) return 0;

  const limit = getCreditLimit(wallet, transactions);
  if (limit <= 0) return 0;

  return Math.min(100, Math.max(0, (getCreditUsed(wallet, transactions) / limit) * 100));
}

function createMonthlyDate(referenceDate: Date, day: number) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const maxDay = new Date(year, month + 1, 0).getDate();
  const normalizedDay = Math.min(Math.max(day, 1), maxDay);
  return new Date(year, month, normalizedDay);
}

export function getNextMonthlyOccurrence(
  day?: number | null,
  referenceDate = new Date()
) {
  const normalizedDay = toPositiveInteger(day);
  if (!normalizedDay) return null;

  const startOfToday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  let candidate = createMonthlyDate(startOfToday, normalizedDay);
  if (candidate < startOfToday) {
    candidate = createMonthlyDate(
      new Date(startOfToday.getFullYear(), startOfToday.getMonth() + 1, 1),
      normalizedDay
    );
  }

  return candidate;
}

export function getDaysUntilMonthlyDay(
  day?: number | null,
  referenceDate = new Date()
) {
  const nextOccurrence = getNextMonthlyOccurrence(day, referenceDate);
  if (!nextOccurrence) return null;

  const startOfToday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  return Math.max(0, Math.round((nextOccurrence.getTime() - startOfToday.getTime()) / DAY_MS));
}

export function getCreditInvoiceCycle(
  wallet: Wallet,
  referenceDate = new Date()
) {
  if (!isCreditCardWallet(wallet)) return null;

  const closingDay = toPositiveInteger(wallet.closingDay);
  const dueDay = toPositiveInteger(wallet.dueDay);

  if (!closingDay && !dueDay) return null;

  const nextClosingDate = getNextMonthlyOccurrence(closingDay, referenceDate);
  const nextDueDate = getNextMonthlyOccurrence(dueDay, referenceDate);

  return {
    closingDay,
    dueDay,
    nextClosingDate,
    nextDueDate,
    daysUntilClosing: getDaysUntilMonthlyDay(closingDay, referenceDate),
    daysUntilDue: getDaysUntilMonthlyDay(dueDay, referenceDate),
  };
}
