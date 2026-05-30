import { useCallback, useState, useEffect, useMemo } from "react";
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
  updateTransactionDate,
  deleteTransaction,
} from "./services/storage";

import { AVATAR_COLORS } from "./utils/constants";
import { formatMoney } from "./utils/formatMoney";
import {
  buildFinancialSnapshot,
  buildWalletBalanceSummary,
} from "./utils/financialSnapshot";
import { parseLocalDateValue } from "./utils/date";
import WalletColorPicker from "./components/WalletColorPicker";
import {
  getWalletColorIndex,
  getWalletColorPreset,
} from "./utils/walletColors";
import {
  resolveWalletAccentClass,
  resolveWalletThemeClass,
} from "./utils/walletTheme";

import CommandCenterDashboard from "./components/CommandCenterDashboard";
import WalletForm from "./components/WalletForm";
import TransactionForm from "./components/TransactionForm";
import TransactionList from "./components/TransactionList";

import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Edit3,
  Clock3,
  LogOut,
  PiggyBank,
  Sparkles,
  RefreshCw,
  SunMedium,
  MoonStar,
  House,
  Wallet as WalletNavIcon,
  ArrowLeftRight,
  Bot,
  UserRound,
  Wallet as WalletIcon,
} from "lucide-react";

import { motion } from "motion/react";
import { useTheme } from "./context/ThemeProvider";

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

function getRelativeTimeLabel(isoDate?: string | null) {
  if (!isoDate) return "nunca";

  const timestamp = new Date(isoDate).getTime();

  if (Number.isNaN(timestamp)) return "agora";

  const diffMinutes = Math.max(
    0,
    Math.round((Date.now() - timestamp) / 60000)
  );

  if (diffMinutes < 1) return "agora";
  if (diffMinutes === 1) return "há 1 min";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours === 1) return "há 1 h";
  if (diffHours < 24) return `há ${diffHours} h`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "há 1 dia";
  return `há ${diffDays} dias`;
}

export default function App() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isLightTheme = resolvedTheme === "light";
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState("");
  const [authStatus, setAuthStatus] = useState<{
    type: "idle" | "loading" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const [isGoogleLoginLoading, setIsGoogleLoginLoading] = useState(false);

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
  const [editWalletColorIndex, setEditWalletColorIndex] = useState(1);
  const [editWalletStatus, setEditWalletStatus] = useState<{
    type: "idle" | "saving" | "saved";
    message: string;
  }>({ type: "idle", message: "" });

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "wallets" | "transactions"
  >("dashboard");
  const [mobileTab, setMobileTab] = useState<
    "home" | "wallets" | "transactions" | "coach" | "profile"
  >("home");

  const [userName, setUserName] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<
    "BRL" | "USD" | "EUR"
  >("BRL");
  const [walletSearch, setWalletSearch] = useState("");
  const [walletSort, setWalletSort] = useState<
    "recent" | "name" | "balance" | "type"
  >("recent");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  type WalletOverviewItem = Wallet & {
    createdAt: string;
    updatedAt: string;
    index: number;
  };
  type WalletBalanceUpdate = {
    walletId: string;
    balance: number;
  };

  function applyWalletBalanceUpdates(
    currentWallets: Wallet[],
    updates: WalletBalanceUpdate[]
  ) {
    if (updates.length === 0) return currentWallets;

    const updatesById = updates.reduce<Record<string, number>>((acc, update) => {
      acc[update.walletId] = update.balance;
      return acc;
    }, {});

    return currentWallets.map((wallet) =>
      Object.prototype.hasOwnProperty.call(updatesById, wallet.id)
        ? {
            ...wallet,
            balance: updatesById[wallet.id],
          }
        : wallet
    );
  }

  function applyTransactionBalanceFallback(
    currentWallets: Wallet[],
    transaction: Pick<
      Transaction,
      "type" | "amount" | "walletId" | "toWalletId"
    >,
    direction: "add" | "delete",
    skipWalletIds: string[] = []
  ) {
    const amount = Number(transaction.amount || 0);
    if (!amount) return currentWallets;

    const delta = direction === "add" ? 1 : -1;
    const skippedIds = new Set(skipWalletIds);

    return currentWallets.map((wallet) => {
      if (skippedIds.has(wallet.id)) {
        return wallet;
      }

      let nextBalance = Number(wallet.balance || 0);
      let changed = false;

      if (wallet.id === transaction.walletId) {
        if (transaction.type === "expense") {
          nextBalance -= amount * delta;
          changed = true;
        }

        if (transaction.type === "income") {
          nextBalance += amount * delta;
          changed = true;
        }

        if (transaction.type === "transfer") {
          nextBalance -= amount * delta;
          changed = true;
        }
      }

      if (
        transaction.type === "transfer" &&
        transaction.toWalletId &&
        wallet.id === transaction.toWalletId
      ) {
        nextBalance += amount * delta;
        changed = true;
      }

      return changed ? { ...wallet, balance: nextBalance } : wallet;
    });
  }

  function syncUserFromSession(session: Session | null) {
    setSession(session);

    if (session?.user) {
      setIsGoogleLoginLoading(false);
      setAuthStatus({ type: "idle", message: "" });
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
    setIsGoogleLoginLoading(false);
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

  const refreshWorkspace = useCallback(async () => {
    if (!session?.user && !currentUser) return;

    setIsRefreshing(true);

    try {
      await Promise.all([loadWallets(), loadTransactions()]);
      setLastSyncAt(new Date().toISOString());
    } catch (error) {
      console.error("Erro ao atualizar a tela:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [session?.user?.id, currentUser]);

  useEffect(() => {
    if (!session?.user && !currentUser) return;

    let cancelled = false;

    const syncNow = async () => {
      if (cancelled) return;
      await refreshWorkspace();
    };

    syncNow();

    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        syncNow();
      }
    }, 45000);

    const handleFocus = () => {
      syncNow();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncNow();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session?.user?.id, currentUser, refreshWorkspace]);

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

  const totals = useMemo(
    () => buildFinancialSnapshot(wallets, transactions),
    [wallets, transactions]
  );

  const walletOverview = useMemo(() => {
    const normalizedWallets: WalletOverviewItem[] = wallets.map(
      (wallet, index) => {
        const normalized = wallet as Wallet & {
          created_at?: string;
          createdAt?: string;
          updated_at?: string;
          updatedAt?: string;
        };

        return {
          ...wallet,
          name: String(wallet.name || "Carteira"),
          type: (wallet.type || "checking") as Wallet["type"],
          balance: Number(wallet.balance || 0),
          createdAt: normalized.created_at || normalized.createdAt || "",
          updatedAt: normalized.updated_at || normalized.updatedAt || "",
          color: resolveWalletThemeClass(wallet.color, wallet.type),
          currency: wallet.currency || profile.currency,
          index,
        };
      }
    );
    const balanceSummary = buildWalletBalanceSummary(wallets, transactions);

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

    return {
      wallets: sorted,
      totalCount: normalizedWallets.length,
      filteredCount: sorted.length,
      totalBalance: balanceSummary.totalBalance,
      byType: balanceSummary.byType,
    };
  }, [wallets, transactions, walletSearch, walletSort, profile.currency]);

  async function handleGoogleLogin() {
    setAuthStatus({ type: "loading", message: "Abrindo login com Google..." });
    setIsGoogleLoginLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("Erro ao entrar com Google:", error.message);
      setIsGoogleLoginLoading(false);
      setAuthStatus({
        type: "error",
        message:
          "Não foi possível entrar com Google agora. Verifique sua conexão e tente novamente.",
      });
      return;
    }
  }

  function handleLogin() {
    if (!userName.trim()) return;

    setAuthStatus({ type: "idle", message: "" });
    setIsGoogleLoginLoading(false);

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
    setAuthStatus({ type: "idle", message: "" });
    setIsGoogleLoginLoading(false);

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
    setEditWalletColorIndex(getWalletColorIndex(wallet.color, wallet.type));
    setEditWalletStatus({ type: "idle", message: "" });
  }

  function closeWalletEditor() {
    setEditingWallet(null);
    setEditWalletName("");
    setEditWalletBalance("");
    setEditWalletColorIndex(1);
    setEditWalletStatus({ type: "idle", message: "" });
  }

  async function handleSaveWalletEdit() {
    if (!editingWallet || !editWalletName.trim()) return;

    setEditWalletStatus({ type: "saving", message: "Salvando alterações..." });
    const safeColor =
      getWalletColorPreset(editWalletColorIndex).className ||
      getWalletColorPreset(1).className;

    const updatedWallets = await updateWallet(editingWallet.id, {
      name: editWalletName.trim(),
      balance: Number(editWalletBalance || 0),
      color: safeColor,
    });

    if (!updatedWallets) {
      setEditWalletStatus({
        type: "idle",
        message: "Não foi possível salvar a carteira agora.",
      });
      return;
    }

    setEditWalletStatus({
      type: "saved",
      message: "Cor da carteira atualizada com sucesso.",
    });

    window.setTimeout(() => {
      closeWalletEditor();
    }, 900);

    await loadWallets();
    await loadTransactions();
  }

  async function handleAddTransaction(newTransaction: Omit<Transaction, "id">) {
    const result = await createTransaction(newTransaction);
    await loadTransactions();
    await loadWallets();

    if (!result) return;

    const walletUpdateIds = result?.walletUpdates?.map(
      (update: WalletBalanceUpdate) => update.walletId
    ) ?? [];

    if (result?.walletUpdates?.length) {
      setWallets((currentWallets) =>
        applyWalletBalanceUpdates(currentWallets, result.walletUpdates)
      );
    }

    setWallets((currentWallets) =>
      applyTransactionBalanceFallback(
        currentWallets,
        newTransaction,
        "add",
        walletUpdateIds
      )
    );
  }

  async function handleDeleteTransaction(transactionId: string) {
    const transactionToRemove = transactions.find(
      (transaction) => transaction.id === transactionId
    );
    const result = await deleteTransaction(transactionId);
    await loadTransactions();
    await loadWallets();

    if (!result) return;

    const walletUpdateIds = result?.walletUpdates?.map(
      (update: WalletBalanceUpdate) => update.walletId
    ) ?? [];

    if (result?.walletUpdates?.length) {
      setWallets((currentWallets) =>
        applyWalletBalanceUpdates(currentWallets, result.walletUpdates)
      );
    }

    if (transactionToRemove) {
      setWallets((currentWallets) =>
        applyTransactionBalanceFallback(
          currentWallets,
          transactionToRemove,
          "delete",
          walletUpdateIds
        )
      );
    }
  }

  async function handleEditTransactionDate(
    transactionId: string,
    date: string
  ) {
    const result = await updateTransactionDate(transactionId, date);

    if (!result) return false;

    const updatedTransaction = result.transactions?.[0];

    if (updatedTransaction) {
      setTransactions((currentTransactions) => {
        const updatedTransactions = currentTransactions.map((transaction) =>
          transaction.id === updatedTransaction.id
            ? {
                ...transaction,
                ...updatedTransaction,
              }
            : transaction
        );

        return [...updatedTransactions].sort((a, b) => {
          const aTime = parseLocalDateValue(a.date)?.getTime() || 0;
          const bTime = parseLocalDateValue(b.date)?.getTime() || 0;

          return bTime - aTime;
        });
      });
    }

    return true;
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
    setMobileTab("home");

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
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-premium relative rounded-3xl p-8"
          >
            <button
              type="button"
              onClick={toggleTheme}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
              title={`Alternar para tema ${resolvedTheme === "dark" ? "claro" : "escuro"}`}
            >
              {resolvedTheme === "dark" ? (
                <SunMedium size={14} className="text-amber-300" />
              ) : (
                <MoonStar size={14} className="text-indigo-300" />
              )}
            </button>

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
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  Entrar com sua conta
                </p>
                {authStatus.type === "error" ? (
                  <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {authStatus.message}
                  </div>
                ) : authStatus.type === "loading" ? (
                  <div className="mt-3 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
                    {authStatus.message}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoginLoading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white px-4 py-3.5 text-sm font-bold text-slate-900 shadow-[0_12px_30px_rgba(255,255,255,0.08)] transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                    <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.4-1.7 4.1-5.4 4.1-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 4 1.5l2.7-2.6C16.7 3.7 14.6 3 12 3 6.9 3 2.7 7.1 2.7 12S6.9 21 12 21c5.4 0 9-3.8 9-9 0-.6-.1-1.1-.2-1.8H12z"/>
                    <path fill="#4285F4" d="M21 12c0-.6-.1-1.1-.2-1.8H12v3.9h5.4c-.3 1.8-1.8 3.2-3.4 3.8l-.1.1 2.6 2c1.5-1.4 2.5-3.6 2.5-6z"/>
                    <path fill="#FBBC05" d="M5.1 14.3c-.4-1-.7-2-.7-3.1s.2-2.1.7-3.1l-2.6-2C2 7.8 1.5 9.8 1.5 12s.5 4.2 1.9 5.9l2.6-2c-.5-.9-.9-1.8-.9-2.9z"/>
                    <path fill="#34A853" d="M12 5.9c1.3 0 2.5.5 3.4 1.3l2.5-2.5C16.5 3.1 14.4 2.3 12 2.3 8.3 2.3 5 4.5 3.2 7.8l2.6 2C6.4 7.4 8.9 5.9 12 5.9z"/>
                  </svg>
                </span>
                <span>{isGoogleLoginLoading ? "Conectando..." : "Entrar com Google"}</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  ou usar modo local
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
                  className="field-premium w-full rounded-xl px-4 py-3 text-sm outline-none"
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
                  className="field-premium w-full rounded-xl px-4 py-3 text-sm outline-none"
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

  const mobileNavigationItems = [
    { id: "home", label: "Home", icon: House },
    { id: "wallets", label: "Carteiras", icon: WalletNavIcon },
    { id: "transactions", label: "Transações", icon: ArrowLeftRight },
    { id: "coach", label: "Coach", icon: Bot },
    { id: "profile", label: "Perfil", icon: UserRound },
  ] as const;

  return (
    <main className="release-shell min-h-screen bg-mesh-radial pb-12 text-slate-800">
      <header className="surface-premium sticky top-0 z-50 px-6 py-4 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo-pibble.png"
              alt="PibbleFinance"
              className="h-10 w-10 rounded-2xl object-cover shadow-lg"
            />

            <div>
              <span className="block text-xl font-black tracking-tight text-slate-900">
                Pibble<span className="text-indigo-400">Finance</span>
              </span>

              <span className="text-xs font-medium text-slate-500">
                Olá, {profile.name || currentUser}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-400 lg:flex">
              <Clock3 size={13} className="text-indigo-300" />
              {isRefreshing
                ? "Sincronizando..."
                : `Atualizado ${getRelativeTimeLabel(lastSyncAt)}`}
            </div>

            <button
              type="button"
              onClick={() => refreshWorkspace()}
              disabled={isRefreshing}
              className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={14}
                className={isRefreshing ? "animate-spin text-indigo-300" : "text-indigo-300"}
              />
              Atualizar
            </button>

            <select
              value={profile.currency}
              onChange={(event) =>
                handleChangeCurrency(event.target.value as "BRL" | "USD" | "EUR")
              }
              className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-200 shadow-sm outline-none transition hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>

            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-200 transition hover:bg-white/10"
              title={`Alternar para tema ${resolvedTheme === "dark" ? "claro" : "escuro"}`}
            >
              {resolvedTheme === "dark" ? (
                <SunMedium size={14} className="text-amber-300" />
              ) : (
                <MoonStar size={14} className="text-indigo-300" />
              )}
              <span className="hidden sm:inline">
                {resolvedTheme === "dark" ? "Claro" : "Escuro"}
              </span>
            </button>

            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-indigo-500/30 bg-indigo-500/10 shadow-sm">
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
              className="rounded-xl border border-white/10 p-2.5 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="md:hidden px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+7rem)]">
        <div className="space-y-4">
          {mobileTab === "home" && (
            <CommandCenterDashboard
              wallets={wallets}
              transactions={transactions}
              currency={profile.currency}
              compact
              onNavigateTab={(tab) => setMobileTab(tab)}
            />
          )}

          {mobileTab === "wallets" && (
            <>
              <WalletForm currency={profile.currency} onAddWallet={handleAddWallet} />

              <div className="card-premium rounded-[28px] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-white">
                      Carteiras
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Uma visão rápida dos seus saldos.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-bold text-slate-300">
                    {walletOverview.totalCount}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {walletOverview.wallets.map((wallet) => (
                    <div
                      key={wallet.id}
                      className={`relative overflow-hidden rounded-[24px] border p-4 ${resolveWalletThemeClass(
                        wallet.color,
                        wallet.type
                      )}`}
                    >
                      <div
                        className={`pointer-events-none absolute inset-y-0 left-0 w-1.5 ${resolveWalletAccentClass(
                          wallet.color,
                          wallet.type
                        )}`}
                      />
                      <div
                        className={`pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full blur-2xl ${
                          isLightTheme ? "bg-white/35" : "bg-white/10"
                        }`}
                      />
                      <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <strong className="block truncate text-base font-black text-white">
                            {wallet.name}
                          </strong>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                                isLightTheme
                                  ? "border-white/70 bg-white/80 text-slate-700"
                                  : "border-white/10 bg-white/10 text-white/80"
                              }`}
                            >
                              {getWalletTypeLabel(wallet.type)}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                                isLightTheme
                                  ? "border-white/70 bg-white/80 text-slate-700"
                                  : "border-white/10 bg-white/10 text-white/80"
                              }`}
                            >
                              {wallet.currency || profile.currency}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStartEditWallet(wallet)}
                          className={`rounded-xl border p-2 transition ${
                            isLightTheme
                              ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                              : "border-white/20 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                          }`}
                          title="Editar carteira"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>

                      <div className="relative mt-5 border-t border-white/10 pt-4">
                        <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">
                          Saldo atual
                        </span>
                        <strong className="mt-1 block break-words text-[1.15rem] font-black leading-tight tracking-tight text-white tabular-nums">
                          {formatMoney(
                            Number(wallet.balance || 0),
                            wallet.currency || profile.currency
                          )}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {mobileTab === "transactions" && (
            <>
              <TransactionForm
                wallets={wallets}
                onAddTransaction={handleAddTransaction}
                currency={profile.currency}
              />
              <TransactionList
                transactions={transactions}
                wallets={wallets}
                currency={profile.currency}
                onDeleteTransaction={handleDeleteTransaction}
                onEditTransactionDate={handleEditTransactionDate}
              />
            </>
          )}

          {mobileTab === "coach" && (
            <CoachPibble
              wallets={wallets}
              transactions={transactions}
              currency={profile.currency}
            />
          )}

          {mobileTab === "profile" && (
            <div className="space-y-4">
              <div className="card-premium rounded-[28px] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-indigo-500/30 bg-indigo-500/10 shadow-sm">
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

                  <div className="min-w-0">
                    <strong className="block truncate text-base font-black text-white">
                      {profile.name || currentUser || "Usuário"}
                    </strong>
                    <p className="text-sm text-slate-400">
                      {profile.currency} · {resolvedTheme === "dark" ? "Tema escuro" : "Tema claro"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-premium rounded-[28px] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                      Configurações rápidas
                    </span>
                    <p className="mt-1 text-sm text-slate-300">
                      Ajustes de uso diário no celular.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                      Moeda
                    </label>
                    <select
                      value={profile.currency}
                      onChange={(event) =>
                        handleChangeCurrency(event.target.value as "BRL" | "USD" | "EUR")
                      }
                      className="field-premium w-full rounded-2xl px-4 py-3 text-sm outline-none"
                    >
                      <option value="BRL">BRL</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    <span className="flex items-center gap-2">
                      {resolvedTheme === "dark" ? (
                        <SunMedium size={15} className="text-amber-300" />
                      ) : (
                        <MoonStar size={15} className="text-indigo-300" />
                      )}
                      Alternar tema
                    </span>
                    <span className="text-xs text-slate-400">
                      {resolvedTheme === "dark" ? "Claro" : "Escuro"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => refreshWorkspace()}
                    disabled={isRefreshing}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2">
                      <RefreshCw
                        size={15}
                        className={isRefreshing ? "animate-spin text-indigo-300" : "text-indigo-300"}
                      />
                      Atualizar dados
                    </span>
                    <span className="text-xs text-slate-400">
                      {isRefreshing ? "Agora" : getRelativeTimeLabel(lastSyncAt)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-200 transition hover:bg-rose-500/15"
                  >
                    <LogOut size={15} />
                    Sair da conta
                  </button>
                </div>
              </div>

              <div className="card-premium rounded-[28px] p-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  Visão geral
                </span>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                      Carteiras
                    </span>
                    <strong className="mt-1 block text-lg font-black text-white">
                      {walletOverview.totalCount}
                    </strong>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                      Saúde
                    </span>
                    <strong className="mt-1 block text-lg font-black text-white">
                      {totals.healthLabel}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="hidden md:block mx-auto max-w-[1440px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 lg:grid-cols-[1.3fr_0.9fr_0.9fr_0.9fr]">
          <div className="card-premium relative overflow-hidden rounded-[28px] p-6 lg:p-7">
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">
                Saldo disponível
              </span>
              <WalletIcon size={18} className="text-indigo-300" />
            </div>

            <strong className="text-3xl font-black tracking-tight text-white lg:text-[2.15rem]">
              {formatMoney(totals.cashBalance, profile.currency)}
            </strong>

            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
              Débito, conta corrente, pix, dinheiro e investimentos.
            </p>
          </div>

          <div className="card-premium rounded-[28px] p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">
                Crédito restante
              </span>
              <WalletIcon size={18} className="text-violet-300" />
            </div>

            <strong className="text-3xl font-black tracking-tight text-white">
              {formatMoney(totals.creditRemaining, profile.currency)}
            </strong>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Limite disponível nas carteiras de crédito.
            </p>
          </div>

          <div className="card-premium rounded-[28px] p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">
                Gasto no saldo
              </span>
              <ArrowDownCircle size={18} className="text-orange-300" />
            </div>

            <strong className="text-3xl font-black tracking-tight text-white">
              {formatMoney(totals.debitExpenses, profile.currency)}
            </strong>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Saídas em débito, conta corrente, pix e dinheiro.
            </p>
          </div>

          <div className="card-premium rounded-[28px] p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">
                Gasto no crédito
              </span>
              <ArrowDownCircle size={18} className="text-rose-300" />
            </div>

            <strong className="text-3xl font-black tracking-tight text-white">
              {formatMoney(totals.creditExpenses, profile.currency)}
            </strong>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Saídas lançadas em carteiras de crédito.
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="card-premium rounded-[28px] p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 ${isLightTheme ? "border-slate-200 bg-white text-slate-700" : "border-white/10 bg-white/6 text-slate-300"} text-ui-label`}>
                Leitura rápida
              </span>
              <span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold text-indigo-200">
                Saúde {totals.healthLabel}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  totals.expenseTrendPercent > 0
                    ? isLightTheme
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-rose-400/20 bg-rose-500/10 text-rose-200"
                    : isLightTheme
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                }`}
              >
                Gastos {totals.expenseTrendPercent > 0 ? "+" : ""}
                {Math.round(totals.expenseTrendPercent)}% em 7 dias
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-ui-title">
              {totals.mainInsight.title}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-ui-muted">
              {totals.mainInsight.text}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className={`rounded-2xl border p-4 ${isLightTheme ? "border-slate-200 bg-white/90" : "border-white/10 bg-white/5"}`}>
                <span className="text-ui-label">
                  Fluxo do período
                </span>
                <strong className="mt-2 block text-lg text-ui-value">
                  {formatMoney(totals.netCashFlow, profile.currency)}
                </strong>
              </div>

              <div className={`rounded-2xl border p-4 ${isLightTheme ? "border-slate-200 bg-white/90" : "border-white/10 bg-white/5"}`}>
                <span className="text-ui-label">
                  Última entrada
                </span>
                <strong className="mt-2 block text-lg text-ui-value">
                  {totals.daysSinceLastIncome === null
                    ? "Sem registro"
                    : totals.daysSinceLastIncome === 0
                    ? "Hoje"
                    : `${totals.daysSinceLastIncome} dias`}
                </strong>
              </div>

              <div className={`rounded-2xl border p-4 ${isLightTheme ? "border-slate-200 bg-white/90" : "border-white/10 bg-white/5"}`}>
                <span className="text-ui-label">
                  Última saída
                </span>
                <strong className="mt-2 block text-lg text-ui-value">
                  {totals.daysSinceLastExpense === null
                    ? "Sem registro"
                    : totals.daysSinceLastExpense === 0
                    ? "Hoje"
                    : `${totals.daysSinceLastExpense} dias`}
                </strong>
              </div>
            </div>
          </div>

          <div className="card-premium rounded-[28px] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <span className="text-ui-label">
                  Alertas simples
                </span>
                <p className="mt-1 text-sm text-ui-muted">
                  O que merece atenção agora.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {totals.alerts.slice(0, 2).map((alert) => (
                <div
                  key={alert.title}
                  className={`rounded-2xl border p-4 ${
                    isLightTheme
                      ? alert.tone === "danger"
                        ? "border-rose-200 bg-rose-50"
                        : alert.tone === "warning"
                        ? "border-amber-200 bg-amber-50"
                        : "border-emerald-200 bg-emerald-50"
                      : alert.tone === "danger"
                      ? "border-rose-400/20 bg-rose-500/10"
                      : alert.tone === "warning"
                      ? "border-amber-400/20 bg-amber-500/10"
                      : "border-emerald-400/20 bg-emerald-500/10"
                  }`}
                >
                  <strong className={`block text-sm font-black ${isLightTheme ? "text-slate-950" : "text-white"}`}>
                    {alert.title}
                  </strong>
                  <p className={`mt-1 text-xs leading-5 ${isLightTheme ? "text-slate-700" : "text-white/75"}`}>
                    {alert.text}
                  </p>
                  <p className={`mt-2 text-xs font-semibold ${isLightTheme ? "text-slate-900" : "text-white/90"}`}>
                    Próximo passo: {alert.suggestion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-8 inline-flex rounded-[22px] border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`rounded-[18px] px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "dashboard"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab("wallets")}
            className={`rounded-[18px] px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "wallets"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Carteiras
          </button>

          <button
            onClick={() => setActiveTab("transactions")}
            className={`rounded-[18px] px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "transactions"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Transações
          </button>
        </div>

        {activeTab === "dashboard" && (
          <CommandCenterDashboard
            wallets={wallets}
            transactions={transactions}
            currency={profile.currency}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "wallets" && (
          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <div className="min-w-0">
              <WalletForm
                currency={profile.currency}
                onAddWallet={handleAddWallet}
              />
            </div>

            <div className="card-premium min-h-[560px] rounded-[28px] p-6 lg:p-8">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    Minhas carteiras
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Gerencie suas contas, cartões e investimentos em um só lugar.
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-bold text-slate-300">
                  {walletOverview.totalCount}{" "}
                  {walletOverview.totalCount === 1 ? "carteira" : "carteiras"}
                </span>
              </div>

              <div className="mb-6 grid gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                <label className="relative block min-w-0">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                    Buscar carteira
                  </span>

                  <div className="relative">
                    <input
                      type="text"
                      value={walletSearch}
                      onChange={(event) => setWalletSearch(event.target.value)}
                      placeholder="Nome, tipo, moeda ou saldo"
                      className="field-premium w-full rounded-2xl px-4 py-3 pr-16 text-sm outline-none transition"
                    />

                    {walletSearch.trim() ? (
                      <button
                        type="button"
                        onClick={() => setWalletSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/6 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/10"
                      >
                        Limpar
                      </button>
                    ) : null}
                  </div>
                </label>

                <label className="block min-w-0">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                    Ordenar por
                  </span>

                  <select
                    value={walletSort}
                    onChange={(event) =>
                      setWalletSort(
                        event.target.value as "recent" | "name" | "balance" | "type"
                      )
                    }
                    className="field-premium w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
                  >
                    <option value="recent">Mais recentes</option>
                    <option value="name">Nome</option>
                    <option value="balance">Saldo maior</option>
                    <option value="type">Tipo</option>
                  </select>
                </label>

                <div className="grid min-w-0 grid-cols-2 gap-2 xl:col-span-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                      Exibidas
                    </span>
                    <strong className="mt-1 block text-lg font-black text-white">
                      {walletOverview.filteredCount}
                    </strong>
                  </div>

                  <div className="min-h-[88px] min-w-0 rounded-2xl border border-white/10 bg-white/6 p-3">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                      Saldo total
                    </span>
                    <strong className="mt-1 block min-w-0 whitespace-normal break-words text-[clamp(1rem,1.2vw,1.25rem)] font-black leading-tight tracking-tight text-white tabular-nums">
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
                      className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-bold text-slate-300"
                    >
                      {getWalletTypeLabel(type)}: {formatMoney(value, profile.currency)}
                    </span>
                  ))}
              </div>

              {walletOverview.wallets.length === 0 ? (
                <div className="flex min-h-[380px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 text-center">
                  <WalletIcon size={42} className="mb-4 text-slate-500" />

                  <strong className="text-base font-black text-white">
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
                      className="mt-5 rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-xs font-bold text-indigo-200 transition hover:bg-indigo-500/15"
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
                      className={`relative flex h-full min-h-[220px] flex-col justify-between overflow-hidden rounded-[28px] border p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${resolveWalletThemeClass(
                        wallet.color,
                        wallet.type
                      )}`}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_30%),linear-gradient(145deg,rgba(255,255,255,0.04),transparent_40%)] opacity-80" />
                      <div
                        className={`pointer-events-none absolute inset-y-0 left-0 w-1.5 ${resolveWalletAccentClass(
                          wallet.color,
                          wallet.type
                        )}`}
                      />
                      <div className="pointer-events-none absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/20" />

                      <div className="relative mb-6 flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white shadow-sm backdrop-blur-md">
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
                        <strong className="block truncate text-lg font-black tracking-tight text-white">
                          {wallet.name}
                        </strong>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                            {getWalletTypeLabel(wallet.type)}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                            {wallet.currency || profile.currency}
                          </span>
                        </div>

                        <div className="mt-6 border-t border-white/10 pt-5">
                          <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">
                            Saldo atual
                          </span>

                          <strong className="mt-1 block max-w-full whitespace-normal break-words text-[clamp(1.35rem,2.3vw,1.9rem)] font-black leading-tight tracking-tight text-white tabular-nums">
                            {formatMoney(
                              Number(wallet.balance || 0),
                              wallet.currency || profile.currency
                            )}
                          </strong>

                          <p className="mt-2 max-w-[28ch] text-xs leading-5 text-white/70">
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
              currency={profile.currency}
            />

            <TransactionList
              transactions={transactions}
              wallets={wallets}
              currency={profile.currency}
              onDeleteTransaction={handleDeleteTransaction}
              onEditTransactionDate={handleEditTransactionDate}
            />
          </div>
        )}
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 md:hidden">
        <div
          className={`mx-auto max-w-lg rounded-[28px] border p-2 backdrop-blur-2xl ${
            isLightTheme
              ? "border-slate-200/80 bg-white/92 shadow-[0_-18px_40px_rgba(15,23,42,0.08)]"
              : "border-white/10 bg-slate-950/88 shadow-[0_-24px_60px_rgba(2,6,23,0.45)]"
          }`}
        >
          <div className="grid grid-cols-5 gap-1">
          {mobileNavigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = mobileTab === item.id;

            return (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => setMobileTab(item.id)}
                whileTap={{ scale: 0.97 }}
                whileHover={{ y: -1 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                aria-pressed={isActive}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 overflow-hidden rounded-[20px] px-2 py-2 text-[10px] font-semibold transition ${
                  isActive
                    ? isLightTheme
                      ? "text-white shadow-sm"
                      : "text-slate-950 shadow-sm"
                    : isLightTheme
                    ? "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileNavActivePill"
                    className={`pointer-events-none absolute inset-0 rounded-[20px] ${
                      isLightTheme
                        ? "bg-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
                        : "bg-white shadow-[0_10px_24px_rgba(2,6,23,0.26)]"
                    }`}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex flex-col items-center gap-1">
                  <Icon
                    size={16}
                    className={
                      isActive
                        ? isLightTheme
                          ? "text-white"
                          : "text-slate-950"
                        : "text-current"
                    }
                  />
                  <span className="leading-none">{item.label}</span>
                </span>
                {isActive && (
                  <motion.span
                    layoutId="mobileNavDot"
                    className={`pointer-events-none absolute bottom-1 h-1.5 w-1.5 rounded-full ${
                      isLightTheme ? "bg-white/85" : "bg-slate-950/85"
                    }`}
                  />
                )}
              </motion.button>
            );
          })}
          </div>
        </div>
      </nav>

    {editingWallet && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md">
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
          className={`w-full max-w-4xl overflow-hidden rounded-[32px] border shadow-2xl ${
            isLightTheme
              ? "border-slate-200 bg-white"
              : "border-white/10 bg-slate-950/95"
          }`}
        >
          <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
            <div className="p-6 md:p-7">
              <div className="mb-6">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Personalização
                </div>
                <h3 className="text-3xl font-black tracking-tight text-ui-title">
                  Personalizar carteira
                </h3>
                <p className="mt-2 text-sm leading-6 text-ui-muted">
                  Ajuste a aparência da carteira sem alterar nome, tipo ou saldo.
                </p>
              </div>

              {editWalletStatus.message ? (
                <div
                  className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    editWalletStatus.type === "saved"
                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                      : "border-amber-400/20 bg-amber-500/10 text-amber-100"
                  }`}
                >
                  {editWalletStatus.message}
                </div>
              ) : null}

              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <div
                  className={`rounded-2xl border p-3 ${
                    isLightTheme
                      ? "border-slate-200 bg-white"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                    Nome
                  </span>
                  <strong className="mt-1 block truncate text-sm font-black text-ui-title">
                    {editingWallet.name}
                  </strong>
                </div>

                <div
                  className={`rounded-2xl border p-3 ${
                    isLightTheme
                      ? "border-slate-200 bg-white"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                    Saldo
                  </span>
                  <strong className="mt-1 block truncate text-sm font-black text-ui-title tabular-nums">
                    {formatMoney(Number(editWalletBalance || 0), editingWallet.currency)}
                  </strong>
                </div>

                <div
                  className={`rounded-2xl border p-3 ${
                    isLightTheme
                      ? "border-slate-200 bg-white"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                    Tipo
                  </span>
                  <strong className="mt-1 block truncate text-sm font-black text-ui-title">
                    {getWalletTypeLabel(editingWallet.type)}
                  </strong>
                </div>
              </div>

              <div className="space-y-5">
                <WalletColorPicker
                  value={editWalletColorIndex}
                  onChange={setEditWalletColorIndex}
                  label="Cor da carteira"
                  size="lg"
                  showNames
                />
              </div>
            </div>

            <div
              className={`border-t p-6 md:border-l md:border-t-0 md:p-7 ${
                isLightTheme
                  ? "border-slate-200 bg-slate-50/80"
                  : "border-white/10 bg-slate-950/80"
              }`}
            >
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                  Prévia ao vivo
                </h4>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Veja como a carteira vai ficar antes de salvar.
                </p>
              </div>

              <div
                className={`relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-[28px] border p-5 shadow-[0_24px_64px_rgba(15,23,42,0.22)] transition-all duration-300 ${getWalletColorPreset(
                  editWalletColorIndex
                ).className}`}
              >
                <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-white/10 blur-3xl" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/20" />

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/75">
                      {getWalletTypeLabel(editingWallet.type)}
                    </span>
                    <p className="mt-1 text-xl font-black leading-tight text-white">
                      {editWalletName.trim() || editingWallet.name}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 p-2 text-white/90 backdrop-blur-md">
                    <WalletIcon size={18} />
                  </div>
                </div>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">
                    Saldo atual
                  </span>
                  <strong className="mt-1 block text-3xl font-black tracking-tight text-white tabular-nums">
                    {formatMoney(Number(editWalletBalance || 0), editingWallet.currency)}
                  </strong>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!editingWallet) return;
                    setWalletToDelete(editingWallet);
                  }}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
                >
                  Deletar carteira
                </button>

                <button
                  type="button"
                  onClick={closeWalletEditor}
                  className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                    isLightTheme
                      ? "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSaveWalletEdit}
                  disabled={editWalletStatus.type === "saving"}
                  className={`rounded-2xl px-5 py-3 text-sm font-bold text-white transition ${
                    editWalletStatus.type === "saving"
                      ? "cursor-wait bg-slate-500"
                      : "bg-slate-950 hover:bg-slate-800"
                  }`}
                >
                  {editWalletStatus.type === "saving"
                    ? "Salvando..."
                    : "Salvar alterações"}
                </button>
              </div>
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
