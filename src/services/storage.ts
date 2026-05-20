import { supabase } from "./supabase";

export async function getWallets() {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}

export async function createWallet(wallet: any) {
  const { data, error } = await supabase
    .from("wallets")
    .insert([wallet])
    .select();

  if (error) {
    console.error(error);
  }

  return data;
}

export async function deleteWallet(walletId: string) {
  const { error } = await supabase
    .from("wallets")
    .delete()
    .eq("id", walletId);

  if (error) {
    console.error(error);
  }
}

export async function getTransactions() {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}

export async function createTransaction(transaction: any) {
  const { data, error } = await supabase
    .from("transactions")
    .insert([
  {
    wallet_id: transaction.walletId,
    type: transaction.type,
    amount: transaction.amount,
    category: transaction.category,
    description: transaction.description,
    date: transaction.date,
  },
])
    .select();

  if (error) {
    console.error(error);
  }

  return data;
}

export async function deleteTransaction(transactionId: string) {
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId);

  if (error) {
    console.error(error);
  }
}

export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);

    if (item === null) return defaultValue;

    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(error);
  }
}