/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  Pencil,
  FileSpreadsheet,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  ClipboardCopy,
} from "lucide-react";

import type { Transaction, Wallet } from "../types";
import { PRESET_CATEGORIES } from "../utils/constants";
import { formatDate, formatMoney } from "../utils/formatMoney";
import { useTheme } from "../context/ThemeProvider";
import {
  getTransactionToWalletId,
  getTransactionWalletId,
} from "../utils/financialSnapshot";
import {
  formatLocalDateInputValue,
  formatLocalDateTimeLabel,
  normalizeLocalDateValue,
  parseLocalDateValue,
} from "../utils/date";

interface TransactionListProps {
  transactions: Transaction[];
  wallets: Wallet[];
  onDeleteTransaction: (id: string) => void;
  onEditTransactionDate: (
    id: string,
    date: string
  ) => Promise<boolean> | boolean;
  currency: "BRL" | "USD" | "EUR";
}

type TypeFilter = "all" | "income" | "expense" | "transfer";
type PeriodFilter = "all" | "today" | "week" | "month";

function getTransactionCategory(transaction: Transaction) {
  return String(transaction.category || "");
}

function getTransactionDescription(transaction: Transaction) {
  return String(transaction.description || "");
}

function getTransactionDate(transaction: Transaction) {
  return String(transaction.date || "");
}

function isSameDate(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function getCategoryLabel(categoryValue: string) {
  const categoryObj = PRESET_CATEGORIES.find(
    (category) =>
      category.id === categoryValue.toLowerCase() ||
      category.name.toLowerCase() === categoryValue.toLowerCase()
  );

  return categoryObj ? categoryObj.name : categoryValue;
}

function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  return Promise.resolve();
}

export default function TransactionList({
  transactions,
  wallets,
  onDeleteTransaction,
  onEditTransactionDate,
  currency,
}: TransactionListProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [walletFilter, setWalletFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedState, setCopiedState] = useState<"idle" | "copied">("idle");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDateValue, setEditDateValue] = useState("");
  const [editStatus, setEditStatus] = useState<{
    type: "idle" | "saving" | "saved" | "error";
    message: string;
  }>({ type: "idle", message: "" });

  const walletMap = useMemo(() => {
    return wallets.reduce<Record<string, Wallet>>((acc, wallet) => {
      acc[wallet.id] = wallet;
      return acc;
    }, {});
  }, [wallets]);

  function openTransactionDateEditor(transaction: Transaction) {
    const normalizedDate =
      normalizeLocalDateValue(transaction.date) || formatLocalDateInputValue();

    setEditingTransaction(transaction);
    setEditDateValue(normalizedDate);
    setEditStatus({ type: "idle", message: "" });
  }

  function closeTransactionDateEditor() {
    setEditingTransaction(null);
    setEditDateValue("");
    setEditStatus({ type: "idle", message: "" });
  }

  async function handleSaveTransactionDate() {
    if (!editingTransaction) return;

    const normalizedDate = normalizeLocalDateValue(editDateValue);

    if (!normalizedDate) {
      setEditStatus({
        type: "error",
        message: "Selecione uma data válida antes de salvar.",
      });
      return;
    }

    const currentDate =
      normalizeLocalDateValue(editingTransaction.date) || normalizedDate;

    if (currentDate === normalizedDate) {
      setEditStatus({
        type: "saved",
        message: "A data escolhida já estava aplicada.",
      });

      window.setTimeout(() => {
        closeTransactionDateEditor();
      }, 650);

      return;
    }

    setEditStatus({
      type: "saving",
      message: "Atualizando a data do lançamento...",
    });

    const saved = await onEditTransactionDate(
      editingTransaction.id,
      normalizedDate
    );

    if (!saved) {
      setEditStatus({
        type: "error",
        message: "Não foi possível salvar a nova data agora.",
      });
      return;
    }

    setEditStatus({
      type: "saved",
      message: "Data atualizada com sucesso.",
    });

    window.setTimeout(() => {
      closeTransactionDateEditor();
    }, 850);
  }

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const walletId = getTransactionWalletId(transaction);
      const toWalletId = getTransactionToWalletId(transaction);
      const categoryValue = getTransactionCategory(transaction);
      const description = getTransactionDescription(transaction);
      const transactionDateValue = getTransactionDate(transaction);

      const categoryLabel = getCategoryLabel(categoryValue);

      const matchSearch =
        normalizedSearch.length === 0 ||
        description.toLowerCase().includes(normalizedSearch) ||
        categoryValue.toLowerCase().includes(normalizedSearch) ||
        categoryLabel.toLowerCase().includes(normalizedSearch) ||
        (walletMap[walletId]?.name || "").toLowerCase().includes(normalizedSearch) ||
        (walletMap[toWalletId]?.name || "").toLowerCase().includes(normalizedSearch);

      const matchType = typeFilter === "all" || transaction.type === typeFilter;

      const matchWallet =
        walletFilter === "all" ||
        walletId === walletFilter ||
        toWalletId === walletFilter;

      let matchPeriod = true;

      if (periodFilter !== "all") {
        const transactionDate = parseLocalDateValue(transactionDateValue);
        const today = new Date();
        const startOfToday = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );

        if (!transactionDate) return false;

        if (periodFilter === "today") {
          matchPeriod = isSameDate(transactionDate, today);
        } else if (periodFilter === "week") {
          const sevenDaysAgo = new Date(startOfToday);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          matchPeriod = transactionDate >= sevenDaysAgo;
        } else if (periodFilter === "month") {
          matchPeriod =
            transactionDate.getMonth() === today.getMonth() &&
            transactionDate.getFullYear() === today.getFullYear();
        }
      }

      return matchSearch && matchType && matchWallet && matchPeriod;
    });
  }, [transactions, search, typeFilter, walletFilter, periodFilter, walletMap]);

  async function handleCopySummary() {
    if (filteredTransactions.length === 0) return;

    const text = filteredTransactions
      .map((transaction) => {
        const walletId = getTransactionWalletId(transaction);
        const toWalletId = getTransactionToWalletId(transaction);
        const categoryValue = getTransactionCategory(transaction);
        const typeLabel =
          transaction.type === "income"
            ? "Entrada"
            : transaction.type === "expense"
            ? "Saída"
            : "Transferência";

        const route =
          transaction.type === "transfer"
            ? `${walletMap[walletId]?.name || "Origem"} → ${
                walletMap[toWalletId]?.name || "Destino"
              }`
            : walletMap[walletId]?.name || "Carteira";

        return `• ${formatDate(getTransactionDate(transaction))} | ${typeLabel} | ${getCategoryLabel(
          categoryValue
        )} | ${route} | ${formatMoney(transaction.amount, currency)} | ${getTransactionDescription(
          transaction
        )}`;
      })
      .join("\n");

    await copyToClipboard(text);
    setCopiedState("copied");
    window.setTimeout(() => setCopiedState("idle"), 1500);
  }

  function handleExportCSV() {
    if (filteredTransactions.length === 0) return;

    const headers = [
      "Data",
      "Tipo",
      "Categoria",
      "Conta Origem",
      "Conta Destino",
      "Valor",
      "Descrição",
    ];

    const rows = filteredTransactions.map((transaction) => {
      const walletId = getTransactionWalletId(transaction);
      const toWalletId = getTransactionToWalletId(transaction);
      const categoryValue = getTransactionCategory(transaction);

      return [
        formatDate(getTransactionDate(transaction)),
        transaction.type === "income"
          ? "Entrada"
          : transaction.type === "expense"
          ? "Saída"
          : "Transferência",
        getCategoryLabel(categoryValue),
        walletMap[walletId]?.name || "N/A",
        toWalletId ? walletMap[toWalletId]?.name || "N/A" : "",
        String(transaction.amount || 0),
        getTransactionDescription(transaction),
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `pibble_extrato_${formatLocalDateInputValue()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const activeFiltersCount =
    Number(typeFilter !== "all") +
    Number(walletFilter !== "all") +
    Number(periodFilter !== "all") +
    Number(search.trim().length > 0);

  return (
    <div className={`card-premium rounded-[28px] p-6 ${isLight ? "text-slate-900" : "text-white"}`}>
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
            <FileSpreadsheet size={12} />
            Histórico de lançamentos
          </div>
          <h3 className={`text-xl font-black tracking-tight ${isLight ? "text-slate-950" : "text-white"}`}>
            Transações recentes
          </h3>
          <p className={`mt-1 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            Pesquise, filtre e exporte o que entrou, saiu ou foi transferido.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              showAdvanced || activeFiltersCount > 0
                ? "border-indigo-400/30 bg-indigo-500/10 text-indigo-200"
                : isLight
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "border-white/10 bg-white/6 text-slate-300 hover:bg-white/10"
            }`}
          >
            <SlidersHorizontal size={13} />
            {showAdvanced ? "Ocultar filtros" : "Filtros"}
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            disabled={filteredTransactions.length === 0}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              isLight
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "border-white/10 bg-white/6 text-slate-300 hover:bg-white/10"
            }`}
          >
            <ClipboardCopy size={13} />
            {copiedState === "copied" ? "Copiado" : "Copiar resumo"}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              isLight
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "border-white/10 bg-white/6 text-slate-300 hover:bg-white/10"
            }`}
          >
            <FileSpreadsheet size={13} />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="mb-5 space-y-3">
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            size={16}
          />
          <input
            type="text"
            placeholder="Buscar por título, categoria, carteira ou descrição"
            className={`w-full rounded-2xl border py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-500 focus:border-indigo-400/40 ${
              isLight
                ? "border-slate-200 bg-white text-slate-900 focus:bg-white"
                : "border-white/10 bg-white/6 text-white focus:bg-white/8"
            }`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <AnimatePresence>
          {(showAdvanced || activeFiltersCount > 0) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className={`grid grid-cols-1 gap-3 rounded-3xl border p-4 text-xs md:grid-cols-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                    Tipo
                  </label>
                  <select
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm outline-none ${
                      isLight
                        ? "border-slate-200 bg-white text-slate-900"
                        : "border-white/10 bg-slate-950 text-white"
                    }`}
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                  >
                    <option value="all">Ver tudo</option>
                    <option value="expense">Saídas</option>
                    <option value="income">Entradas</option>
                    <option value="transfer">Transferências</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                    Carteira
                  </label>
                  <select
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm outline-none ${
                      isLight
                        ? "border-slate-200 bg-white text-slate-900"
                        : "border-white/10 bg-slate-950 text-white"
                    }`}
                    value={walletFilter}
                    onChange={(e) => setWalletFilter(e.target.value)}
                  >
                    <option value="all">Qualquer carteira</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                    Período
                  </label>
                  <select
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm outline-none ${
                      isLight
                        ? "border-slate-200 bg-white text-slate-900"
                        : "border-white/10 bg-slate-950 text-white"
                    }`}
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                  >
                    <option value="all">Qualquer momento</option>
                    <option value="today">Hoje</option>
                    <option value="week">Últimos 7 dias</option>
                    <option value="month">Este mês</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mb-4 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        <span>
          {filteredTransactions.length} resultado
          {filteredTransactions.length === 1 ? "" : "s"}
        </span>
        <span>{transactions.length} lançamentos no total</span>
      </div>

      <div className="max-h-[460px] space-y-2.5 overflow-y-auto pr-1">
        {filteredTransactions.length === 0 ? (
          <div className={`flex flex-col items-center justify-center rounded-3xl border border-dashed px-4 py-14 text-center ${isLight ? "border-slate-200 bg-white text-slate-600" : "border-white/10 bg-white/5 text-slate-400"}`}>
            <SlidersHorizontal size={24} className={`mb-2 ${isLight ? "text-slate-400" : "text-slate-500"}`} />
            <p className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-slate-200"}`}>
              Nenhum lançamento encontrado
            </p>
            <p className={`mt-1 max-w-sm text-xs leading-6 ${isLight ? "text-slate-600" : "text-slate-500"}`}>
              {transactions.length === 0
                ? "Cadastre movimentações para começar a ver seu histórico."
                : "Ajuste os filtros ou limpe a busca para ver mais resultados."}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredTransactions.map((transaction) => {
              const walletId = getTransactionWalletId(transaction);
              const toWalletId = getTransactionToWalletId(transaction);
              const categoryValue = getTransactionCategory(transaction);
              const categoryLabel = getCategoryLabel(categoryValue);
              const sourceWalletName = walletMap[walletId]?.name || "Outro";
              const destinationWalletName =
                walletMap[toWalletId]?.name || "Conta receptora";
              const description =
                getTransactionDescription(transaction) ||
                "Lançamento sem nota descritiva";

              const toneClass =
                transaction.type === "income"
                  ? "text-emerald-300"
                  : transaction.type === "expense"
                  ? "text-rose-300"
                  : "text-sky-300";

              return (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={`flex items-center justify-between gap-4 rounded-3xl border p-4 transition ${
                    isLight
                      ? "border-slate-200 bg-white hover:bg-slate-50"
                      : "border-white/10 bg-white/5 hover:bg-white/8"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                        isLight
                          ? "border-slate-200 bg-slate-100"
                          : "border-white/10 bg-slate-900/70"
                      } ${toneClass}`}
                    >
                      {transaction.type === "transfer" ? (
                        <RefreshCw size={15} />
                      ) : transaction.type === "income" ? (
                        <ArrowDownLeft size={16} />
                      ) : (
                        <ArrowUpRight size={16} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`truncate text-sm font-bold ${isLight ? "text-slate-950" : "text-white"}`}>
                          {description}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                          isLight ? "border-slate-200 bg-white text-slate-600" : "border-white/10 bg-white/6 text-slate-400"
                        }`}>
                          {categoryLabel}
                        </span>
                      </div>

                      <p className={`mt-1 text-xs leading-5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                        {transaction.type === "transfer" ? (
                          <span>
                            De{" "}
                            <strong className="text-slate-200">
                              {sourceWalletName}
                            </strong>{" "}
                            para{" "}
                            <strong className="text-indigo-200">
                              {destinationWalletName}
                            </strong>
                          </span>
                        ) : (
                          <span>
                            Carteira{" "}
                            <strong className="text-slate-200">
                              {sourceWalletName}
                            </strong>
                          </span>
                        )}
                        <span className="mx-1">•</span>
                        <span>{formatDate(getTransactionDate(transaction))}</span>
                      </p>
                      {transaction.dateEdited ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${isLight ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-indigo-400/20 bg-indigo-500/10 text-indigo-200"}`}>
                            <Check size={11} />
                            Data editada
                          </span>

                          {transaction.originalDate ? (
                            <span className={`text-[11px] leading-5 ${isLight ? "text-slate-500" : "text-slate-500"}`}>
                              Originalmente em{" "}
                              <strong className={isLight ? "text-slate-700" : "text-slate-300"}>
                                {formatDate(transaction.originalDate)}
                              </strong>
                              {transaction.editedAt ? (
                                <>
                                  {" "}
                                  • Editado em{" "}
                                  <strong className={isLight ? "text-slate-700" : "text-slate-300"}>
                                    {formatLocalDateTimeLabel(transaction.editedAt)}
                                  </strong>
                                </>
                              ) : null}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`font-mono text-sm font-bold tracking-tight ${
                        transaction.type === "income"
                          ? "text-emerald-300"
                          : transaction.type === "expense"
                          ? "text-rose-300"
                          : "text-sky-300"
                      }`}
                    >
                      {transaction.type === "income"
                        ? "+"
                        : transaction.type === "expense"
                        ? "-"
                        : "↔"}
                      {formatMoney(transaction.amount, currency)}
                    </span>

                    <button
                      type="button"
                      onClick={() => openTransactionDateEditor(transaction)}
                      className={`rounded-xl border p-2 transition ${
                        isLight
                          ? "border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                          : "border-white/10 bg-white/6 text-slate-400 hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-indigo-200"
                      }`}
                      title="Editar data do lançamento"
                    >
                      <Pencil size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteTransaction(transaction.id)}
                      className={`rounded-xl border p-2 transition ${
                        isLight
                          ? "border-slate-200 bg-white text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                          : "border-white/10 bg-white/6 text-slate-400 hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
                      }`}
                      title="Excluir lançamento"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {editingTransaction ? (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`w-full max-w-2xl overflow-hidden rounded-[32px] border shadow-2xl ${
                isLight
                  ? "border-slate-200 bg-white"
                  : "border-white/10 bg-slate-950/95"
              }`}
            >
              <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
                <div className="p-6 md:p-7">
                  <div className="mb-5">
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-200">
                      <CalendarDays size={12} />
                      Editar data do lançamento
                    </div>
                    <h3 className={`text-2xl font-black tracking-tight ${isLight ? "text-slate-950" : "text-white"}`}>
                      {editingTransaction.description || "Lançamento sem título"}
                    </h3>
                    <p className={`mt-2 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                      Ajuste apenas a data. O restante do lançamento permanece intacto.
                    </p>
                  </div>

                  <div
                    className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
                      editStatus.type === "error"
                        ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
                        : editStatus.type === "saved"
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                        : "border-white/10 bg-white/5 text-slate-300"
                    }`}
                  >
                    {editStatus.message || "Escolha a nova data e salve para atualizar o histórico."}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className={`rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
                      <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                        Tipo
                      </span>
                      <strong className="mt-1 block text-sm font-black text-slate-900 dark:text-white">
                        {editingTransaction.type === "income"
                          ? "Entrada"
                          : editingTransaction.type === "expense"
                          ? "Saída"
                          : "Transferência"}
                      </strong>
                    </div>

                    <div className={`rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
                      <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                        Valor
                      </span>
                      <strong className="mt-1 block text-sm font-black text-slate-900 dark:text-white tabular-nums">
                        {formatMoney(editingTransaction.amount, currency)}
                      </strong>
                    </div>

                    <div className={`rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
                      <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                        Data atual
                      </span>
                      <strong className="mt-1 block text-sm font-black text-slate-900 dark:text-white">
                        {formatDate(editingTransaction.date)}
                      </strong>
                    </div>

                    <div className={`rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
                      <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                        Original
                      </span>
                      <strong className="mt-1 block text-sm font-black text-slate-900 dark:text-white">
                        {editingTransaction.dateEdited && editingTransaction.originalDate
                          ? formatDate(editingTransaction.originalDate)
                          : "Ainda não editada"}
                      </strong>
                    </div>
                  </div>

                  {editingTransaction.dateEdited && editingTransaction.editedAt ? (
                    <p className="mt-4 text-xs leading-6 text-slate-500">
                      Editado em{" "}
                      <strong className={isLight ? "text-slate-700" : "text-slate-300"}>
                        {formatLocalDateTimeLabel(editingTransaction.editedAt)}
                      </strong>
                    </p>
                  ) : null}

                  <div className="mt-6">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                      Nova data
                    </label>
                    <input
                      type="date"
                      value={editDateValue}
                      onChange={(e) => setEditDateValue(e.target.value)}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                        isLight
                          ? "border-slate-200 bg-white text-slate-900 focus:border-indigo-400/40"
                          : "border-white/10 bg-slate-950 text-white focus:border-indigo-400/40"
                      }`}
                    />
                  </div>
                </div>

                <div
                  className={`border-t p-6 md:border-l md:border-t-0 md:p-7 ${
                    isLight
                      ? "border-slate-200 bg-slate-50/80"
                      : "border-white/10 bg-slate-950/80"
                  }`}
                >
                  <div className="mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                      Prévia do histórico
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      A nova data será exibida imediatamente no histórico e nos resumos.
                    </p>
                  </div>

                  <div
                    className={`rounded-[28px] border p-5 shadow-[0_18px_48px_rgba(15,23,42,0.18)] ${
                      isLight
                        ? "border-slate-200 bg-white"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className={`text-base font-black ${isLight ? "text-slate-950" : "text-white"}`}>
                            {editingTransaction.description || "Lançamento"}
                          </strong>
                          {editingTransaction.dateEdited ? (
                            <span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-200">
                              Editado
                            </span>
                          ) : null}
                        </div>
                        <p className={`mt-1 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                          {editingTransaction.type === "transfer"
                            ? "Transferência"
                            : editingTransaction.type === "income"
                            ? "Entrada"
                            : "Saída"}
                        </p>
                      </div>

                      <div className={`rounded-2xl border px-3 py-2 text-sm font-bold tabular-nums ${isLight ? "border-slate-200 bg-slate-50 text-slate-900" : "border-white/10 bg-white/6 text-white"}`}>
                        {formatMoney(editingTransaction.amount, currency)}
                      </div>
                    </div>

                    <div className={`mt-5 border-t pt-4 ${isLight ? "border-slate-200" : "border-white/10"}`}>
                      <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                        Data prevista
                      </span>
                      <strong className="mt-1 block text-2xl font-black tracking-tight text-ui-title">
                        {formatDate(editDateValue || editingTransaction.date)}
                      </strong>
                    </div>

                    {editingTransaction.dateEdited && editingTransaction.originalDate ? (
                      <p className="mt-3 text-xs leading-6 text-slate-500">
                        Originalmente em{" "}
                        <strong className={isLight ? "text-slate-700" : "text-slate-300"}>
                          {formatDate(editingTransaction.originalDate)}
                        </strong>
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeTransactionDateEditor}
                      className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                        isLight
                          ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveTransactionDate}
                      disabled={editStatus.type === "saving"}
                      className={`rounded-2xl px-5 py-3 text-sm font-bold text-white transition ${
                        editStatus.type === "saving"
                          ? "cursor-wait bg-slate-500"
                          : "bg-slate-950 hover:bg-slate-800"
                      }`}
                    >
                      {editStatus.type === "saving"
                        ? "Salvando..."
                        : "Salvar alteração"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
