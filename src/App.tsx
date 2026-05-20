import { useState, useEffect, useMemo } from "react";
import type { Session } from "@supabase/supabase-js";

import { Wallet, Transaction, UserProfile } from "./types";
import { supabase } from "./services/supabase";

import {
  getStorageItem,
  setStorageItem,
  getWallets,
  createWallet,
  deleteWallet,
  getTransactions,
  createTransaction,
  deleteTransaction,
} from "./services/storage";

import { PRESET_CATEGORIES, AVATAR_COLORS } from "./utils/constants";
import { formatMoney } from "./utils/formatMoney";

import DashboardCharts from "./components/DashboardCharts";
import WalletForm from "./components/WalletForm";
import TransactionForm from "./components/TransactionForm";
import TransactionList from "./components/TransactionList";
import FinancialHealth from "./components/FinancialHealth";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  LogOut,
  PiggyBank,
  Sparkles,
  Trash2,
} from "lucide-react";

import { AnimatePresence, motion } from "motion/react";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState(
    () => localStorage.getItem("pibblefinance:user") || ""
  );

  const [profile, setProfile] = useState<UserProfile>(() =>
    getStorageItem("pibblefinance:profile", {
      name: "",
      currency: "BRL",
      avatarColor: AVATAR_COLORS[0],
      joinedAt: new Date().toISOString(),
    })
  );

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "wallets" | "transactions"
  >("dashboard");

  const [userName, setUserName] = useState("");

  const [selectedCurrency, setSelectedCurrency] = useState<
    "BRL" | "USD" | "EUR"
  >("BRL");

  // AUTH
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;

      setSession(session);

      if (session?.user) {
        const user = session.user;

        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "Usuário";

        setCurrentUser(name);

        localStorage.setItem("pibblefinance:user", name);

        setProfile((prev) => ({
          ...prev,
          name,
        }));
      }

      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      if (session?.user) {
        const user = session.user;

        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "Usuário";

        setCurrentUser(name);

        localStorage.setItem("pibblefinance:user", name);

        setProfile((prev) => ({
          ...prev,
          name,
        }));
      } else {
        setCurrentUser("");
      }

      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // LOAD DATA
  async function loadWallets() {
    const data = await getWallets();
    setWallets(data);
  }

  async function loadTransactions() {
    const data = await getTransactions();
    setTransactions(data);
  }

  useEffect(() => {
    loadWallets();
    loadTransactions();
  }, []);

  useEffect(() => {
    setStorageItem("pibblefinance:profile", profile);
  }, [profile]);

  // TOTALS
  const totals = useMemo(() => {
    const walletTotal = wallets.reduce(
      (acc, wallet) => acc + wallet.balance,
      0
    );

    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((acc, item) => acc + item.amount, 0);

    const expense = transactions
      .filter((item) => item.type === "expense")
      .reduce((acc, item) => acc + item.amount, 0);

    const balance = walletTotal + income - expense;

    return { income, expense, balance };
  }, [wallets, transactions]);

  // GOOGLE LOGIN
  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  }

  // LOCAL LOGIN
  function handleLogin() {
    if (!userName.trim()) return;

    const trimmedName = userName.trim();

    localStorage.setItem("pibblefinance:user", trimmedName);

    const newProfile: UserProfile = {
      name: trimmedName,
      currency: selectedCurrency,
      avatarColor: AVATAR_COLORS[0],
      joinedAt: new Date().toISOString(),
    };

    setProfile(newProfile);
    setCurrentUser(trimmedName);
  }

  // DEMO
  function handleSeedMockData() {
    const seededProfile: UserProfile = {
      name: "Verona Mazza",
      currency: "BRL",
      avatarColor: AVATAR_COLORS[1],
      joinedAt: new Date().toISOString(),
    };

    setProfile(seededProfile);
    setCurrentUser("Verona Mazza");

    localStorage.setItem("pibblefinance:user", "Verona Mazza");
  }

  // WALLET
  async function handleAddWallet(newWallet: Omit<Wallet, "id">) {
    await createWallet(newWallet);
    await loadWallets();
  }

  async function handleDeleteWallet(walletId: string) {
    await deleteWallet(walletId);
    await loadWallets();
    await loadTransactions();
  }

  // TRANSACTION
  async function handleAddTransaction(
    newTransaction: Omit<Transaction, "id">
  ) {
    await createTransaction(newTransaction);
    await loadTransactions();
    await loadWallets();
  }

  async function handleDeleteTransaction(transactionId: string) {
    await deleteTransaction(transactionId);
    await loadTransactions();
    await loadWallets();
  }

  // LOGOUT
  async function handleLogout() {
    await supabase.auth.signOut();

    localStorage.removeItem("pibblefinance:user");
    localStorage.removeItem("pibblefinance:profile");

    setSession(null);
    setCurrentUser("");
    setWallets([]);
    setTransactions([]);

    setProfile({
      name: "",
      currency: "BRL",
      avatarColor: AVATAR_COLORS[0],
      joinedAt: new Date().toISOString(),
    });

    setActiveTab("dashboard");
  }

  // CURRENCY
  function handleChangeCurrency(curr: "BRL" | "USD" | "EUR") {
    const updatedProfile = {
      ...profile,
      currency: curr,
    };

    setProfile(updatedProfile);
  }

  // LOADING
  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Carregando...
      </main>
    );
  }

  // LOGIN SCREEN
  if (!session && !currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl"
          >
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-3 rounded-2xl bg-indigo-600 p-3.5 text-white">
                <PiggyBank size={28} />
              </div>

              <h1 className="text-4xl font-black tracking-tight text-white mb-2">
                Pibble<span className="text-indigo-400">Finance</span>
              </h1>

              <p className="text-slate-400 text-sm">
                Controle suas finanças pessoais com clareza.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome do Perfil
                </label>

                <input
                  type="text"
                  placeholder="Ex: Verona"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Moeda Padrão
                </label>

                <select
                  value={selectedCurrency}
                  onChange={(e) =>
                    setSelectedCurrency(
                      e.target.value as "BRL" | "USD" | "EUR"
                    )
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white"
                >
                  <option value="BRL">R$ (BRL)</option>
                  <option value="USD">$ (USD)</option>
                  <option value="EUR">€ (EUR)</option>
                </select>
              </div>

              <button
                onClick={handleLogin}
                disabled={!userName.trim()}
                className="w-full rounded-xl bg-indigo-600 py-3.5 text-xs font-bold text-white"
              >
                Criar Novo Espaço
              </button>

              <button
                onClick={handleGoogleLogin}
                className="w-full rounded-xl bg-white py-3.5 text-xs font-bold text-slate-900"
              >
                Entrar com Google
              </button>

              <button
                onClick={handleSeedMockData}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-700 bg-indigo-600/5 py-3 text-xs font-semibold text-indigo-400"
              >
                <Sparkles size={14} />
                Entrar no Modo Demonstração
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  const avatarColors = profile.avatarColor || AVATAR_COLORS[0];
  const firstLetter = profile.name
    ? profile.name.charAt(0).toUpperCase()
    : "P";

  return (
    <main className="min-h-screen bg-mesh-radial pb-12 text-slate-800">
      <header className="sticky top-0 z-50 bg-white/55 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-indigo-600 p-2.5 text-white shadow-lg">
              <PiggyBank size={20} />
            </span>

            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 block">
                Pibble<span className="text-indigo-600">Finance</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`h-9 w-9 rounded-full flex items-center justify-center font-black border shadow-sm text-sm ${avatarColors}`}
            >
              {firstLetter}
            </div>

            <button
              onClick={handleLogout}
              className="p-2.5 border rounded-xl hover:bg-rose-50 hover:text-rose-500 text-slate-400"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
    </main>
  );
}