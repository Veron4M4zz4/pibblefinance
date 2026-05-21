/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WalletType =
  | "checking"
  | "debit"
  | "credit"
  | "cash"
  | "savings";

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  balance: number; // initial balance or baseline
  color: string; // Tailwind color class scheme (e.g., 'indigo', 'emerald', 'sky', 'rose')
  currency: 'BRL' | 'USD' | 'EUR';
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  walletId: string;
  toWalletId?: string; // only used when type is 'transfer'
  description: string;
  date: string; // ISO String
}

export interface PresetCategory {
  name: string;
  id: string;
  type: 'income' | 'expense' | 'any';
  icon: string; // Lucide icon name
  color: string; // tailwind text/bg color class prefix
}

export interface UserProfile {
  name: string;
  currency: 'BRL' | 'USD' | 'EUR';
  avatarColor: string;
  joinedAt: string;
}
