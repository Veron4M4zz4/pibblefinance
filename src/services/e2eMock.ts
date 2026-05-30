import type { Session } from "@supabase/supabase-js";
import type { Transaction, Wallet } from "../types";
import { formatLocalDateInputValue, normalizeLocalDateValue } from "../utils/date";

const E2E_FLAG = "e2e";
const AUTH_KEY = "pibblefinance:e2e:auth";
const WALLETS_KEY = "pibblefinance:e2e:wallets";
const TRANSACTIONS_KEY = "pibblefinance:e2e:transactions";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function isE2EMode() {
  if (!isBrowser()) return false;

  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(E2E_FLAG) === "1" || searchParams.get(E2E_FLAG) === "true";
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function generateId() {
  if (isBrowser() && typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `e2e-${Math.random().toString(36).slice(2, 10)}`;
}

export function getE2EMockSession(): Session | null {
  return readJSON<Session | null>(AUTH_KEY, null);
}

export function setE2EMockSession(session: Session | null) {
  writeJSON(AUTH_KEY, session);
}

export function clearE2EMockSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(AUTH_KEY);
}

export function getE2EWallets(): Wallet[] {
  return readJSON<Wallet[]>(WALLETS_KEY, []);
}

export function setE2EWallets(wallets: Wallet[]) {
  writeJSON(WALLETS_KEY, wallets);
}

export function getE2ETransactions(): Transaction[] {
  return readJSON<Transaction[]>(TRANSACTIONS_KEY, []);
}

export function setE2ETransactions(transactions: Transaction[]) {
  writeJSON(TRANSACTIONS_KEY, transactions);
}

export function clearE2EWorkspace() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(WALLETS_KEY);
  window.localStorage.removeItem(TRANSACTIONS_KEY);
}

export function seedE2ESession(name = "Verona Mazza") {
  const session: Session = {
    access_token: "e2e-access-token",
    refresh_token: "e2e-refresh-token",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: {
      id: "e2e-user",
      app_metadata: {},
      user_metadata: {
        name,
        full_name: name,
        avatar_url: "",
      },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as Session["user"],
  };

  setE2EMockSession(session);
  return session;
}

export function createE2EWallet(wallet: Omit<Wallet, "id">) {
  const wallets = getE2EWallets();
  const now = new Date().toISOString();
  const nextWallet: Wallet & { createdAt: string; updatedAt: string } = {
    id: generateId(),
    ...wallet,
    balance: Number(wallet.balance || 0),
    createdAt: now,
    updatedAt: now,
  };
  wallets.unshift(nextWallet);
  setE2EWallets(wallets);
  return nextWallet;
}

export function updateE2EWallet(walletId: string, wallet: Partial<Wallet>) {
  const wallets = getE2EWallets();
  const updatedWallets = wallets.map((item: any) =>
    item.id === walletId
      ? {
          ...item,
          ...wallet,
          updatedAt: new Date().toISOString(),
        }
      : item
  );
  setE2EWallets(updatedWallets);
  return updatedWallets;
}

export function updateE2EWalletBalance(walletId: string, balance: number) {
  return updateE2EWallet(walletId, { balance });
}

export function deleteE2EWallet(walletId: string) {
  const wallets = getE2EWallets().filter((wallet) => wallet.id !== walletId);
  setE2EWallets(wallets);
  return wallets;
}

export function createE2ETransaction(transaction: Omit<Transaction, "id">) {
  const transactions = getE2ETransactions();
  const normalizedDate =
    normalizeLocalDateValue(transaction.date) || formatLocalDateInputValue();
  const nextTransaction: Transaction = {
    id: generateId(),
    ...transaction,
    amount: Number(transaction.amount || 0),
    description: transaction.description || "",
    date: normalizedDate,
    originalDate: transaction.originalDate || normalizedDate,
    editedAt: transaction.editedAt || "",
    dateEdited: Boolean(transaction.dateEdited || false),
  };
  transactions.unshift(nextTransaction);
  setE2ETransactions(transactions);
  return nextTransaction;
}

export function updateE2ETransactionDate(transactionId: string, date: string) {
  const normalizedDate = normalizeLocalDateValue(date) || formatLocalDateInputValue();
  const transactions = getE2ETransactions().map((transaction) =>
    transaction.id === transactionId
      ? {
          ...transaction,
          originalDate: transaction.originalDate || transaction.date,
          date: normalizedDate,
          dateEdited:
            transaction.dateEdited || transaction.originalDate !== normalizedDate,
          editedAt: new Date().toISOString(),
        }
      : transaction
  );

  setE2ETransactions(transactions);
  return transactions;
}

export function deleteE2ETransaction(transactionId: string) {
  const transactions = getE2ETransactions().filter(
    (transaction) => transaction.id !== transactionId
  );
  setE2ETransactions(transactions);
  return transactions;
}

export function e2eStorageKeyPrefix() {
  return {
    AUTH_KEY,
    WALLETS_KEY,
    TRANSACTIONS_KEY,
  };
}
