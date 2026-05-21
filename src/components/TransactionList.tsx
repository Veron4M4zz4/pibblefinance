/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDownLeft,
  ArrowUpRight,
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

interface TransactionListProps {
  transactions: Transaction[];
  wallets: Wallet[];
  onDeleteTransaction: (id: string) => void;
  currency: "BRL" | "USD" | "EUR";
}

type TypeFilter = "all" | "income" | "expense" | "transfer";
type PeriodFilter = "all" | "today" | "week" | "month";

function getTransactionWalletId(transaction: Transaction) {
  return transaction.walletId || (transaction as any).wallet_id || "";
}

function getTransactionToWalletId(transaction: Transaction) {
  return transaction.toWalletId || (transaction as any).to_wallet_id || "";
}

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
  currency,
}: TransactionListProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [walletFilter, setWalletFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedState, setCopiedState] = useState<"idle" | "copied">("idle");

  const walletMap = useMemo(() => {
    return wallets.reduce<Record<string, Wallet>>((acc, wallet) => {
      acc[wallet.id] = wallet;
      return acc;
    }, {});
  }, [wallets]);

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
        const transactionDate = new Date(transactionDateValue);
        const today = new Date();
        const startOfToday = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );

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
      `pibble_extrato_${new Date().toISOString().split("T")[0]}.csv`
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
    <div className="card-premium rounded-[28px] p-6 text-white">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
            <FileSpreadsheet size={12} />
            Histórico de lançamentos
          </div>
          <h3 className="text-xl font-black tracking-tight text-white">
            Transações recentes
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">
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
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ClipboardCopy size={13} />
            {copiedState === "copied" ? "Copiado" : "Copiar resumo"}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
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
            className="w-full rounded-2xl border border-white/10 bg-white/6 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-400/40 focus:bg-white/8"
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
              <div className="grid grid-cols-1 gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-xs md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                    Tipo
                  </label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none"
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
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none"
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
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none"
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
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 px-4 py-14 text-center text-slate-400">
            <SlidersHorizontal size={24} className="mb-2 text-slate-500" />
            <p className="text-sm font-semibold text-slate-200">
              Nenhum lançamento encontrado
            </p>
            <p className="mt-1 max-w-sm text-xs leading-6 text-slate-500">
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
                  className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/8"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/70 ${toneClass}`}
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
                        <span className="truncate text-sm font-bold text-white">
                          {description}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/6 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          {categoryLabel}
                        </span>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
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
                      onClick={() => onDeleteTransaction(transaction.id)}
                      className="rounded-xl border border-white/10 bg-white/6 p-2 text-slate-400 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
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
    </div>
  );
}
