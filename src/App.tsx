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

import { AVATAR_COLORS } from "./utils/constants";
import { formatMoney } from "./utils/formatMoney";

import DashboardCharts from "./components/DashboardCharts";
import WalletForm from "./components/WalletForm";
import TransactionForm from "./components/TransactionForm";
import TransactionList from "./components/TransactionList";
import FinancialHealth from "./components/FinancialHealth";

import {
  History,
  LogOut,
  PiggyBank,
  Sparkles,
  Wallet as WalletIcon,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";

import { motion } from "motion/react";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState("");

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

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Erro ao recuperar sessão:", error.message);
      }

      setSession(session);

      if (session?.user) {
        const name =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email ||
          "Usuário";

        setCurrentUser(name);

        setProfile((prev) => ({
          ...prev,
          name,
        }));
      } else {
        setCurrentUser("");
      }

      setAuthLoading(false);
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      if (session?.user) {
        const name =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email ||
          "Usuário";

        setCurrentUser(name);

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
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadWallets() {
    const data = await getWallets();
    setWallets(data);
  }

  async function loadTransactions() {
    const data = await getTransactions();
    setTransactions(data);
  }

  useEffect(() => {
    if (!session?.user) return;

    loadWallets();
    loadTransactions();
  }, [session?.user?.id]);

  useEffect(() => {
    setStorageItem("pibblefinance:profile", profile);
  }, [profile]);

  const totals = useMemo(() => {
    const walletTotal = wallets.reduce(
      (acc, wallet) => acc + Number(wallet.balance || 0),
      0
    );

    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);

    const expense = transactions
      .filter((item) => item.type === "expense")
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);

    const balance = walletTotal + income - expense;

    return { income, expense, balance };
  }, [wallets, transactions]);

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error("Erro ao entrar com Google:", error.message);
    }
  }

  function handleLogin() {
    if (!userName.trim()) return;

    const trimmedName = userName.trim();

    const newProfile: UserProfile = {
      name: trimmedName,
      currency: selectedCurrency,
      avatarColor: AVATAR_COLORS[0],
      joinedAt: new Date().toISOString(),
    };

    setProfile(newProfile);
    setCurrentUser(trimmedName);
  }

  function handleSeedMockData() {
    const seededProfile: UserProfile = {
      name: "Verona Mazza",
      currency: "BRL",
      avatarColor: AVATAR_COLORS[1],
      joinedAt: new Date().toISOString(),
    };

    setProfile(seededProfile);
    setCurrentUser("Verona Mazza");
  }

  async function handleAddWallet(newWallet: Omit<Wallet, "id">) {
    await createWallet(newWallet);
    await loadWallets();
  }

  async function handleDeleteWallet(walletId: string) {
    await deleteWallet(walletId);
    await loadWallets();
    await loadTransactions();
  }

  async function handleAddTransaction(newTransaction: Omit<Transaction, "id">) {
    await createTransaction(newTransaction);
    await loadTransactions();
    await loadWallets();
  }

  async function handleDeleteTransaction(transactionId: string) {
    await deleteTransaction(transactionId);
    await loadTransactions();
    await loadWallets();
  }

  async function handleLogout() {
    setAuthLoading(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erro ao fazer logout:", error.message);
    }

    localStorage.removeItem("pibblefinance:user");
    localStorage.removeItem("pibblefinance:profile");

    setSession(null);
    setCurrentUser("");
    setWallets([]);
    setTransactions([]);
    setActiveTab("dashboard");

    setProfile({
      name: "",
      currency: "BRL",
      avatarColor: AVATAR_COLORS[0],
      joinedAt: new Date().toISOString(),
    });

    setAuthLoading(false);
  }

  function handleChangeCurrency(curr: "BRL" | "USD" | "EUR") {
    setProfile((prev) => ({
      ...prev,
      currency: curr,
    }));
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Carregando...
      </main>
    );
  }

  if (!session?.user && !currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl"
          >
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-3 rounded-2xl bg-indigo-600 p-3.5 text-white">
                <PiggyBank size={28} />
              </div>

              <h1 className="mb-2 text-4xl font-black tracking-tight text-white">
                Pibble<span className="text-indigo-400">Finance</span>
              </h1>

              <p className="text-sm text-slate-400">
                Controle suas finanças pessoais com clareza.
              </p>
            </div>

            <div className="space-y-5">
              <button
                onClick={handleGoogleLogin}
                className="w-full rounded-xl bg-white py-3.5 text-xs font-bold text-slate-900 transition hover:bg-slate-100"
              >
                Entrar com Google
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  ou modo local
                </span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  Nome do Perfil
                </label>

                <input
                  type="text"
                  placeholder="Ex: Verona"
                  value={userName}
                  onChange={(event) => setUserName(event.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  Moeda Padrão
                </label>

                <select
                  value={selectedCurrency}
                  onChange={(event) =>
                    setSelectedCurrency(
                      event.target.value as "BRL" | "USD" | "EUR"
                    )
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                >
                  <option value="BRL">R$ (BRL)</option>
                  <option value="USD">$ (USD)</option>
                  <option value="EUR">€ (EUR)</option>
                </select>
              </div>

              <button
                onClick={handleLogin}
                disabled={!userName.trim()}
                className="w-full rounded-xl bg-indigo-600 py-3.5 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Criar Novo Espaço
              </button>

              <button
                onClick={handleSeedMockData}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-700 bg-indigo-600/5 py-3 text-xs font-semibold text-indigo-400 transition hover:bg-indigo-600/10"
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
    : currentUser.charAt(0).toUpperCase() || "P";

  return (
    <main className="min-h-screen bg-mesh-radial pb-12 text-slate-800">
      <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/55 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-indigo-600 p-2.5 text-white shadow-lg">
              <PiggyBank size={20} />
            </span>

            <div>
              <span className="block text-xl font-black tracking-tight text-slate-900">
                Pibble<span className="text-indigo-600">Finance</span>
              </span>

              <span className="text-xs font-medium text-slate-500">
                Olá, {profile.name || currentUser}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={profile.currency}
              onChange={(event) =>
                handleChangeCurrency(event.target.value as "BRL" | "USD" | "EUR")
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm outline-none"
            >
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>

            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-black shadow-sm ${avatarColors}`}
            >
              {firstLetter}
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl border p-2.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1400px] px-6 pt-8">
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Saldo total
              </span>
              <WalletIcon size={18} className="text-indigo-500" />
            </div>

            <strong className="text-3xl font-black text-slate-950">
              {formatMoney(totals.balance, profile.currency)}
            </strong>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Entradas
              </span>
              <ArrowUpCircle size={18} className="text-emerald-500" />
            </div>

            <strong className="text-3xl font-black text-emerald-600">
              {formatMoney(totals.income, profile.currency)}
            </strong>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Saídas
              </span>
              <ArrowDownCircle size={18} className="text-rose-500" />
            </div>

            <strong className="text-3xl font-black text-rose-600">
              {formatMoney(totals.expense, profile.currency)}
            </strong>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`rounded-2xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "dashboard"
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-500 hover:text-slate-900"
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab("wallets")}
            className={`rounded-2xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "wallets"
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-500 hover:text-slate-900"
            }`}
          >
            Carteiras
          </button>

          <button
            onClick={() => setActiveTab("transactions")}
            className={`rounded-2xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "transactions"
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-500 hover:text-slate-900"
            }`}
          >
            Transações
          </button>
        </div>

        {activeTab === "dashboard" && (
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
            <div className="space-y-6">
              <DashboardCharts
                wallets={wallets}
                transactions={transactions}
                currency={profile.currency}
              />

              <TransactionList
                transactions={transactions}
                wallets={wallets}
                currency={profile.currency}
                onDeleteTransaction={handleDeleteTransaction}
              />
            </div>

            <div className="space-y-6">
              <FinancialHealth
                balance={totals.balance}
                income={totals.income}
                expense={totals.expense}
                currency={profile.currency}
              />

              <TransactionForm
                wallets={wallets}
                onAddTransaction={handleAddTransaction}
              />
            </div>
          </div>
        )}

        {activeTab === "wallets" && (
          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <WalletForm onAddWallet={handleAddWallet} />

            <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
              <h2 className="mb-5 text-lg font-black text-slate-950">
                Minhas carteiras
              </h2>

              <div className="grid gap-3">
                {wallets.length === 0 && (
                  <p className="text-sm text-slate-500">
                    Nenhuma carteira cadastrada ainda.
                  </p>
                )}

                {wallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4"
                  >
                    <div>
                      <strong className="block text-sm text-slate-900">
                        {wallet.name}
                      </strong>

                      <span className="text-xs text-slate-500">
                        {wallet.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <strong className="text-sm text-slate-900">
                        {formatMoney(wallet.balance, profile.currency)}
                      </strong>

                      <button
                        onClick={() => handleDeleteWallet(wallet.id)}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                      >
                        <History size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <TransactionForm
              wallets={wallets}
              onAddTransaction={handleAddTransaction}
            />

            <TransactionList
              transactions={transactions}
              wallets={wallets}
              currency={profile.currency}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </div>
        )}
      </section>
    </main>
  );
}