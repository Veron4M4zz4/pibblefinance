import React, { useState } from "react";
import { Wallet, WalletType } from "../types";
import { WALLET_TYPES } from "../utils/constants";
import { formatMoney } from "../utils/formatMoney";
import { useTheme } from "../context/ThemeProvider";
import WalletColorPicker from "./WalletColorPicker";
import {
  DEFAULT_WALLET_COLOR_INDEX,
  getWalletColorPreset,
  WALLET_COLOR_PRESETS,
} from "../utils/walletColors";

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

export default function WalletForm({
  currency = "BRL",
  onAddWallet,
}: WalletFormProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [walletName, setWalletName] = useState("");
  const [walletType, setWalletType] = useState<WalletType>("checking");
  const [walletBalance, setWalletBalance] = useState("");
  const [selectedColorIndex, setSelectedColorIndex] = useState(
    DEFAULT_WALLET_COLOR_INDEX
  );
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
        getWalletColorPreset(selectedColorIndex)?.className ||
        WALLET_COLOR_PRESETS[DEFAULT_WALLET_COLOR_INDEX].className;

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
      setSelectedColorIndex(DEFAULT_WALLET_COLOR_INDEX);
    } catch (error) {
      console.error("Erro ao cadastrar carteira:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card-premium rounded-[28px] p-6">
      <h3 className="font-display flex items-center gap-2 text-lg font-bold text-ui-title">
        <WalletIcon className="text-indigo-300" size={20} />
        Minhas Carteiras
      </h3>

      <p className="mb-6 text-sm leading-6 text-ui-muted">
        Cadastre contas bancárias, cartões, dinheiro e investimentos.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-ui-label">
            Nome da Carteira
          </label>

          <input
            type="text"
            placeholder="Ex: Nubank, Carteira Física, XP Reserva"
            className="field-premium w-full rounded-2xl px-3.5 py-3 text-sm outline-none transition-all duration-200"
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-ui-label">
              Tipo de Conta
            </label>

            <select
              className="field-premium w-full rounded-2xl px-3 py-3 text-sm outline-none transition-all duration-200"
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
            <label className="mb-1.5 block text-ui-label">
              Saldo Inicial ({currency})
            </label>

            <input
              type="number"
              step="any"
              placeholder="Ex. 1500,00"
              className="field-premium w-full rounded-2xl px-3.5 py-3 font-mono text-sm outline-none transition-all duration-200 placeholder:text-slate-500"
              value={walletBalance}
              onChange={(e) => setWalletBalance(e.target.value)}
              required
            />
          </div>
        </div>

        <WalletColorPicker
          value={selectedColorIndex}
          onChange={setSelectedColorIndex}
        />

        <div className="pt-2">
          <div
            className={`relative flex min-h-[140px] w-full flex-col justify-between overflow-hidden rounded-[24px] border bg-gradient-to-br p-5 shadow-lg transition-all duration-300 ${getWalletColorPreset(selectedColorIndex).className}`}
          >
            <div className="pointer-events-none absolute right-0 top-0 -mr-6 -mt-6 h-28 w-28 rounded-full bg-white/10 backdrop-blur-3xl" />

            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/80">
                  {WALLET_TYPES.find((w) => w.id === walletType)?.name}
                </span>

                <p className="font-display mt-0.5 max-w-[220px] truncate text-lg font-bold leading-tight text-white">
                  {walletName.trim() || "Minha Nova Conta"}
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-2 backdrop-blur-md">
                {getWalletTypeIcon(walletType)}
              </div>
            </div>

            <div className="mt-4">
              <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">
                Saldo Estimado
              </span>

              <span className="font-mono text-2xl font-bold tracking-tight text-white">
                {formatMoney(Number(walletBalance) || 0, currency)}
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!walletName.trim() || !walletBalance || isSubmitting}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold shadow-md transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
            isLight
              ? "border border-slate-200 bg-slate-900 text-white hover:bg-slate-800"
              : "bg-white text-slate-950 hover:bg-slate-100"
          }`}
        >
          <Plus size={16} />
          {isSubmitting ? "Cadastrando..." : "Cadastrar Carteira"}
        </button>
      </form>
    </div>
  );
}
