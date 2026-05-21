/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  SlidersHorizontal,
  FileSpreadsheet,
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
  return dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate();
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

      const categoryObj = PRESET_CATEGORIES.find(
        (category) =>
          category.id === categoryValue.toLowerCase() ||
          category.name.toLowerCase() === categoryValue.toLowerCase()
      );

      const matchSearch =
        normalizedSearch.length === 0 ||
        description.toLowerCase().includes(normalizedSearch) ||
        categoryValue.toLowerCase().includes(normalizedSearch) ||
        (categoryObj?.name || "").toLowerCase().includes(normalizedSearch) ||
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
      const categoryObj = PRESET_CATEGORIES.find(
        (category) =>
          category.id === categoryValue.toLowerCase() ||
          category.name.toLowerCase() === categoryValue.toLowerCase()
      );

      return [
        formatDate(getTransactionDate(transaction)),
        transaction.type === "income"
          ? "Entrada"
          : transaction.type === "expense"
          ? "Saída"
          : "Transferência",
        categoryObj ? categoryObj.name : categoryValue,
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

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs transition-all duration-300">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900">
            Histórico de Transações
          </h3>
          <p className="text-xs text-slate-500">
            Filtre, pesquise e faça exportações dos fluxos fiscais
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              showAdvanced ||
              typeFilter !== "all" ||
              walletFilter !== "all" ||
              periodFilter !== "all"
                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                : "border-slate-250 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal size={13} />
            {showAdvanced ? "Ocultar Filtros" : "Filtros"}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-250 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all cursor-pointer hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-350"
          >
            <FileSpreadsheet size={13} />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Pesquise por mercado, salário, freelance, conta ou categoria..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 transition-all focus:border-indigo-600 focus:bg-white focus:outline-hidden"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <AnimatePresence>
          {(showAdvanced ||
            typeFilter !== "all" ||
            walletFilter !== "all" ||
            periodFilter !== "all") && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-xs sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">
                    Tipo de Fluxo
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-hidden"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                  >
                    <option value="all">Ver Tudo</option>
                    <option value="expense">Saídas (Despesas)</option>
                    <option value="income">Entradas (Receitas)</option>
                    <option value="transfer">Transferências</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">
                    Conta de Vínculo
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-hidden"
                    value={walletFilter}
                    onChange={(e) => setWalletFilter(e.target.value)}
                  >
                    <option value="all">Qualquer Carteira</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">
                    Período Fiscal
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-hidden"
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                  >
                    <option value="all">Qualquer Momento</option>
                    <option value="today">Hoje</option>
                    <option value="week">Últimos 7 dias</option>
                    <option value="month">Este Mês</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 py-12 text-center text-slate-400">
            <SlidersHorizontal size={24} className="mb-2 text-slate-400" />
            <p className="text-xs font-semibold text-slate-600">
              Nenhum lançamento corresponde
            </p>
            <p className="mt-1 px-4 text-[10px] text-slate-400">
              {transactions.length === 0
                ? "Cadastre movimentações financeiras para iniciar seu extrato."
                : "Remova ou altere os filtros aplicados acima para listar transações."}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredTransactions.map((transaction) => {
              const walletId = getTransactionWalletId(transaction);
              const toWalletId = getTransactionToWalletId(transaction);
              const categoryValue = getTransactionCategory(transaction);
              const categoryObj = PRESET_CATEGORIES.find(
                (category) =>
                  category.id === categoryValue.toLowerCase() ||
                  category.name.toLowerCase() === categoryValue.toLowerCase()
              );
              const sourceWalletName = walletMap[walletId]?.name || "Outro";
              const destinationWalletName = walletMap[toWalletId]?.name || "Conta Receptora";
              const description = getTransactionDescription(transaction) || "Lançamento sem nota descritiva";
              const badgeBg = categoryObj ? categoryObj.color : "bg-slate-400 text-white";

              return (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/20 p-3.5 text-xs transition-all duration-200 hover:bg-slate-50/60 hover:shadow-2xs"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-2xs ${badgeBg}`}>
                      {transaction.type === "transfer" ? (
                        <RefreshCw size={15} />
                      ) : transaction.type === "income" ? (
                        <ArrowDownLeft size={16} />
                      ) : (
                        <ArrowUpRight size={16} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate font-bold text-slate-900">
                          {description}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          • {categoryObj ? categoryObj.name : categoryValue}
                        </span>
                      </div>

                      <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                        {transaction.type === "transfer" ? (
                          <span>
                            Surgiu de{" "}
                            <strong className="text-slate-500">
                              {sourceWalletName}
                            </strong>{" "}
                            para{" "}
                            <strong className="text-indigo-600">
                              {destinationWalletName}
                            </strong>
                          </span>
                        ) : (
                          <span>
                            Contabilizado na carteira{" "}
                            <strong className="text-slate-500">
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
                          ? "text-emerald-600"
                          : transaction.type === "expense"
                          ? "text-rose-600"
                          : "text-blue-600"
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
                      className="rounded-lg p-1.5 text-slate-350 transition-colors cursor-pointer hover:bg-rose-50 hover:text-rose-500"
                      title="Excluir Lançamento"
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

