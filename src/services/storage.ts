import { supabase } from "./supabase";
import { resolveWalletThemeClass } from "../utils/walletTheme";

function normalizeWalletRecord(wallet: any) {
  return {
    ...wallet,
    name: wallet?.name || "Carteira",
    type: wallet?.type || "checking",
    balance: Number(wallet?.balance || 0),
    color: resolveWalletThemeClass(wallet?.color, wallet?.type),
    currency: wallet?.currency || "BRL",
  };
}

function normalizeTransactionRecord(transaction: any) {
  return {
    ...transaction,
    walletId: transaction?.walletId || transaction?.wallet_id || "",
    toWalletId: transaction?.toWalletId || transaction?.to_wallet_id || "",
    description: transaction?.description || "",
    category: transaction?.category || "",
    type: transaction?.type || "expense",
    amount: Number(transaction?.amount || 0),
    date: transaction?.date || new Date().toISOString(),
  };
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error("Usuário não autenticado:", error);
    return null;
  }

  return user.id;
}

export async function getWallets() {
  const userId = await getCurrentUserId();

  if (!userId) return [];

  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return (data || []).map(normalizeWalletRecord);
}

export async function createWallet(wallet: any) {
  const userId = await getCurrentUserId();

  if (!userId) return null;

  const payload = {
    ...wallet,
    user_id: userId,
  };

  const { data, error } = await supabase
    .from("wallets")
    .insert([payload])
    .select();

  if (error) {
    console.error(error);
    return null;
  }

  return (data || []).map(normalizeWalletRecord);
}

export async function updateWallet(walletId: string, wallet: any) {
  const userId = await getCurrentUserId();

  if (!userId) return null;

  const { data, error } = await supabase
    .from("wallets")
    .update(wallet)
    .eq("id", walletId)
    .eq("user_id", userId)
    .select();

  if (error) {
    console.error(error);
    return null;
  }

  return (data || []).map(normalizeWalletRecord);
}

export async function deleteWallet(walletId: string) {
  const userId = await getCurrentUserId();

  if (!userId) return;

  const { error } = await supabase
    .from("wallets")
    .delete()
    .eq("id", walletId)
    .eq("user_id", userId);

  if (error) {
    console.error(error);
  }
}

export async function getTransactions() {
  const userId = await getCurrentUserId();

  if (!userId) return [];

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return (data || []).map(normalizeTransactionRecord);
}

async function updateWalletBalance(
  walletId: string,
  amount: number,
  operation: "add" | "subtract"
) {
  const userId = await getCurrentUserId();

  if (!userId) return;

  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("balance")
    .eq("id", walletId)
    .eq("user_id", userId)
    .single();

  if (walletError) {
    console.error(walletError);
    return null;
  }

  const currentBalance = Number(wallet?.balance || 0);

  const newBalance =
    operation === "add" ? currentBalance + amount : currentBalance - amount;

  const { error: updateError } = await supabase
    .from("wallets")
    .update({ balance: newBalance })
    .eq("id", walletId)
    .eq("user_id", userId);

  if (updateError) {
    console.error(updateError);
    return null;
  }

  return {
    walletId,
    balance: newBalance,
  };
}

export async function createTransaction(transaction: any) {
  const userId = await getCurrentUserId();

  if (!userId) return null;

  const transactionPayload: any = {
    user_id: userId,
    wallet_id: transaction.walletId,
    type: transaction.type,
    amount: Number(transaction.amount || 0),
    category: transaction.category,
    description: transaction.description,
    date: transaction.date,
  };

  if (transaction.type === "transfer") {
    transactionPayload.to_wallet_id = transaction.toWalletId;
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert([transactionPayload])
    .select();

  if (error) {
    console.error(error);
    return null;
  }

  const amount = Number(transaction.amount || 0);
  const walletUpdates: Array<{ walletId: string; balance: number }> = [];

  if (transaction.type === "expense") {
    const update = await updateWalletBalance(
      transaction.walletId,
      amount,
      "subtract"
    );

    if (update) walletUpdates.push(update);
  }

  if (transaction.type === "income") {
    const update = await updateWalletBalance(
      transaction.walletId,
      amount,
      "add"
    );

    if (update) walletUpdates.push(update);
  }

  if (transaction.type === "transfer") {
    const sourceUpdate = await updateWalletBalance(
      transaction.walletId,
      amount,
      "subtract"
    );
    const targetUpdate = await updateWalletBalance(
      transaction.toWalletId,
      amount,
      "add"
    );

    if (sourceUpdate) walletUpdates.push(sourceUpdate);
    if (targetUpdate) walletUpdates.push(targetUpdate);
  }

  return {
    transactions: (data || []).map(normalizeTransactionRecord),
    walletUpdates,
  };
}

export async function deleteTransaction(transactionId: string) {
  const userId = await getCurrentUserId();

  if (!userId) return;

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .select("wallet_id, to_wallet_id, type, amount")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .single();

  if (transactionError) {
    console.error(transactionError);
    return;
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("user_id", userId);

  if (error) {
    console.error(error);
    return;
  }

  const amount = Number(transaction?.amount || 0);
  const walletUpdates: Array<{ walletId: string; balance: number }> = [];

  if (transaction.type === "expense") {
    const update = await updateWalletBalance(
      transaction.wallet_id,
      amount,
      "add"
    );

    if (update) walletUpdates.push(update);
  }

  if (transaction.type === "income") {
    const update = await updateWalletBalance(
      transaction.wallet_id,
      amount,
      "subtract"
    );

    if (update) walletUpdates.push(update);
  }

  if (transaction.type === "transfer") {
    const sourceUpdate = await updateWalletBalance(
      transaction.wallet_id,
      amount,
      "add"
    );

    if (transaction.to_wallet_id) {
      const targetUpdate = await updateWalletBalance(
        transaction.to_wallet_id,
        amount,
        "subtract"
      );

      if (targetUpdate) walletUpdates.push(targetUpdate);
    }

    if (sourceUpdate) walletUpdates.push(sourceUpdate);
  }

  return {
    walletUpdates,
  };
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
