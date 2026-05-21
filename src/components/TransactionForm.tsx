/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { PRESET_CATEGORIES } from "../utils/constants";
import CategoryIcon from "./CategoryIcon";
import {
  PlusCircle,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import type { Wallet, Transaction, TransactionType } from "../types";
import { useTheme } from "../context/ThemeProvider";

interface TransactionFormProps {
  wallets: Wallet[];
  onAddTransaction: (transaction: Omit<Transaction, "id">) => void | Promise<void>;
  currency: "BRL" | "USD" | "EUR";
}
function getWalletTypeLabel(type?: string) {
  if (type === "credit") return "Crédito";
  if (type === "debit") return "Débito";
  if (type === "investment") return "Investimento";
  if (type === "cash") return "Dinheiro";
  if (type === "checking") return "Conta corrente";
  if (type === "savings") return "Poupança";

  return type || "Carteira";
}

function getWalletOptionLabel(wallet: Wallet) {
  return `${wallet.name} — ${getWalletTypeLabel(wallet.type)}`;
}

function toSafeIsoDate(dateValue: string) {
  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export default function TransactionForm({
  wallets,
  onAddTransaction,
  currency,
}: TransactionFormProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [walletId, setWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCategories = useMemo(() => {
    if (type === "transfer") return [];
    return PRESET_CATEGORIES.filter(
      (cat) => cat.type === type || cat.type === "any"
    );
  }, [type]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || isSubmitting) return;

    const safeDate = toSafeIsoDate(date);

    if (!safeDate) {
      console.error("Data inválida ao registrar transação:", date);
      return;
    }

    setIsSubmitting(true);

    try {
      if (type === "transfer") {
        if (!walletId || !toWalletId || walletId === toWalletId) return;

        await onAddTransaction({
          type,
          amount: Number(amount),
          category: "Transferência",
          walletId,
          toWalletId,
          description: description.trim() || "Transferência entre contas",
          date: safeDate,
        });
      } else {
        if (!walletId || !category) return;

        await onAddTransaction({
          type,
          amount: Number(amount),
          category,
          walletId,
          description: description.trim(),
          date: safeDate,
        });
      }

      setAmount("");
      setDescription("");
    } catch (error) {
      console.error("Erro ao registrar transação:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleTypeChange(newType: TransactionType) {
    setType(newType);

    if (newType === "transfer") {
      setCategory("transfer");
      return;
    }

    const firstCat = PRESET_CATEGORIES.find((cat) => cat.type === newType);
    setCategory(firstCat ? firstCat.id : "");
  }

  const isFormValid = useMemo(() => {
    if (!amount || Number(amount) <= 0 || !walletId) return false;

    if (type === "transfer") {
      return !!toWalletId && walletId !== toWalletId;
    }

    return !!category;
  }, [amount, walletId, toWalletId, category, type]);

  return (
    <div className="card-premium rounded-[28px] p-6">
      <div className="mb-6">
        <h3 className="font-display flex items-center gap-2 text-lg font-bold text-ui-title">
          <PlusCircle className="text-emerald-300" size={20} />
          Registrar Lançamento
        </h3>

        <p className="mt-1 text-sm leading-6 text-ui-muted">
          Adicione suas movimentações para atualizar instantaneamente o saldo das
          contas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleTypeChange("expense")}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border py-3 text-xs font-semibold transition-all ${
              type === "expense"
                ? isLight
                  ? "border-rose-200 bg-rose-50 text-rose-700 shadow-xs"
                  : "border-rose-400/20 bg-rose-500/10 text-rose-200 shadow-xs"
                : isLight
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/8"
            }`}
          >
            <ArrowDownCircle size={14} />
            Saída
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange("income")}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border py-3 text-xs font-semibold transition-all ${
              type === "income"
                ? isLight
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-xs"
                  : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200 shadow-xs"
                : isLight
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/8"
            }`}
          >
            <ArrowUpCircle size={14} />
            Entrada
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange("transfer")}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border py-3 text-xs font-semibold transition-all ${
              type === "transfer"
                ? isLight
                  ? "border-sky-200 bg-sky-50 text-sky-700 shadow-xs"
                  : "border-sky-400/20 bg-sky-500/10 text-sky-200 shadow-xs"
                : isLight
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/8"
            }`}
          >
            <RefreshCw size={14} />
            Transf.
          </button>
        </div>

        <div>
          <label className="mb-1 block text-ui-label">
            Valor ({currency})
          </label>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-ui-muted">
              {currency === "BRL" ? "R$" : currency === "USD" ? "$" : "€"}
            </span>

            <input
              type="number"
              step="any"
              placeholder="0,00"
              className="field-premium w-full rounded-2xl py-3 pl-10 pr-4 font-mono text-base font-bold outline-none transition-all"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-ui-label">
              {type === "transfer" ? "Origem" : "Conta / Carteira"}
            </label>

            <select
              className={`field-premium w-full rounded-2xl px-3 py-3 text-xs outline-none transition-all ${
                isLight ? "bg-white text-slate-900" : ""
              }`}
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              required
            >
              <option value="">Selecione...</option>

              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {getWalletOptionLabel(wallet)}
                </option>
              ))}
            </select>
          </div>

          {type === "transfer" ? (
            <div>
              <label className="mb-1 block text-ui-label">
                Destino
              </label>

              <select
                className={`field-premium w-full rounded-2xl px-3 py-3 text-xs outline-none transition-all ${
                  isLight ? "bg-white text-slate-900" : ""
                }`}
                value={toWalletId}
                onChange={(e) => setToWalletId(e.target.value)}
                required
              >
                <option value="">Selecione...</option>

                {wallets
                  .filter((wallet) => wallet.id !== walletId)
                  .map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {getWalletOptionLabel(wallet)}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-ui-label">
                Categoria
              </label>

              <select
                className={`field-premium w-full rounded-2xl px-3 py-3 text-xs outline-none transition-all ${
                  isLight ? "bg-white text-slate-900" : ""
                }`}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">Selecione...</option>

                {activeCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-ui-label">
              Data
            </label>

            <input
              type="date"
              className={`field-premium w-full rounded-2xl px-3 py-3 text-xs outline-none transition-all ${
                isLight ? "bg-white text-slate-900" : ""
              }`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-ui-label">
              Descrição / Nota
            </label>

            <input
              type="text"
              placeholder="Ex: Compras no mercado, Freelance..."
              className="field-premium w-full rounded-2xl px-3 py-3 text-xs outline-none transition-all"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {type !== "transfer" && category && (
          <div
            className={`flex items-center gap-2.5 rounded-2xl border p-3 ${
              isLight
                ? "border-slate-200 bg-white"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div
              className={`shrink-0 rounded-lg p-1.5 ${
                PRESET_CATEGORIES.find((cat) => cat.id === category)?.color ||
                "bg-slate-400 text-white"
              }`}
            >
              <CategoryIcon
                name={
                  PRESET_CATEGORIES.find((cat) => cat.id === category)?.icon ||
                  "Ellipsis"
                }
                size={14}
              />
            </div>

            <div className="text-xs font-medium text-ui-muted">
              Classificado em:{" "}
              <strong className={isLight ? "text-slate-900" : "text-slate-100"}>
                {PRESET_CATEGORIES.find((cat) => cat.id === category)?.name ||
                  category}
              </strong>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold shadow-xs transition-all duration-200 ${
            isFormValid && !isSubmitting
              ? isLight
                ? "border border-slate-200 bg-slate-900 text-white hover:bg-slate-800 active:scale-97"
                : "bg-white text-slate-950 hover:bg-slate-100 active:scale-97"
              : isLight
              ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
              : "cursor-not-allowed bg-white/10 text-slate-500"
          }`}
        >
          {type === "transfer" ? (
            <RefreshCw size={14} className="animate-spin-slow" />
          ) : (
            <PlusCircle size={14} />
          )}

          {isSubmitting
            ? "Salvando..."
            : type === "transfer"
            ? "Realizar Transferência"
            : type === "income"
            ? "Registrar Entrada"
            : "Registrar Saída"}
        </button>
      </form>
    </div>
  );
}
