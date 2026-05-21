/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { PRESET_CATEGORIES } from "../utils/constants";
import CategoryIcon from "./CategoryIcon";
import {
  PlusCircle,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import type { Wallet, Transaction, TransactionType } from "../types";

interface TransactionFormProps {
  wallets: Wallet[];
  onAddTransaction: (transaction: Omit<Transaction, "id">) => void;
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

  const activeCategories = useMemo(() => {
    if (type === "transfer") return [];
    return PRESET_CATEGORIES.filter(
      (cat) => cat.type === type || cat.type === "any"
    );
  }, [type]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    if (type === "transfer") {
      if (!walletId || !toWalletId || walletId === toWalletId) return;

      onAddTransaction({
        type,
        amount: Number(amount),
        category: "Transferência",
        walletId,
        toWalletId,
        description: description.trim() || "Transferência entre contas",
        date: new Date(date).toISOString(),
      });
    } else {
      if (!walletId || !category) return;

      onAddTransaction({
        type,
        amount: Number(amount),
        category,
        walletId,
        description: description.trim(),
        date: new Date(date).toISOString(),
      });
    }

    setAmount("");
    setDescription("");
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
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs transition-all duration-300">
      <div className="mb-6">
        <h3 className="font-display flex items-center gap-2 text-lg font-bold text-slate-900">
          <PlusCircle className="text-emerald-500" size={20} />
          Registrar Lançamento
        </h3>

        <p className="text-xs text-slate-500">
          Adicione suas movimentações para atualizar instantaneamente o saldo das
          contas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleTypeChange("expense")}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-all ${
              type === "expense"
                ? "border-rose-200 bg-rose-50 text-rose-700 shadow-xs"
                : "border-slate-200/60 bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ArrowDownCircle size={14} />
            Saída
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange("income")}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-all ${
              type === "income"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-xs"
                : "border-slate-200/60 bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ArrowUpCircle size={14} />
            Entrada
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange("transfer")}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-all ${
              type === "transfer"
                ? "border-blue-200 bg-blue-50 text-blue-700 shadow-xs"
                : "border-slate-200/60 bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <RefreshCw size={14} />
            Transf.
          </button>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Valor ({currency})
          </label>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-slate-400">
              {currency === "BRL" ? "R$" : currency === "USD" ? "$" : "€"}
            </span>

            <input
              type="number"
              step="any"
              placeholder="0,00"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 font-mono text-base font-bold text-slate-900 transition-all focus:border-indigo-600 focus:bg-white focus:outline-hidden"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              {type === "transfer" ? "Origem" : "Conta / Carteira"}
            </label>

            <select
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 transition-all focus:border-indigo-600 focus:bg-white focus:outline-hidden"
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
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Destino
              </label>

              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 transition-all focus:border-indigo-600 focus:bg-white focus:outline-hidden"
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
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Categoria
              </label>

              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 transition-all focus:border-indigo-600 focus:bg-white focus:outline-hidden"
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
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Data
            </label>

            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 transition-all focus:border-indigo-600 focus:bg-white focus:outline-hidden"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Descrição / Nota
            </label>

            <input
              type="text"
              placeholder="Ex: Compras no mercado, Freelance..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 transition-all focus:border-indigo-600 focus:bg-white focus:outline-hidden"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {type !== "transfer" && category && (
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
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

            <div className="text-[10px] font-medium text-slate-500">
              Classificado em:{" "}
              <strong className="text-slate-800">
                {PRESET_CATEGORIES.find((cat) => cat.id === category)?.name ||
                  category}
              </strong>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!isFormValid}
          className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold text-white shadow-xs transition-all duration-200 ${
            isFormValid
              ? "bg-slate-900 hover:bg-slate-800 active:scale-97"
              : "cursor-not-allowed bg-slate-200 text-slate-400"
          }`}
        >
          {type === "transfer" ? (
            <RefreshCw size={14} className="animate-spin-slow" />
          ) : (
            <PlusCircle size={14} />
          )}

          {type === "transfer"
            ? "Realizar Transferência"
            : type === "income"
            ? "Registrar Entrada"
            : "Registrar Saída"}
        </button>
      </form>
    </div>
  );
}