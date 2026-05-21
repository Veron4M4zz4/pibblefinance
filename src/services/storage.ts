import { supabase } from "./supabase";

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

  return data || [];
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

  return data;
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

  return data;
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

  return data || [];
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
    return;
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
  }
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

  if (transaction.type === "expense") {
    await updateWalletBalance(transaction.walletId, amount, "subtract");
  }

  if (transaction.type === "income") {
    await updateWalletBalance(transaction.walletId, amount, "add");
  }

  if (transaction.type === "transfer") {
    await updateWalletBalance(transaction.walletId, amount, "subtract");
    await updateWalletBalance(transaction.toWalletId, amount, "add");
  }

  return data;
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

  if (transaction.type === "expense") {
    await updateWalletBalance(transaction.wallet_id, amount, "add");
  }

  if (transaction.type === "income") {
    await updateWalletBalance(transaction.wallet_id, amount, "subtract");
  }

  if (transaction.type === "transfer") {
    await updateWalletBalance(transaction.wallet_id, amount, "add");

    if (transaction.to_wallet_id) {
      await updateWalletBalance(transaction.to_wallet_id, amount, "subtract");
    }
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