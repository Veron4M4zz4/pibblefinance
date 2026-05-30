/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PresetCategory } from '../types';

export const PRESET_CATEGORIES: PresetCategory[] = [
  // Expenses
  { id: 'food', name: 'Alimentação', type: 'expense', icon: 'Utensils', color: 'bg-emerald-500 text-white' },
  { id: 'transport', name: 'Transporte', type: 'expense', icon: 'Car', color: 'bg-blue-500 text-white' },
  { id: 'leisure', name: 'Lazer & Viagem', type: 'expense', icon: 'Sparkles', color: 'bg-pink-500 text-white' },
  { id: 'health', name: 'Saúde & Bem-estar', type: 'expense', icon: 'Heart', color: 'bg-rose-500 text-white' },
  { id: 'education', name: 'Educação', type: 'expense', icon: 'BookOpen', color: 'bg-violet-500 text-white' },
  { id: 'home', name: 'Moradia / Contas', type: 'expense', icon: 'Home', color: 'bg-amber-500 text-white' },
  { id: 'shopping', name: 'Compras / Roupas', type: 'expense', icon: 'ShoppingBag', color: 'bg-purple-500 text-white' },
  
  // Incomes
  { id: 'salary', name: 'Salário & Proventos', type: 'income', icon: 'Briefcase', color: 'bg-teal-500 text-white' },
  { id: 'investments', name: 'Rendimentos', type: 'income', icon: 'TrendingUp', color: 'bg-cyan-500 text-white' },
  { id: 'freelance', name: 'Freelance / Extra', type: 'income', icon: 'Cpu', color: 'bg-indigo-500 text-white' },
  { id: 'others_inc', name: 'Outros Recebidos', type: 'income', icon: 'DollarSign', color: 'bg-emerald-500 text-white' },
  
  // Generic
  { id: 'transfer', name: 'Transferência', type: 'any', icon: 'RefreshCw', color: 'bg-slate-500 text-white' },
  { id: 'others', name: 'Outros Gastos', type: 'expense', icon: 'Ellipsis', color: 'bg-slate-500 text-white' }
];

export const WALLET_TYPES = [
  { id: "checking", name: "Conta Corrente" },
  { id: "debit", name: "Débito" },
  { id: "credit", name: "Cartão de Crédito" },
  { id: "cash", name: "Dinheiro Físico" },
  { id: "savings", name: "Reserva de Emergência" },
  { id: "investment", name: "Investimento" },
] as const;

export const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-sky-100 text-sky-700 border-sky-200'
];
