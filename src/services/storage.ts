import { supabase } from "./supabase";
import type { Wallet } from "../types";

export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);

    if (item === null) {
      return defaultValue;
    }

    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error parsing localStorage key "${key}":`, error);
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
  }
}

export async function getWallets(): Promise<Wallet[]> {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar carteiras:", error);
    return [];
  }

  return data as Wallet[];
}

export async function createWallet(wallet: Omit<Wallet, "id">) {
  const { data, error } = await supabase
    .from("wallets")
    .insert([wallet])
    .select()
    .single();

  if (error) {
    alert("Erro ao criar carteira: " + error.message);
    console.error("Erro ao criar carteira:", error);
    return null;
  }

  return data;
}

export async function deleteWallet(walletId: string) {
  const { error } = await supabase
    .from("wallets")
    .delete()
    .eq("id", walletId);

  if (error) {
    console.error("Erro ao deletar carteira:", error);
  }
}