import React, { useState } from "react";
import { Wallet, WalletType } from "../types";
import { WALLET_TYPES } from "../utils/constants";
import { formatMoney } from "../utils/formatMoney";

import {
  Building2,
  CreditCard,
  Coins,
  PiggyBank,
  Plus,
  Wallet as WalletIcon,
} from "lucide-react";

import { createWallet } from "../services/storage";

interface WalletFormProps {
  currency?: "BRL" | "USD" | "EUR";
  onAddWallet?: (wallet: Omit<Wallet, "id">) => Promise<void> | void;
}

const COLOR_PRESETS = [
  {
    class: "from-slate-800 to-slate-950 text-white border-slate-700",
    bg: "bg-slate-900",
    hover: "hover:border-slate-500",
    name: "Charcoal",
  },
  {
    class: "from-indigo-600 to-violet-800 text-white border-indigo-500",
    bg: "bg-indigo-600",
    hover: "hover:border-indigo-400",
    name: "Indigo Aura",
  },
  {
    class: "from-emerald-500 to-teal-700 text-white border-emerald-400",
    bg: "bg-emerald-600",
    hover: "hover:border-emerald-400",
    name: "Forest Emerald",
  },
  {
    class: "from-rose-500 to-pink-700 text-white border-rose-400",
    bg: "bg-rose-500",
    hover: "hover:border-rose-400",
    name: "Fierce Rose",
  },
  {
    class: "from-amber-400 to-orange-600 text-slate-900 border-amber-300",
    bg: "bg-amber-500",
    hover: "hover:border-amber-400",
    name: "Solar Orange",
  },
  {
    class: "from-sky-500 to-blue-700 text-white border-sky-400",
    bg: "bg-sky-500",
    hover: "hover:border-sky-400",
    name: "Ocean Sky",
  },
];

export default function WalletForm({
  currency = "BRL",
  onAddWallet,
}: WalletFormProps) {
  const [walletName, setWalletName] = useState("");
  const [walletType, setWalletType] = useState<WalletType>("checking");
  const [walletBalance, setWalletBalance] = useState("");
  const [selectedColorIndex, setSelectedColorIndex] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getWalletTypeIcon(type: WalletType) {
    switch (type) {
      case "credit":
        return <CreditCard size={18} />;
      case "cash":
        return <Coins size={18} />;
      case "savings":
        return <PiggyBank size={18} />;
      default:
        return <Building2 size={18} />;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!walletName.trim() || !walletBalance || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const safeColor =
        COLOR_PRESETS[selectedColorIndex]?.class || COLOR_PRESETS[1].class;

      const newWallet: Omit<Wallet, "id"> = {
        name: walletName.trim(),
        type: walletType,
        balance: Number(walletBalance),
        color: safeColor,
        currency,
      };

      if (onAddWallet) {
        await onAddWallet(newWallet);
      } else {
        await createWallet(newWallet);
      }

      setWalletName("");
      setWalletBalance("");
      setWalletType("checking");
      setSelectedColorIndex(1);
    } catch (error) {
      console.error("Erro ao cadastrar carteira:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
      <h3 className="font-display flex items-center gap-2 text-lg font-bold text-slate-900">
        <WalletIcon className="text-indigo-600" size={20} />
        Minhas Carteiras
      </h3>

      <p className="mb-6 text-xs text-slate-500">
        Cadastre contas bancárias, cartões, dinheiro e investimentos.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Nome da Carteira
          </label>

          <input
            type="text"
            placeholder="Ex: Nubank, Carteira Física, XP Reserva"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white"
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Tipo de Conta
            </label>

            <select
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-950 outline-none transition-all duration-200 focus:border-indigo-600 focus:bg-white"
              value={walletType}
              onChange={(e) => setWalletType(e.target.value as WalletType)}
            >
              {WALLET_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Saldo Inicial ({currency})
            </label>

            <input
              type="number"
              step="any"
              placeholder="Ex. 1500,00"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-sm text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white"
              value={walletBalance}
              onChange={(e) => setWalletBalance(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-700">
            Tema & Aparência
          </label>

          <div className="flex flex-wrap gap-2.5">
            {COLOR_PRESETS.map((color, index) => (
              <button
                key={color.name}
                type="button"
                onClick={() => setSelectedColorIndex(index)}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${color.bg} ${color.hover} transition-all duration-200 ${
                  selectedColorIndex === index
                    ? "ring-2 ring-slate-900 ring-offset-2"
                    : ""
                }`}
                title={color.name}
              >
                {selectedColorIndex === index && (
                  <span
                    className={`block h-1.5 w-1.5 rounded-full ${
                      index === 4 ? "bg-slate-950" : "bg-white"
                    }`}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <div
            className={`relative flex min-h-[140px] w-full flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-lg transition-all duration-300 ${COLOR_PRESETS[selectedColorIndex].class}`}
          >
            <div className="pointer-events-none absolute right-0 top-0 -mr-6 -mt-6 h-28 w-28 rounded-full bg-white/10 backdrop-blur-3xl" />

            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                  {WALLET_TYPES.find((w) => w.id === walletType)?.name}
                </span>

                <p className="font-display mt-0.5 max-w-[220px] truncate text-lg font-bold leading-tight">
                  {walletName.trim() || "Minha Nova Conta"}
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-2 backdrop-blur-md">
                {getWalletTypeIcon(walletType)}
              </div>
            </div>

            <div className="mt-4">
              <span className="block text-[10px] opacity-70">
                Saldo Estimado
              </span>

              <span className="font-mono text-2xl font-bold tracking-tight">
                {formatMoney(Number(walletBalance) || 0, currency)}
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!walletName.trim() || !walletBalance || isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} />
          {isSubmitting ? "Cadastrando..." : "Cadastrar Carteira"}
        </button>
      </form>
    </div>
  );
}
