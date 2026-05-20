import { useState, useEffect, useMemo } from "react";
import { Wallet, Transaction, UserProfile } from "./types";

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
  WalletCards,
  ArrowUpCircle,
  ArrowDownCircle,
  PiggyBank,
  LogOut,
  Sparkles,
  History,
  Trash2,
} from "lucide-react";

import { motion, AnimatePresence } from "motion/react";

export default function App() {
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
  const [selectedAvatarColorIndex, setSelectedAvatarColorIndex] = useState(0);

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
    if (currentUser) {
      setProfile((prev) => ({ ...prev, name: currentUser }));
    }
  }, [currentUser]);

  useEffect(() => {
    setStorageItem("pibblefinance:profile", profile);
  }, [profile]);

  const totals = useMemo(() => {
    const walletTotal = wallets.reduce((acc, wallet) => acc + wallet.balance, 0);

    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((acc, item) => acc + item.amount, 0);

    const expense = transactions
      .filter((item) => item.type === "expense")
      .reduce((acc, item) => acc + item.amount, 0);

    const balance = walletTotal + income - expense;

    return { income, expense, balance };
  }, [wallets, transactions]);

  function handleLogin() {
    if (!userName.trim()) return;

    const trimmedName = userName.trim();

    localStorage.setItem("pibblefinance:user", trimmedName);

    const newProfile: UserProfile = {
      name: trimmedName,
      currency: selectedCurrency,
      avatarColor: AVATAR_COLORS[selectedAvatarColorIndex],
      joinedAt: new Date().toISOString(),
    };

    setProfile(newProfile);
    setCurrentUser(trimmedName);
    setActiveTab("dashboard");
  }

  async function handleSeedMockData() {
    const seededProfile: UserProfile = {
      name: "Verona Mazza",
      currency: "BRL",
      avatarColor: AVATAR_COLORS[1],
      joinedAt: new Date().toISOString(),
    };

    setProfile(seededProfile);
    setCurrentUser("Verona Mazza");
    localStorage.setItem("pibblefinance:user", "Verona Mazza");
    setActiveTab("dashboard");
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

  function handleLogout() {
    localStorage.removeItem("pibblefinance:user");
    localStorage.removeItem("pibblefinance:profile");

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

  function handleChangeCurrency(curr: "BRL" | "USD" | "EUR") {
    const updatedProfile = { ...profile, currency: curr };
    setProfile(updatedProfile);
  }

  if (!currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 md:p-12 relative overflow-hidden">
        <div className="absolute top-1/10 left-1/10 h-[32rem] w-[32rem] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/10 right-1/10 h-[36rem] w-[36rem] bg-violet-600/10 rounded-full blur-[140px]" />

        <div className="w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.65 }}
            className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-2xl"
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
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Moeda Padrão
                </label>

                <select
                  value={selectedCurrency}
                  onChange={(e) =>
                    setSelectedCurrency(e.target.value as "BRL" | "USD" | "EUR")
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none"
                >
                  <option value="BRL">R$ (BRL)</option>
                  <option value="USD">$ (USD)</option>
                  <option value="EUR">€ (EUR)</option>
                </select>
              </div>

              <button
                onClick={handleLogin}
                disabled={!userName.trim()}
                className="w-full rounded-xl bg-indigo-600 py-3.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500"
              >
                Criar Novo Espaço
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
  const firstLetter = profile.name ? profile.name.charAt(0).toUpperCase() : "P";

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
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">
                Finanças Pessoais
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 p-1 rounded-2xl border border-slate-200/30">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold ${
                activeTab === "dashboard"
                  ? "bg-white text-indigo-700 shadow-md"
                  : "text-slate-500"
              }`}
            >
              Resumo Geral
            </button>

            <button
              onClick={() => setActiveTab("wallets")}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold ${
                activeTab === "wallets"
                  ? "bg-white text-indigo-700 shadow-md"
                  : "text-slate-500"
              }`}
            >
              Minhas Carteiras
            </button>

            <button
              onClick={() => setActiveTab("transactions")}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold ${
                activeTab === "transactions"
                  ? "bg-white text-indigo-700 shadow-md"
                  : "text-slate-500"
              }`}
            >
              Extrato Completo
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs text-slate-500">
              {(["BRL", "USD", "EUR"] as const).map((curr) => (
                <button
                  key={curr}
                  onClick={() => handleChangeCurrency(curr)}
                  className={`px-2.5 py-1.5 rounded-lg font-extrabold text-[11px] ${
                    profile.currency === curr
                      ? "bg-white text-slate-900 shadow-sm"
                      : ""
                  }`}
                >
                  {curr === "BRL" ? "R$" : curr === "USD" ? "$" : "€"}
                </button>
              ))}
            </div>

            <div
              className={`h-9 w-9 rounded-full flex items-center justify-center font-black border shadow-sm text-sm ${avatarColors}`}
            >
              {firstLetter}
            </div>

            <button
              onClick={handleLogout}
              className="p-2.5 border rounded-xl hover:bg-rose-50 hover:text-rose-500 text-slate-400"
              title="Sair do Perfil"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1400px] px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.section
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-white shadow-xl h-[130px] flex flex-col justify-between">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                Patrimônio Líquido
              </span>

              <div>
                <strong className="block font-mono text-2xl font-black">
                  {formatMoney(totals.balance, profile.currency)}
                </strong>
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  Saldo total consolidado nas contas
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm h-[130px] flex flex-col justify-between">
              <ArrowUpCircle size={16} className="text-emerald-600" />
              <div>
                <strong className="block font-mono text-2xl font-black">
                  {formatMoney(totals.income, profile.currency)}
                </strong>
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  Total recebido
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm h-[130px] flex flex-col justify-between">
              <ArrowDownCircle size={16} className="text-rose-600" />
              <div>
                <strong className="block font-mono text-2xl font-black">
                  {formatMoney(totals.expense, profile.currency)}
                </strong>
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  Total pago
                </p>
              </div>
            </div>

            <FinancialHealth
              income={totals.income}
              expense={totals.expense}
              balance={totals.balance}
            />
          </motion.section>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="view-dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
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

              <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <History size={14} className="text-indigo-500" />
                  <h4 className="font-black text-slate-900 text-sm">
                    Lançamentos Recentes
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {transactions.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      Nenhuma movimentação registrada ainda.
                    </div>
                  ) : (
                    transactions.slice(0, 4).map((t) => {
                      const categoryObj = PRESET_CATEGORIES.find(
                        (cat) => cat.id === t.category
                      );

                      const catLabel = categoryObj ? categoryObj.name : t.category;

                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-3 bg-white/60 rounded-2xl border border-slate-100 text-xs"
                        >
                          <div>
                            <strong className="text-slate-800 font-bold">
                              {t.description || catLabel}
                            </strong>
                            <p className="text-[10px] text-slate-400 font-bold">
                              Classificado como {catLabel}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono font-black ${
                                t.type === "income"
                                  ? "text-emerald-600"
                                  : t.type === "expense"
                                  ? "text-rose-600"
                                  : "text-blue-600"
                              }`}
                            >
                              {t.type === "income"
                                ? "+"
                                : t.type === "expense"
                                ? "-"
                                : "⇄"}
                              {formatMoney(t.amount, profile.currency)}
                            </span>

                            <button
                              onClick={() => handleDeleteTransaction(t.id)}
                              className="text-slate-400 hover:text-rose-500 p-1"
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
            </motion.div>
          )}

          {activeTab === "wallets" && (
            <motion.div
              key="view-wallets"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <WalletForm
                wallets={wallets}
                onAddWallet={handleAddWallet}
                onDeleteWallet={handleDeleteWallet}
                currency={profile.currency}
              />
            </motion.div>
          )}

          {activeTab === "transactions" && (
            <motion.div
              key="view-transactions"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
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