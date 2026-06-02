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
import { formatMoney } from "../utils/formatMoney";
import { parseLocalNumber } from "../utils/numbers";
import { TEST_IDS } from "../utils/testIds";
import {
  getCreditAvailable,
  getCreditUsagePercentage,
  isCreditCardWallet,
} from "../utils/creditCards";

interface TransactionFormProps {
  wallets: Wallet[];
  transactions: Transaction[];
  onAddTransaction: (
    transaction: Omit<Transaction, "id">
  ) => Promise<boolean> | boolean;
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
  transactions,
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

  const selectedWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === walletId) || null,
    [wallets, walletId]
  );

  const selectedWalletCreditAvailable = useMemo(() => {
    if (!selectedWallet || !isCreditCardWallet(selectedWallet)) return 0;
    return getCreditAvailable(selectedWallet, transactions);
  }, [selectedWallet, transactions]);

  const selectedWalletCreditUsage = useMemo(() => {
    if (!selectedWallet || !isCreditCardWallet(selectedWallet)) return 0;
    return getCreditUsagePercentage(selectedWallet, transactions);
  }, [selectedWallet, transactions]);

  const amountValue = parseLocalNumber(amount);
  const isCreditPurchase =
    type === "expense" &&
    !!selectedWallet &&
    isCreditCardWallet(selectedWallet);
  const isOverCreditLimit =
    isCreditPurchase &&
    Number.isFinite(amountValue) &&
    amountValue > selectedWalletCreditAvailable;

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

    if (isCreditPurchase && safeAmount > selectedWalletCreditAvailable) {
      setSubmitStatus({
        type: "error",
        message: `Você só tem ${formatMoney(
          selectedWalletCreditAvailable,
          currency
        )} de limite disponível nesse cartão.`,
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

    if (isOverCreditLimit) return false;

    return !!category;
  }, [amount, walletId, toWalletId, category, type, isOverCreditLimit]);

  return (
    <div
      className="card-premium rounded-[28px] p-6"
      data-testid={TEST_IDS.transactionForm}
    >
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
          <label className="mb-1 block text-ui-label">Valor ({currency})</label>

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

            {isCreditPurchase ? (
              <div
                className={`mt-2 rounded-2xl border px-3 py-2 text-xs ${
                  isLight
                    ? "border-slate-200 bg-slate-50 text-slate-600"
                    : "border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">Limite disponível</span>
                  <strong className="font-mono text-sm font-black tabular-nums">
                    {formatMoney(selectedWalletCreditAvailable, currency)}
                  </strong>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-semibold">Uso do cartão</span>
                  <strong className="font-mono text-sm font-black tabular-nums">
                    {Math.round(selectedWalletCreditUsage)}%
                  </strong>
                </div>
              </div>
            ) : null}
          </div>

          {type === "transfer" ? (
            <div>
              <label className="mb-1 block text-ui-label">Destino</label>

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
              <label className="mb-1 block text-ui-label">Categoria</label>

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
            <label className="mb-1 block text-ui-label">Data</label>

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
            <label className="mb-1 block text-ui-label">Descrição / Nota</label>

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
              isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"
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
                  "CircleDot"
                }
                size={14}
              />
            </div>

            <div className="min-w-0">
              <p
                className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                  isLight ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Categoria selecionada
              </p>
              <strong
                className={`block truncate text-sm font-bold ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                {PRESET_CATEGORIES.find((cat) => cat.id === category)?.name ||
                  category}
              </strong>
            </div>
          </div>
        )}

        {isCreditPurchase ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              isOverCreditLimit
                ? isLight
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-rose-400/20 bg-rose-500/10 text-rose-100"
                : isLight
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
            }`}
          >
            {isOverCreditLimit ? (
              <>
                Esse valor ultrapassa o limite disponível. Ajuste o valor ou
                escolha outro cartão.
              </>
            ) : (
              <>
                Compra aprovada dentro do limite disponível do cartão.
              </>
            )}
          </div>
        ) : null}

        {submitStatus.message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              submitStatus.type === "error"
                ? isLight
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-rose-400/20 bg-rose-500/10 text-rose-100"
                : submitStatus.type === "success"
                ? isLight
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                : isLight
                ? "border-slate-200 bg-slate-50 text-slate-600"
                : "border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            {submitStatus.message}
          </div>
        )}

        <button
          type="submit"
          data-testid={TEST_IDS.transactionSubmitButton}
          disabled={isSubmitting || !isFormValid}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold shadow-md transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
            isLight
              ? "border border-slate-200 bg-slate-900 text-white hover:bg-slate-800"
              : "bg-white text-slate-950 hover:bg-slate-100"
          }`}
        >
          <PlusCircle size={16} />
          {isSubmitting ? "Registrando..." : "Registrar Lançamento"}
        </button>
      </form>
    </div>
  );
}
