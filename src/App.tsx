import React, { useMemo, useState } from "react";
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
  Pencil,
} from "lucide-react";

interface WalletFormProps {
  wallets: Wallet[];
  currency?: "BRL" | "USD" | "EUR";
  onAddWallet?: (wallet: Omit<Wallet, "id">) => Promise<void> | void;
  onEditWallet?: (wallet: Wallet) => void;
}

const COLOR_PRESETS = [
  {
    class:
      "from-slate-800 to-slate-950 text-white border-slate-700",
    bg: "bg-slate-900",
    hover: "hover:border-slate-500",
    name: "Charcoal",
  },
  {
    class:
      "from-indigo-600 to-violet-800 text-white border-indigo-500",
    bg: "bg-indigo-600",
    hover: "hover:border-indigo-400",
    name: "Indigo Aura",
  },
  {
    class:
      "from-sky-500 to-blue-700 text-white border-sky-400",
    bg: "bg-sky-500",
    hover: "hover:border-sky-300",
    name: "Ocean",
  },
  {
    class:
      "from-emerald-500 to-teal-700 text-white border-emerald-400",
    bg: "bg-emerald-500",
    hover: "hover:border-emerald-300",
    name: "Mint",
  },
  {
    class:
      "from-rose-500 to-pink-700 text-white border-rose-400",
    bg: "bg-rose-500",
    hover: "hover:border-rose-300",
    name: "Rose",
  },
  {
    class:
      "from-amber-400 to-orange-600 text-slate-950 border-amber-300",
    bg: "bg-amber-500",
    hover: "hover:border-amber-300",
    name: "Sunset",
  },
];

const WALLET_CARD_COLORS = [
  "from-indigo-600 to-violet-800 text-white border-indigo-500",
  "from-slate-800 to-slate-950 text-white border-slate-700",
  "from-sky-500 to-blue-700 text-white border-sky-400",
  "from-emerald-500 to-teal-700 text-white border-emerald-400",
  "from-rose-500 to-pink-700 text-white border-rose-400",
  "from-amber-400 to-orange-600 text-slate-950 border-amber-300",
];

function getWalletCardColor(wallet: Wallet, index: number) {
  const savedColor = String(wallet.color || "");

  const isValidSavedColor =
    WALLET_CARD_COLORS.includes(savedColor);

  if (isValidSavedColor) {
    return savedColor;
  }

  return WALLET_CARD_COLORS[
    index % WALLET_CARD_COLORS.length
  ];
}

function getWalletType(type: WalletType) {
  return WALLET_TYPES.find((item) => item.value === type);
}

export default function WalletForm({
  wallets,
  currency = "BRL",
  onAddWallet,
  onEditWallet,
}: WalletFormProps) {
  const [walletName, setWalletName] = useState("");
  const [walletType, setWalletType] =
    useState<WalletType>("checking");
  const [walletBalance, setWalletBalance] =
    useState("");
  const [selectedColor, setSelectedColor] = useState(
    COLOR_PRESETS[1].class
  );

  const previewWallet = useMemo(
    () => ({
      name: walletName || "Minha Nova Conta",
      type: walletType,
      balance: Number(walletBalance || 0),
      color: selectedColor,
    }),
    [walletName, walletType, walletBalance, selectedColor]
  );

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!walletName.trim()) return;

    await onAddWallet?.({
      name: walletName,
      type: walletType,
      balance: Number(walletBalance || 0),
      color: selectedColor,
      currency,
    });

    setWalletName("");
    setWalletBalance("");
    setWalletType("checking");
    setSelectedColor(COLOR_PRESETS[1].class);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <div className="glass-panel rounded-[2rem] border border-white/40 p-8 shadow-[0_25px_60px_-12px_rgba(15,23,42,0.18)]">
        <div className="mb-6">
          <h2 className="flex items-center gap-2 text-3xl font-black tracking-tight text-slate-900">
            <WalletIcon className="h-7 w-7 text-violet-600" />
            Minhas Carteiras
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Cadastre contas bancárias, cartões,
            dinheiro e investimentos.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Nome da Carteira
            </label>

            <input
              type="text"
              value={walletName}
              onChange={(e) =>
                setWalletName(e.target.value)
              }
              placeholder="Ex: Nubank, Carteira Física, XP Reserva"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Tipo de Conta
              </label>

              <select
                value={walletType}
                onChange={(e) =>
                  setWalletType(
                    e.target.value as WalletType
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
              >
                {WALLET_TYPES.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Saldo Inicial ({currency})
              </label>

              <input
                type="number"
                value={walletBalance}
                onChange={(e) =>
                  setWalletBalance(e.target.value)
                }
                placeholder="Ex. 1500,00"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-semibold text-slate-700">
              Tema & Aparência
            </label>

            <div className="flex flex-wrap gap-3">
              {COLOR_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.name}
                  onClick={() =>
                    setSelectedColor(preset.class)
                  }
                  className={`h-9 w-9 rounded-full border-[3px] transition ${
                    selectedColor === preset.class
                      ? "scale-110 border-slate-900"
                      : "border-transparent"
                  } ${preset.bg}`}
                />
              ))}
            </div>
          </div>

          <div
            className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br p-5 shadow-lg ${previewWallet.color}`}
          >
            <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-white/15 blur-[1px]" />

            <div className="relative z-10">
              <div className="mb-10 flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                    {getWalletType(
                      previewWallet.type
                    )?.label || "Carteira"}
                  </p>

                  <h3 className="mt-2 text-3xl font-black">
                    {previewWallet.name}
                  </h3>
                </div>

                <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-xl">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>

              <div className="border-t border-white/20 pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                  Saldo Estimado
                </p>

                <p className="mt-2 text-5xl font-black tracking-tight">
                  {formatMoney(
                    previewWallet.balance,
                    currency
                  )}
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-700 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition hover:scale-[1.01]"
          >
            <Plus className="h-4 w-4" />
            Cadastrar Carteira
          </button>
        </form>
      </div>

      <div className="glass-panel rounded-[2rem] border border-white/40 p-8 shadow-[0_25px_60px_-12px_rgba(15,23,42,0.18)]">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-black tracking-tight text-slate-900">
              Minhas carteiras
            </h2>

            <p className="mt-1 text-base text-slate-500">
              Gerencie suas contas, cartões e
              investimentos em um só lugar.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500">
            {wallets.length} cadastradas
          </div>
        </div>

        {wallets.length === 0 ? (
          <div className="flex h-[420px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 text-center">
            <PiggyBank className="mb-4 h-16 w-16 text-slate-300" />

            <h3 className="text-2xl font-bold text-slate-700">
              Nenhuma carteira criada
            </h3>

            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Cadastre sua primeira carteira para
              começar a acompanhar sua vida
              financeira.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {wallets.map((wallet, index) => (
              <div
                key={wallet.id}
                className={`relative overflow-hidden rounded-[2rem] border bg-gradient-to-br p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${getWalletCardColor(
                  wallet,
                  index
                )}`}
              >
                <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/15" />

                <div className="relative z-10">
                  <div className="mb-10 flex items-start justify-between">
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
                      {wallet.type === "credit" ? (
                        <CreditCard className="h-6 w-6" />
                      ) : wallet.type ===
                        "investment" ? (
                        <Coins className="h-6 w-6" />
                      ) : (
                        <WalletIcon className="h-6 w-6" />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onEditWallet?.(wallet)
                      }
                      className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-xl transition hover:scale-105 hover:bg-white/20"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                      {getWalletType(wallet.type)
                        ?.label || "Carteira"}
                    </p>

                    <h3 className="mt-3 text-4xl font-black tracking-tight">
                      {wallet.name}
                    </h3>
                  </div>

                  <div className="mt-10 border-t border-white/20 pt-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                      Saldo Atual
                    </p>

                    <p className="mt-3 text-5xl font-black tracking-tight">
                      {formatMoney(
                        Number(wallet.balance || 0),
                        wallet.currency ||
                          currency
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}