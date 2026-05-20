/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Wallet, Transaction, UserProfile, WalletType } from './types';
import { getStorageItem, setStorageItem } from './services/storage';
import { PRESET_CATEGORIES, WALLET_TYPES, AVATAR_COLORS } from './utils/constants';
import { formatMoney } from './utils/formatMoney';

// Component imports
import DashboardCharts from './components/DashboardCharts';
import WalletForm from './components/WalletForm';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import FinancialHealth from './components/FinancialHealth';

import {
  WalletCards,
  ArrowUpCircle,
  ArrowDownCircle,
  PiggyBank,
  LogOut,
  Building2,
  RefreshCw,
  PlusCircle,
  Layers,
  Sparkles,
  DollarSign,
  Briefcase,
  History,
  Wrench,
  Trash2,
  Lock,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Main states backed up by robust localStorage handlers
  const [currentUser, setCurrentUser] = useState(() =>
    localStorage.getItem('pibblefinance:user') || ''
  );

  const [profile, setProfile] = useState<UserProfile>(() =>
    getStorageItem('pibblefinance:profile', {
      name: '',
      currency: 'BRL',
      avatarColor: AVATAR_COLORS[0],
      joinedAt: new Date().toISOString(),
    })
  );

  // Sync profile name with legacy key for complete backwards compatibility
  useEffect(() => {
    if (currentUser) {
      setProfile((prev) => ({ ...prev, name: currentUser }));
    }
  }, [currentUser]);

  const [wallets, setWallets] = useState<Wallet[]>(() =>
    getStorageItem('pibblefinance:wallets', [])
  );

  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    getStorageItem('pibblefinance:transactions', [])
  );

  // Navigation state: 'dashboard' | 'wallets' | 'transactions'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'wallets' | 'transactions'>('dashboard');

  // Input states for login flow
  const [userName, setUserName] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<'BRL' | 'USD' | 'EUR'>('BRL');
  const [selectedAvatarColorIndex, setSelectedAvatarColorIndex] = useState(0);

  // Sync state mutations back to localStorage
  useEffect(() => {
    setStorageItem('pibblefinance:wallets', wallets);
  }, [wallets]);

  useEffect(() => {
    setStorageItem('pibblefinance:transactions', transactions);
  }, [transactions]);

  useEffect(() => {
    setStorageItem('pibblefinance:profile', profile);
  }, [profile]);

  // Compute calculated values and totals
  const totals = useMemo(() => {
    // 1. Core baseline sum of all current wallets
    const walletTotal = wallets.reduce((acc, wallet) => {
      // If wallet currency differs, render baseline directly in profile preference
      return acc + wallet.balance;
    }, 0);

    // 2. Cumulative incomes
    const income = transactions
      .filter((item) => item.type === 'income')
      .reduce((acc, item) => acc + item.amount, 0);

    // 3. Cumulative expenses
    const expense = transactions
      .filter((item) => item.type === 'expense')
      .reduce((acc, item) => acc + item.amount, 0);

    // Dynamic Balance calculation representing net absolute wealth
    const balance = walletTotal + income - expense;

    return { income, expense, balance };
  }, [wallets, transactions]);

  // Handle User Registration / Profile Setup
  function handleLogin() {
    if (!userName.trim()) return;

    const trimmedName = userName.trim();
    localStorage.setItem('pibblefinance:user', trimmedName);
    
    const newProfile: UserProfile = {
      name: trimmedName,
      currency: selectedCurrency,
      avatarColor: AVATAR_COLORS[selectedAvatarColorIndex],
      joinedAt: new Date().toISOString(),
    };
    
    setProfile(newProfile);
    setCurrentUser(trimmedName);

    // Create a default Checking wallet so the dashboard doesn't start completely blank!
    setWallets([
      {
        id: crypto.randomUUID(),
        name: 'Conta Corrente',
        type: 'checking',
        balance: 1500,
        color: 'from-indigo-600 to-violet-800 text-white border-indigo-500',
        currency: selectedCurrency,
      },
    ]);
  }

  // Quick Seed Mock Function to pre-populate elegant data for immediate testing
  function handleSeedMockData() {
    const mockWallets: Wallet[] = [
      {
        id: 'w-1',
        name: 'Nubank Digital',
        type: 'checking',
        balance: 3840,
        color: 'from-indigo-600 to-violet-800 text-white border-indigo-500',
        currency: 'BRL',
      },
      {
        id: 'w-2',
        name: 'Ações & Dividendos',
        type: 'savings',
        balance: 12500,
        color: 'from-emerald-500 to-teal-700 text-white border-emerald-400',
        currency: 'BRL',
      },
      {
        id: 'w-3',
        name: 'Dinheiro na Gaveta',
        type: 'cash',
        balance: 450,
        color: 'from-amber-400 to-orange-600 text-slate-900 border-amber-300',
        currency: 'BRL',
      },
    ];

    const mockTransactions: Transaction[] = [
      {
        id: 't-1',
        type: 'income',
        amount: 6800,
        category: 'salary',
        walletId: 'w-1',
        description: 'Salário Google Inc.',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 't-2',
        type: 'expense',
        amount: 1400,
        category: 'home',
        walletId: 'w-1',
        description: 'Aluguel do Apartamento',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 't-3',
        type: 'expense',
        amount: 320,
        category: 'food',
        walletId: 'w-1',
        description: 'Supermercado Mensal',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 't-4',
        type: 'expense',
        amount: 120,
        category: 'transport',
        walletId: 'w-1',
        description: 'Combustível Carro',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 't-5',
        type: 'expense',
        amount: 85.9,
        category: 'shopping',
        walletId: 'w-1',
        description: 'Camiseta de Corrida',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 't-6',
        type: 'income',
        amount: 145.2,
        category: 'investments',
        walletId: 'w-2',
        description: 'Proventos FII - MXRF11',
        date: new Date().toISOString(),
      },
      {
        id: 't-7',
        type: 'expense',
        amount: 154,
        category: 'leisure',
        walletId: 'w-3',
        description: 'Almoço em Família',
        date: new Date().toISOString(),
      },
    ];

    setWallets(mockWallets);
    setTransactions(mockTransactions);
    
    const seededProfile: UserProfile = {
      name: 'Verona Mazza',
      currency: 'BRL',
      avatarColor: AVATAR_COLORS[1],
      joinedAt: new Date().toISOString(),
    };
    
    setProfile(seededProfile);
    setCurrentUser('Verona Mazza');
    setActiveTab('dashboard');
  }

  // Handle Wallet Addition
  function handleAddWallet(newWallet: Omit<Wallet, 'id'>) {
    const wallet: Wallet = {
      ...newWallet,
      id: crypto.randomUUID(),
    };
    setWallets([...wallets, wallet]);
  }

  // Handle Wallet Deletion (also clean cascading relationships)
  function handleDeleteWallet(walletId: string) {
    if (wallets.length <= 1) return; // prevent leaving user zero wallets
    setWallets(wallets.filter((w) => w.id !== walletId));
    // also remove transactions assigned to this specific wallet to keep ledger clean
    setTransactions(transactions.filter((t) => t.walletId !== walletId && t.toWalletId !== walletId));
  }

  // Add Transaction & reflect immediate balances
  function handleAddTransaction(newTransaction: Omit<Transaction, 'id'>) {
    // If it is a transfer, we atomic compute balance shifts between wallets
    if (newTransaction.type === 'transfer' && newTransaction.toWalletId) {
      const { walletId, toWalletId, amount } = newTransaction;
      setWallets(
        wallets.map((w) => {
          if (w.id === walletId) return { ...w, balance: w.balance - amount };
          if (w.id === toWalletId) return { ...w, balance: w.balance + amount };
          return w;
        })
      );
    } else {
      // Standard Income / Expense: adjust wallet baseline directly if they prefer, or keep it as transaction accumulation
      // Let's reflect the transactions directly on the wallet balances to make it clean and actual!
      // This is of critical importance because user expect account balances to adapt to listed items.
      const { walletId, amount, type } = newTransaction;
      setWallets(
        wallets.map((w) => {
          if (w.id === walletId) {
            const shift = type === 'income' ? amount : -amount;
            return { ...w, balance: w.balance + shift };
          }
          return w;
        })
      );
    }

    const transaction: Transaction = {
      ...newTransaction,
      id: crypto.randomUUID(),
    };

    setTransactions([transaction, ...transactions]);
  }

  // Safely delete transaction and revert associated balance adjustments
  function handleDeleteTransaction(transactionId: string) {
    const t = transactions.find((item) => item.id === transactionId);
    if (!t) return;

    if (t.type === 'transfer' && t.toWalletId) {
      // Reverse transfer shift
      setWallets(
        wallets.map((w) => {
          if (w.id === t.walletId) return { ...w, balance: w.balance + t.amount };
          if (w.id === t.toWalletId) return { ...w, balance: w.balance - t.amount };
          return w;
        })
      );
    } else {
      // Reverse standard expense / income
      setWallets(
        wallets.map((w) => {
          if (w.id === t.walletId) {
            const shift = t.type === 'income' ? -t.amount : t.amount;
            return { ...w, balance: w.balance + shift };
          }
          return w;
        })
      );
    }

    setTransactions(transactions.filter((item) => item.id !== transactionId));
  }

  // Clear all states
  function handleLogout() {
    localStorage.removeItem('pibblefinance:user');
    localStorage.removeItem('pibblefinance:wallets');
    localStorage.removeItem('pibblefinance:transactions');
    localStorage.removeItem('pibblefinance:profile');
    
    // reset component states
    setCurrentUser('');
    setWallets([]);
    setTransactions([]);
    setProfile({
      name: '',
      currency: 'BRL',
      avatarColor: AVATAR_COLORS[0],
      joinedAt: new Date().toISOString(),
    });
    setActiveTab('dashboard');
  }

  // Toggle user preference currency
  function handleChangeCurrency(curr: 'BRL' | 'USD' | 'EUR') {
    const updatedProfile = { ...profile, currency: curr };
    setProfile(updatedProfile);
    
    // update all wallets to use this primary preference for absolute consistency
    setWallets(wallets.map((w) => ({ ...w, currency: curr })));
  }

  // Display Login Flow if no profile matches
  if (!currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 bg-mesh-dark p-6 md:p-12 relative overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
        {/* Deep immersive visual elements for the login landing experience */}
        <div className="absolute top-1/10 left-1/10 h-[32rem] w-[32rem] bg-indigo-500/10 rounded-full filter blur-[120px] pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-1/10 right-1/10 h-[36rem] w-[36rem] bg-violet-600/10 rounded-full filter blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[40rem] w-[40rem] bg-teal-500/5 rounded-full filter blur-[160px] pointer-events-none" />

        <div className="w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border border-slate-800/80 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-2xl relative glow-dark glass-panel-dark"
          >
            {/* Glowing active banner borders */}
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-505/50 to-transparent" />
            
            {/* Upper logo group */}
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-3.5 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 p-3.5 text-white shadow-xl shadow-indigo-600/30 ring-1 ring-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <PiggyBank size={28} className="relative z-10" />
              </div>
              <h1 className="font-display text-4xl font-black tracking-tight text-white mb-2">
                Pibble<span className="text-indigo-400">Finance</span>
              </h1>
              <p className="text-slate-400 text-xs md:text-sm max-w-sm px-2">A forma mais limpa, rápida e inteligente de controlar suas finanças pessoais.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nome do Perfil</label>
                <input
                  type="text"
                  placeholder="Seu nome ou apelido (Ex: Verona)"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Moeda Padrão</label>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value as 'BRL' | 'USD' | 'EUR')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-3 text-sm text-slate-200 focus:border-indigo-500 focus:outline-hidden transition-all"
                  >
                    <option value="BRL">R$ (BRL)</option>
                    <option value="USD">$ (USD)</option>
                    <option value="EUR">€ (EUR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-medium">Avatar</label>
                  <div className="flex items-center gap-1.5 bg-slate-950/85 p-1 px-2 rounded-xl border border-slate-800/80 h-[46px] overflow-x-auto">
                    {AVATAR_COLORS.slice(0, 5).map((colorClass, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedAvatarColorIndex(index)}
                        className={`h-5 w-5 rounded-full shrink-0 border transition-all ${
                          colorClass.split(' ')[0]
                        } ${
                          selectedAvatarColorIndex === index
                            ? 'ring-2 ring-indigo-505 border-white scale-110'
                            : 'border-transparent opacity-75'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Action grid layout */}
              <div className="space-y-3 pt-4">
                <button
                  onClick={handleLogin}
                  disabled={!userName.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/15 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none transition-all cursor-pointer"
                >
                  Criar Novo Espaço
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-800"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase font-black tracking-widest">Ou Testar</span>
                  <div className="flex-grow border-t border-slate-800"></div>
                </div>

                <button
                  onClick={handleSeedMockData}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-700/60 bg-indigo-600/5 py-3 text-xs font-semibold text-indigo-400 hover:bg-indigo-600/10 hover:border-indigo-500 transition-all cursor-pointer"
                >
                  <Sparkles size={14} className="animate-spin-slow" />
                  Entrar no Modo Demonstração (Seed)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  // Default colors array split helper for styling custom avatar rings
  const avatarColors = profile.avatarColor || AVATAR_COLORS[0];
  const firstLetter = profile.name ? profile.name.charAt(0).toUpperCase() : 'P';

  return (
    <main className="min-h-screen bg-mesh-radial pb-12 text-slate-800 antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Visual Top Navigation Hub */}
      <header className="sticky top-0 z-50 bg-white/55 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4 transition-all duration-300">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-indigo-600 p-2.5 text-white flex items-center justify-center shadow-lg shadow-indigo-500/15 group hover:rotate-6 transition-transform">
              <PiggyBank size={20} className="group-hover:scale-110 transition-transform" />
            </span>
            <div>
              <span className="font-display text-xl font-black tracking-tight text-slate-900 block leading-tight">
                Pibble<span className="text-indigo-600">Finance</span>
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Finanças Pessoais</span>
            </div>
          </div>

          {/* Nav Controls with refined pill styling */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 p-1 rounded-2xl border border-slate-200/30">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white text-indigo-700 shadow-md shadow-indigo-100/50 scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-950 hover:bg-white/40'
              }`}
            >
              Resumo Geral
            </button>
            <button
              onClick={() => setActiveTab('wallets')}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'wallets'
                  ? 'bg-white text-indigo-700 shadow-md shadow-indigo-100/50 scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-950 hover:bg-white/40'
              }`}
            >
              Minhas Carteiras
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-white text-indigo-700 shadow-md shadow-indigo-100/50 scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-950 hover:bg-white/40'
              }`}
            >
              Extrato Completo
            </button>
          </nav>

          {/* Profile controls */}
          <div className="flex items-center gap-3">
            {/* Currency toggle selection */}
            <div className="flex rounded-xl border border-slate-200/80 bg-slate-50/50 p-0.5 text-xs text-slate-500">
              {(['BRL', 'USD', 'EUR'] as const).map((curr) => (
                <button
                  key={curr}
                  onClick={() => handleChangeCurrency(curr)}
                  className={`px-2.5 py-1.5 rounded-lg cursor-pointer font-extrabold transition-all text-[11px] ${
                    profile.currency === curr ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900 hover:bg-white/30'
                  }`}
                >
                  {curr === 'BRL' ? 'R$' : curr === 'USD' ? '$' : '€'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className={`h-9.5 w-9.5 rounded-full flex items-center justify-center font-display font-extrabold border shadow-sm text-sm shrink-0 transition-transform hover:scale-105 ${avatarColors}`}>
                {firstLetter}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-black text-slate-800 max-w-[120px] truncate leading-none">
                  {profile.name}
                </p>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Conta Ativa</span>
              </div>
            </div>

            {/* Logout shortcut */}
            <button
              onClick={handleLogout}
              className="p-2.5 border border-slate-250/20 rounded-xl hover:bg-rose-50 hover:text-rose-500 text-slate-400 cursor-pointer transition-colors"
              title="Sair do Perfil"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Dynamic Mobiles Nav selectors bar */}
      <div className="md:hidden bg-white border-b border-slate-100 p-2 flex justify-around">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'
          }`}
        >
          Resumo
        </button>
        <button
          onClick={() => setActiveTab('wallets')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'wallets' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'
          }`}
        >
          Carteiras
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'transactions' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'
          }`}
        >
          Extrato
        </button>
      </div>

      {/* Primary Container layout */}
      <section className="mx-auto max-w-[1400px] px-6 py-6 md:py-8">
        
        {/* Upper Dashboard stats panel (Quick insights) */}
        <AnimatePresence mode="wait">
          <motion.section
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            key="stats-panel"
            className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {/* Totals wealth Card */}
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-white shadow-xl relative overflow-hidden h-[130px] flex flex-col justify-between glow-indigo transition-all duration-300 hover:scale-[1.01] group">
              <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/20 rounded-full -mr-4 -mt-4 filter blur-2xl group-hover:scale-110 transition-transform duration-500" />
              <div className="flex justify-between items-start relative z-10">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Patrimônio Líquido</span>
                <span className="p-1.5 bg-white/10 rounded-lg text-indigo-300 ring-1 ring-white/10">
                  <WalletCards size={16} />
                </span>
              </div>
              <div className="relative z-10">
                <strong className="block font-mono text-2xl font-black tracking-tight">
                  {formatMoney(totals.balance, profile.currency)}
                </strong>
                <p className="text-[10px] text-slate-400 font-bold mt-1 leading-none">Saldo total consolidado nas contas</p>
              </div>
            </div>

            {/* Total Incomes Card */}
            <div className="rounded-3xl border border-slate-200/50 bg-white/70 backdrop-blur-md p-6 shadow-sm h-[130px] flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-md group">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Recebido</span>
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg ring-1 ring-emerald-100 group-hover:scale-110 transition-transform">
                  <ArrowUpCircle size={16} />
                </span>
              </div>
              <div>
                <strong className="block font-mono text-2xl font-black tracking-tight text-slate-900">
                  {formatMoney(totals.income, profile.currency)}
                </strong>
                <p className="text-[10px] text-slate-400 font-bold mt-1 leading-none">Acúmulo de receitas registradas</p>
              </div>
            </div>

            {/* Total Expenses Card */}
            <div className="rounded-3xl border border-slate-200/50 bg-white/70 backdrop-blur-md p-6 shadow-sm h-[130px] flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-md group">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Pago</span>
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg ring-1 ring-rose-100 group-hover:scale-110 transition-transform">
                  <ArrowDownCircle size={16} />
                </span>
              </div>
              <div>
                <strong className="block font-mono text-xl md:text-2xl font-black tracking-tight text-slate-900">
                  {formatMoney(totals.expense, profile.currency)}
                </strong>
                <p className="text-[10px] text-slate-400 font-bold mt-1 leading-none">Acúmulo de saídas faturadas</p>
              </div>
            </div>

            {/* Action Coaching widget */}
            <FinancialHealth
              income={totals.income}
              expense={totals.expense}
              balance={totals.balance}
            />
          </motion.section>
        </AnimatePresence>

        {/* Dynamic Views Manager */}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="view-dahsboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Analytics visual block with Quick-record shortcut beside it */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
                <div className="lg:col-span-8">
                  <DashboardCharts
                    transactions={transactions}
                    wallets={wallets}
                    currency={profile.currency}
                  />
                </div>
                
                <div className="lg:col-span-4">
                  <TransactionForm
                    wallets={wallets}
                    onAddTransaction={handleAddTransaction}
                    currency={profile.currency}
                  />
                </div>
              </div>

              {/* Lower segment: Small assets overview and last items registered */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
                {/* Visual Wallet shortcuts widget */}
                <div className="rounded-3xl border border-slate-200/50 bg-white/70 backdrop-blur-md p-6 shadow-sm hover:shadow-md transition-all duration-300 lg:col-span-12 lg:col-span-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/[0.02] rounded-full filter blur-xl group-hover:bg-indigo-500/[0.04] transition-colors pointer-events-none" />
                  <div className="mb-4 flex items-center justify-between relative z-10">
                    <div>
                      <h4 className="font-display font-black text-slate-900 text-sm">Contas rápidas</h4>
                      <p className="text-[10px] text-slate-400 font-bold">Atalhos rápidos para contas de faturamento</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('wallets')}
                      className="text-[10px] text-indigo-600 font-extrabold hover:underline cursor-pointer"
                    >
                      Gerenciar novas
                    </button>
                  </div>
                  
                  <div className="space-y-2.5 max-h-[200px] overflow-y-auto relative z-10">
                    {wallets.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Sem carteiras vinculadas.</p>
                    ) : (
                      wallets.map((w) => (
                        <div
                          key={w.id}
                          className="flex items-center justify-between p-3 bg-white/60 hover:bg-white/94 rounded-2xl border border-slate-100 shadow-3xs transition-all duration-205 hover:scale-[1.01] text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-tr ${w.color} shadow-xs`} />
                            <span className="font-bold text-slate-800">{w.name}</span>
                          </div>
                          <span className="font-mono font-black text-slate-900">
                            {formatMoney(w.balance, w.currency)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Ledger Quick-view */}
                <div className="rounded-3xl border border-slate-200/50 bg-white/70 backdrop-blur-md p-6 shadow-sm hover:shadow-md transition-all duration-300 lg:col-span-12 lg:col-span-7 relative overflow-hidden group">
                  <div className="absolute bottom-0 left-0 h-24 w-24 bg-teal-500/[0.01] rounded-full filter blur-xl group-hover:bg-teal-500/[0.03] transition-colors pointer-events-none" />
                  <div className="mb-4 flex items-center justify-between relative z-10">
                    <div>
                      <h4 className="font-display font-black text-slate-900 text-sm flex items-center gap-1.5">
                        <History size={14} className="text-indigo-500 animate-pulse" />
                        Lançamentos Recentes
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold">Últimos movimentos inseridos no extrato consolidado</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="text-[10px] text-indigo-600 font-extrabold hover:underline cursor-pointer"
                    >
                      Extrato completo
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[200px] overflow-y-auto relative z-10">
                    {transactions.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        Nenhuma movimentação faturada ainda.
                      </div>
                    ) : (
                      transactions.slice(0, 4).map((t) => {
                        const categoryObj = PRESET_CATEGORIES.find((cat) => cat.id === t.category);
                        const catLabel = categoryObj ? categoryObj.name : t.category;
                        return (
                          <div
                            key={t.id}
                            className="flex items-center justify-between p-3 bg-white/50 hover:bg-white/94 rounded-2xl border border-slate-100 text-xs transition-all duration-205 hover:scale-[1.005]"
                          >
                            <div>
                              <strong className="text-slate-800 font-bold">{t.description || catLabel}</strong>
                              <p className="text-[10px] text-slate-400 font-bold">Classificado como {catLabel}</p>
                            </div>
                            
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`font-mono font-black ${
                                  t.type === 'income'
                                    ? 'text-emerald-600'
                                    : t.type === 'expense'
                                    ? 'text-rose-600'
                                    : 'text-blue-600'
                                }`}
                              >
                                {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : '⇄'}
                                {formatMoney(t.amount, profile.currency)}
                              </span>
                              
                              <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="text-slate-350 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'wallets' && (
            <motion.div
              key="view-wallets"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <WalletForm
                wallets={wallets}
                onAddWallet={handleAddWallet}
                onDeleteWallet={handleDeleteWallet}
                currency={profile.currency}
              />
            </motion.div>
          )}

          {activeTab === 'transactions' && (
            <motion.div
              key="view-transactions"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <TransactionList
                transactions={transactions}
                wallets={wallets}
                onDeleteTransaction={handleDeleteTransaction}
                currency={profile.currency}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </section>
    </main>
  );
}
