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
  updateWallet,
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
import CoachPibble from "./components/CoachPibble";

import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Edit3,
  LogOut,
  PiggyBank,
  Sparkles,
  Wallet as WalletIcon,
} from "lucide-react";

import { motion } from "motion/react";

function safeStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Erro ao salvar ${key}:`, error);
  }
}

function safeStorageRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Erro ao remover ${key}:`, error);
  }
}

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

  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null);
  const [editWalletName, setEditWalletName] = useState("");
  const [editWalletBalance, setEditWalletBalance] = useState("");

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "wallets" | "transactions"
  >("dashboard");

  const [userName, setUserName] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<
    "BRL" | "USD" | "EUR"
  >("BRL");
  const [walletSearch, setWalletSearch] = useState("");
  const [walletSort, setWalletSort] = useState<
    "recent" | "name" | "balance" | "type"
  >("recent");

  function syncUserFromSession(session: Session | null) {
    setSession(session);

    if (session?.user) {
      const name =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.email ||
        "Usuário";

      setCurrentUser(name);
      safeStorageSet("pibblefinance:user", name);

      setProfile((prev) => ({
        ...prev,
        name,
      }));

      return;
    }

    setCurrentUser("");
  }

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      setAuthLoading(true);

      const isOAuthCallback = window.location.pathname === "/auth/callback";
      const code = new URLSearchParams(window.location.search).get("code");

      if (isOAuthCallback && code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("Erro ao trocar code por session:", error.message);
        }

        if (!mounted) return;

        syncUserFromSession(data.session);
        window.history.replaceState({}, document.title, "/");
        setAuthLoading(false);
        return;
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Erro ao recuperar sessão:", error.message);
      }

      syncUserFromSession(session);
      setAuthLoading(false);
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUserFromSession(session);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadWallets() {
    try {
      const data = await getWallets();
      setWallets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar carteiras:", error);
      setWallets([]);
    }
  }

  async function loadTransactions() {
    try {
      const data = await getTransactions();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar transaÃ§Ãµes:", error);
      setTransactions([]);
    }
  }

  useEffect(() => {
    if (!session?.user && !currentUser) return;

    loadWallets();
    loadTransactions();
  }, [session?.user?.id, currentUser]);

  useEffect(() => {
    setStorageItem("pibblefinance:profile", profile);
  }, [profile]);

  // Trava o scroll do body quando o modal de edição estiver aberto
  useEffect(() => {
    if (editingWallet || walletToDelete) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [editingWallet, walletToDelete]);

  const totals = useMemo(() => {
    const getWalletType = (type?: string) => String(type || "").toLowerCase();

    const isCreditWallet = (wallet: Wallet) =>
      getWalletType(wallet.type) === "credit";

    const walletById = wallets.reduce<Record<string, Wallet>>((acc, wallet) => {
      acc[wallet.id] = wallet;
      return acc;
    }, {});

    const getTransactionWalletId = (transaction: any) =>
      transaction.walletId || transaction.wallet_id || "";

    const realBalance = wallets
      .filter((wallet) => !isCreditWallet(wallet))
      .reduce((acc, wallet) => acc + Number(wallet.balance || 0), 0);

    const creditAvailable = wallets
      .filter((wallet) => isCreditWallet(wallet))
      .reduce((acc, wallet) => acc + Number(wallet.balance || 0), 0);

    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);

    const realExpense = transactions
      .filter((item) => {
        const wallet = walletById[getTransactionWalletId(item)];
        return item.type === "expense" && !isCreditWallet(wallet);
      })
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);

    const creditExpense = transactions
      .filter((item) => {
        const wallet = walletById[getTransactionWalletId(item)];
        return item.type === "expense" && isCreditWallet(wallet);
      })
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);

    const expense = realExpense + creditExpense;

    return {
      income,
      expense,
      realBalance,
      creditAvailable,
      realExpense,
      creditExpense,
    };
  }, [wallets, transactions]);

  const walletOverview = useMemo(() => {
    const normalizedWallets = wallets.map((wallet, index) => ({
      ...wallet,
      name: String(wallet.name || "Carteira"),
      type: String(wallet.type || "checking"),
      balance: Number(wallet.balance || 0),
      createdAt: wallet.created_at || wallet.createdAt || "",
      updatedAt: wallet.updated_at || wallet.updatedAt || "",
      color:
        wallet.color ||
        "from-indigo-600 to-violet-800 text-white border-indigo-500",
      currency: wallet.currency || profile.currency,
      index,
    }));

    const searchTerm = walletSearch.trim().toLowerCase();

    const filtered = normalizedWallets.filter((wallet) => {
      if (!searchTerm) return true;

      const typeLabel = String(wallet.type || "").toLowerCase();

      return (
        wallet.name.toLowerCase().includes(searchTerm) ||
        typeLabel.includes(searchTerm) ||
        String(wallet.balance || 0).includes(searchTerm) ||
        String(wallet.currency || "").toLowerCase().includes(searchTerm)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      if (walletSort === "name") {
        return a.name.localeCompare(b.name, "pt-BR");
      }

      if (walletSort === "balance") {
        return Number(b.balance || 0) - Number(a.balance || 0);
      }

      if (walletSort === "type") {
        return String(a.type || "").localeCompare(String(b.type || ""), "pt-BR");
      }

      const bDate =
        new Date(String(b.updatedAt || b.createdAt || "")).getTime() || b.index;
      const aDate =
        new Date(String(a.updatedAt || a.createdAt || "")).getTime() || a.index;

      return bDate - aDate;
    });

    const totalsByType = normalizedWallets.reduce<Record<string, number>>(
      (acc, wallet) => {
        const typeKey = String(wallet.type || "checking");
        acc[typeKey] = (acc[typeKey] || 0) + Number(wallet.balance || 0);
        return acc;
      },
      {}
    );

    return {
      wallets: sorted,
      totalCount: normalizedWallets.length,
      filteredCount: sorted.length,
      totalBalance: normalizedWallets.reduce(
        (acc, wallet) => acc + Number(wallet.balance || 0),
        0
      ),
      byType: totalsByType,
    };
  }, [wallets, walletSearch, walletSort, profile.currency]);

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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

    safeStorageSet("pibblefinance:user", trimmedName);
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

    safeStorageSet("pibblefinance:user", "Verona Mazza");
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

  function handleStartEditWallet(wallet: Wallet) {
    setEditingWallet(wallet);
    setEditWalletName(wallet.name);
    setEditWalletBalance(String(wallet.balance || 0));
  }

  async function handleSaveWalletEdit() {
    if (!editingWallet || !editWalletName.trim()) return;

    await updateWallet(editingWallet.id, {
      name: editWalletName.trim(),
      balance: Number(editWalletBalance || 0),
    });

    setEditingWallet(null);
    setEditWalletName("");
    setEditWalletBalance("");

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

    safeStorageRemove("pibblefinance:user");
    safeStorageRemove("pibblefinance:profile");

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

  function getWalletTypeLabel(type?: string) {
    const normalized = String(type || "").toLowerCase();

    if (normalized === "credit") return "Crédito";
    if (normalized === "debit") return "Débito";
    if (normalized === "cash") return "Dinheiro";
    if (normalized === "savings") return "Reserva";
    if (normalized === "checking") return "Conta corrente";
    if (normalized === "investment") return "Investimento";

    return type || "Carteira";
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
              <img
                src="/logo-pibble.png"
                alt="PibbleFinance"
                className="h-10 w-10 rounded-2xl object-cover shadow-lg"
              />

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

  const googleAvatarUrl =
    session?.user?.user_metadata?.avatar_url ||
    session?.user?.user_metadata?.picture ||
    "";

  return (
    <main className="min-h-screen bg-mesh-radial pb-12 text-slate-800">
      <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/70 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo-pibble.png"
              alt="PibbleFinance"
              className="h-10 w-10 rounded-2xl object-cover shadow-lg"
            />

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
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm outline-none transition hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>

            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-indigo-200 bg-indigo-100 shadow-sm">
              {googleAvatarUrl ? (
                <img
                  src={googleAvatarUrl}
                  alt={profile.name || currentUser || "Foto do usuário"}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className={`flex h-full w-full items-center justify-center text-sm font-black ${avatarColors}`}
                >
                  {firstLetter}
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1400px] px-6 pt-8">
        <div className="mb-8 grid gap-4 lg:grid-cols-4">
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Saldo disponível
              </span>
              <WalletIcon size={18} className="text-indigo-500" />
            </div>

            <strong className="text-3xl font-black text-slate-950">
              {formatMoney(totals.realBalance, profile.currency)}
            </strong>

            <p className="mt-2 text-[11px] font-medium text-slate-400">
              Débito, conta corrente, pix, dinheiro e investimentos.
            </p>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Crédito restante
              </span>
              <WalletIcon size={18} className="text-violet-500" />
            </div>

            <strong className="text-3xl font-black text-violet-600">
              {formatMoney(totals.creditAvailable, profile.currency)}
            </strong>

            <p className="mt-2 text-[11px] font-medium text-slate-400">
              Limite disponível nas carteiras de crédito.
            </p>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Gasto no saldo
              </span>
              <ArrowDownCircle size={18} className="text-orange-500" />
            </div>

            <strong className="text-3xl font-black text-orange-600">
              {formatMoney(totals.realExpense, profile.currency)}
            </strong>

            <p className="mt-2 text-[11px] font-medium text-slate-400">
              Saídas em débito, conta corrente, pix e dinheiro.
            </p>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Gasto no crédito
              </span>
              <ArrowDownCircle size={18} className="text-rose-500" />
            </div>

            <strong className="text-3xl font-black text-rose-600">
              {formatMoney(totals.creditExpense, profile.currency)}
            </strong>

            <p className="mt-2 text-[11px] font-medium text-slate-400">
              Saídas lançadas em carteiras de crédito.
            </p>
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
              <CoachPibble
                wallets={wallets}
                transactions={transactions}
                currency={profile.currency}
              />

              <TransactionForm
                wallets={wallets}
                onAddTransaction={handleAddTransaction}
                currency={profile.currency}
              />
            </div>
          </div>
        )}

        {activeTab === "wallets" && (
          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <div className="min-w-0">
              <WalletForm
                currency={profile.currency}
                onAddWallet={handleAddWallet}
              />
            </div>

            <div className="min-h-[560px] rounded-3xl border border-white/60 bg-white/80 p-8 shadow-xl backdrop-blur-xl">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    Minhas carteiras
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Gerencie suas contas, cartões e investimentos em um só lugar.
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500">
                  {walletOverview.totalCount}{" "}
                  {walletOverview.totalCount === 1 ? "carteira" : "carteiras"}
                </span>
              </div>

              <div className="mb-6 grid gap-3 rounded-3xl border border-slate-100 bg-slate-50/70 p-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr]">
                <label className="relative block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Buscar carteira
                  </span>

                  <div className="relative">
                    <input
                      type="text"
                      value={walletSearch}
                      onChange={(event) => setWalletSearch(event.target.value)}
                      placeholder="Nome, tipo, moeda ou saldo"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-16 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />

                    {walletSearch.trim() ? (
                      <button
                        type="button"
                        onClick={() => setWalletSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition hover:bg-slate-100"
                      >
                        Limpar
                      </button>
                    ) : null}
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Ordenar por
                  </span>

                  <select
                    value={walletSort}
                    onChange={(event) =>
                      setWalletSort(
                        event.target.value as "recent" | "name" | "balance" | "type"
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  >
                    <option value="recent">Mais recentes</option>
                    <option value="name">Nome</option>
                    <option value="balance">Saldo maior</option>
                    <option value="type">Tipo</option>
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-white/70 bg-white p-3">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Exibidas
                    </span>
                    <strong className="mt-1 block text-lg font-black text-slate-950">
                      {walletOverview.filteredCount}
                    </strong>
                  </div>

                  <div className="rounded-2xl border border-white/70 bg-white p-3">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Saldo total
                    </span>
                    <strong className="mt-1 block truncate text-lg font-black text-slate-950">
                      {formatMoney(walletOverview.totalBalance, profile.currency)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="mb-6 flex flex-wrap gap-2">
                {Object.entries(walletOverview.byType)
                  .filter(([, value]) => value > 0)
                  .slice(0, 5)
                  .map(([type, value]) => (
                    <span
                      key={type}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-500"
                    >
                      {getWalletTypeLabel(type)}: {formatMoney(value, profile.currency)}
                    </span>
                  ))}
              </div>

              {walletOverview.wallets.length === 0 ? (
                <div className="flex min-h-[380px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 text-center">
                  <WalletIcon size={42} className="mb-4 text-slate-300" />

                  <strong className="text-base font-black text-slate-800">
                    {walletOverview.totalCount === 0
                      ? "Nenhuma carteira cadastrada"
                      : "Nenhuma carteira encontrada"}
                  </strong>

                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                    {walletOverview.totalCount === 0
                      ? "Cadastre sua primeira carteira para começar a acompanhar seus saldos."
                      : "Ajuste os filtros ou limpe a busca para voltar a ver suas carteiras."}
                  </p>

                  {walletOverview.totalCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setWalletSearch("");
                        setWalletSort("recent");
                      }}
                      className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100"
                    >
                      Limpar filtros
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {walletOverview.wallets.map((wallet) => (
                    <div
                      key={wallet.id}
                      className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                        wallet.color ||
                        "from-indigo-600 to-violet-800 text-white border-indigo-500"
                      }`}
                    >
                      <div className="pointer-events-none absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/15 backdrop-blur-3xl" />

                      <div className="relative mb-6 flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm backdrop-blur-md">
                          <WalletIcon size={22} />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStartEditWallet(wallet)}
                          className="rounded-xl border border-white/20 bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
                          title="Editar carteira"
                        >
                          <Edit3 size={15} />
                        </button>
                      </div>

                      <div className="relative">
                        <strong className="block truncate text-lg font-black text-white">
                          {wallet.name}
                        </strong>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/80">
                            {getWalletTypeLabel(wallet.type)}
                          </span>
                          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/80">
                            {wallet.currency || profile.currency}
                          </span>
                        </div>

                        <div className="mt-6 border-t border-white/15 pt-5">
                          <span className="block text-xs font-bold uppercase tracking-widest text-white/70">
                            Saldo atual
                          </span>

                          <strong className="mt-1 block text-3xl font-black text-white">
                            {formatMoney(
                              Number(wallet.balance || 0),
                              wallet.currency || profile.currency
                            )}
                          </strong>

                          <p className="mt-2 text-xs leading-5 text-white/70">
                            Carteira ativa para acompanhar entradas, saídas e crédito.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

    {editingWallet && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.96,
        y: 12,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
      }}
      transition={{
        duration: 0.2,
        ease: "easeOut",
      }}
      className="w-full max-w-lg rounded-3xl border border-white/20 bg-white p-6 shadow-2xl"
    >
      <div className="mb-6">
        <h3 className="text-3xl font-black tracking-tight text-slate-900">
          Editar carteira
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Atualize o nome e o saldo da carteira.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Nome da carteira
          </label>

          <input
            type="text"
            value={editWalletName}
            onChange={(event) => setEditWalletName(event.target.value)}
            className="
              w-full
              rounded-2xl
              border
              border-slate-200
              bg-slate-50
              px-4
              py-3
              text-sm
              text-slate-900
              outline-none
              transition
              focus:border-indigo-500
              focus:bg-white
            "
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Saldo atual
          </label>

          <input
            type="number"
            value={editWalletBalance}
            onChange={(event) => setEditWalletBalance(event.target.value)}
            className="
              w-full
              rounded-2xl
              border
              border-slate-200
              bg-slate-50
              px-4
              py-3
              text-sm
              text-slate-900
              outline-none
              transition
              focus:border-indigo-500
              focus:bg-white
            "
          />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (!editingWallet) return;
            setWalletToDelete(editingWallet);
          }}
          className="
            rounded-2xl
            border
            border-rose-200
            bg-rose-50
            px-4
            py-3
            text-sm
            font-bold
            text-rose-600
            transition
            hover:bg-rose-100
          "
        >
          Deletar carteira
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setEditingWallet(null);
              setEditWalletName("");
              setEditWalletBalance("");
            }}
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              px-4
              py-3
              text-sm
              font-bold
              text-slate-500
              transition
              hover:bg-slate-50
            "
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSaveWalletEdit}
            className="
              rounded-2xl
              bg-slate-950
              px-5
              py-3
              text-sm
              font-bold
              text-white
              transition
              hover:bg-slate-800
            "
          >
            Salvar alterações
          </button>
        </div>
      </div>
    </motion.div>
  </div>
)}
      {walletToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md">
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.96,
              y: 10,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            transition={{
              duration: 0.18,
              ease: "easeOut",
            }}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <AlertTriangle size={22} />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Excluir carteira
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Você está prestes a remover a carteira{" "}
                  <strong className="text-slate-900">
                    “{walletToDelete.name}”
                  </strong>.
                </p>

                <p className="mt-2 text-sm font-semibold text-rose-500">
                  Essa ação não poderá ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setWalletToDelete(null)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={async () => {
                  await handleDeleteWallet(walletToDelete.id);

                  setWalletToDelete(null);
                  setEditingWallet(null);
                  setEditWalletName("");
                  setEditWalletBalance("");
                }}
                className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-500"
              >
                Excluir carteira
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </main>
  );
}
