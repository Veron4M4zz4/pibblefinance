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
import {
  formatLocalDateInputValue,
  normalizeLocalDateValue,
} from "../utils/date";
import { parseLocalNumber } from "../utils/numbers";
import { TEST_IDS } from "../utils/testIds";

interface TransactionFormProps {
  wallets: Wallet[];
  onAddTransaction: (transaction: Omit<Transaction, "id">) => Promise<boolean> | boolean;
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
  const [date, setDate] = useState(() => formatLocalDateInputValue());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "idle" | "saving" | "error" | "success";
    message: string;
  }>({ type: "idle", message: "" });

  const activeCategories = useMemo(() => {
    if (type === "transfer") return [];
    return PRESET_CATEGORIES.filter(
      (cat) => cat.type === type || cat.type === "any"
    );
  }, [type]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (import.meta.env.DEV) {
      console.log("[TransactionForm] submit click");
    }

    if (!amount || isSubmitting) {
      setSubmitStatus({
        type: "error",
        message: "Informe um valor válido antes de registrar.",
      });
      return;
    }

    const safeDate = normalizeLocalDateValue(date);
    const safeAmount = parseLocalNumber(amount);

    if (!safeDate) {
      console.error("Data inválida ao registrar transação:", date);
      setSubmitStatus({
        type: "error",
        message: "Selecione uma data válida antes de salvar.",
      });
      return;
    }

    if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
      console.error("[TransactionForm] valor inválido", amount);
      setSubmitStatus({
        type: "error",
        message: "O valor informado não é válido.",
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: "saving", message: "Salvando lançamento..." });

    try {
      if (type === "transfer") {
        if (!walletId || !toWalletId || walletId === toWalletId) {
          setSubmitStatus({
            type: "error",
            message: "Escolha uma origem e um destino diferentes.",
          });
          return;
        }

        if (import.meta.env.DEV) {
          console.log("[TransactionForm] submit payload", {
            type,
            amount: safeAmount,
            category: "Transferência",
            walletId,
            toWalletId,
            description: description.trim() || "Transferência entre contas",
            date: safeDate,
          });
        }

        const saved = await onAddTransaction({
          type,
          amount: safeAmount,
          category: "Transferência",
          walletId,
          toWalletId,
          description: description.trim() || "Transferência entre contas",
          date: safeDate,
        });

        if (!saved) {
          setSubmitStatus({
            type: "error",
            message: "Não foi possível registrar o lançamento. Tente novamente.",
          });
          return;
        }
      } else {
        if (!walletId || !category) {
          setSubmitStatus({
            type: "error",
            message: "Selecione uma carteira e uma categoria.",
          });
          return;
        }

        if (import.meta.env.DEV) {
          console.log("[TransactionForm] submit payload", {
            type,
            amount: safeAmount,
            category,
            walletId,
            description: description.trim(),
            date: safeDate,
          });
        }

        const saved = await onAddTransaction({
          type,
          amount: safeAmount,
          category,
          walletId,
          description: description.trim(),
          date: safeDate,
        });

        if (!saved) {
          setSubmitStatus({
            type: "error",
            message: "Não foi possível registrar o lançamento. Tente novamente.",
          });
          return;
        }
      }

      setAmount("");
      setDescription("");
      setSubmitStatus({
        type: "success",
        message: "Lançamento registrado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao registrar transação:", error);
      setSubmitStatus({
        type: "error",
        message: "Não foi possível registrar o lançamento. Tente novamente.",
      });
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
    const safeAmount = parseLocalNumber(amount);
    if (!Number.isFinite(safeAmount) || safeAmount <= 0 || !walletId) return false;

    if (type === "transfer") {
      return !!toWalletId && walletId !== toWalletId;
    }

    return !!category;
  }, [amount, walletId, toWalletId, category, type]);

  return (
    <div className="card-premium rounded-[28px] p-6" data-testid={TEST_IDS.transactionForm}>
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
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              data-testid={TEST_IDS.transactionAmountInput}
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
              data-testid={TEST_IDS.transactionWalletSelect}
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
                data-testid={TEST_IDS.transactionCategorySelect}
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
              data-testid={TEST_IDS.transactionDateInput}
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
              data-testid={TEST_IDS.transactionDescriptionInput}
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

        {submitStatus.message ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
              submitStatus.type === "error"
                ? "border-rose-400/20 bg-rose-500/10 text-rose-100"
                : submitStatus.type === "success"
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                : "border-indigo-400/20 bg-indigo-500/10 text-indigo-100"
            }`}
          >
            {submitStatus.message}
          </div>
        ) : null}

        <button
          type="submit"
          data-testid={TEST_IDS.transactionSubmitButton}
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
