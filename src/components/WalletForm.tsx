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
import { parseLocalNumber } from "../utils/numbers";
import { TEST_IDS } from "../utils/testIds";

import {
  Building2,
  CreditCard,
  Coins,
  PiggyBank,
  TrendingUp,
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
  const [creditLimit, setCreditLimit] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [selectedColorIndex, setSelectedColorIndex] = useState(
    DEFAULT_WALLET_COLOR_INDEX
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCreditWallet = walletType === "credit";

  function getWalletTypeIcon(type: WalletType) {
    switch (type) {
      case "credit":
        return <CreditCard size={18} />;
      case "cash":
        return <Coins size={18} />;
      case "savings":
        return <PiggyBank size={18} />;
      case "investment":
        return <TrendingUp size={18} />;
      default:
        return <Building2 size={18} />;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!walletName.trim() || isSubmitting) return;

    const trimmedBalance = walletBalance.trim();
    const safeBalance = trimmedBalance ? parseLocalNumber(trimmedBalance) : 0;
    const trimmedCreditLimit = creditLimit.trim();
    const safeCreditLimit = trimmedCreditLimit ? parseLocalNumber(trimmedCreditLimit) : 0;
    const safeClosingDay = closingDay.trim() ? Number(closingDay) : undefined;
    const safeDueDay = dueDay.trim() ? Number(dueDay) : undefined;

    const isValidDay =
      (value?: number) =>
        value === undefined || (Number.isFinite(value) && value >= 1 && value <= 31);

    if (
      !Number.isFinite(safeBalance) ||
      !Number.isFinite(safeCreditLimit) ||
      !isValidDay(safeClosingDay) ||
      !isValidDay(safeDueDay)
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      const safeColor =
        getWalletColorPreset(selectedColorIndex)?.className ||
        WALLET_COLOR_PRESETS[DEFAULT_WALLET_COLOR_INDEX].className;

      const newWallet: Omit<Wallet, "id"> = {
        name: walletName.trim(),
        type: walletType,
        balance: isCreditWallet ? 0 : safeBalance,
        color: safeColor,
        currency,
        ...(isCreditWallet
          ? {
              creditLimit: safeCreditLimit,
              closingDay: safeClosingDay,
              dueDay: safeDueDay,
            }
          : {}),
      };

      if (onAddWallet) {
        await onAddWallet(newWallet);
      } else {
        await createWallet(newWallet);
      }

      setWalletName("");
      setWalletBalance("");
      setCreditLimit("");
      setClosingDay("");
      setDueDay("");
      setWalletType("checking");
      setSelectedColorIndex(DEFAULT_WALLET_COLOR_INDEX);
    } catch (error) {
      console.error("Erro ao cadastrar carteira:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const walletPreviewBalance = parseLocalNumber(walletBalance);
  const safePreviewBalance = Number.isFinite(walletPreviewBalance)
    ? walletPreviewBalance
    : 0;
  const walletPreviewCreditLimit = parseLocalNumber(creditLimit);
  const safePreviewCreditLimit = Number.isFinite(walletPreviewCreditLimit)
    ? walletPreviewCreditLimit
    : 0;
  const trimmedWalletBalance = walletBalance.trim();
  const isWalletBalanceValid =
    !trimmedWalletBalance ||
    Number.isFinite(parseLocalNumber(trimmedWalletBalance));
  const isCreditLimitValid =
    !creditLimit.trim() || Number.isFinite(parseLocalNumber(creditLimit));

  return (
    <div className="card-premium rounded-[28px] p-6" data-testid={TEST_IDS.walletForm}>
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
            data-testid={TEST_IDS.walletNameInput}
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
              data-testid={TEST_IDS.walletTypeSelect}
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

          {isCreditWallet ? (
            <div>
              <label className="mb-1.5 block text-ui-label">
                Limite total ({currency})
              </label>

              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex. 5000,00"
                className="field-premium w-full rounded-2xl px-3.5 py-3 font-mono text-sm outline-none transition-all duration-200 placeholder:text-slate-500"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-ui-muted">
                Limite do cartão. Se deixar vazio, o cartão nasce com limite zero.
              </p>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-ui-label">
                Saldo Inicial ({currency})
              </label>

              <input
                type="text"
                data-testid={TEST_IDS.walletBalanceInput}
                inputMode="decimal"
                placeholder="Ex. 1500,00"
                className="field-premium w-full rounded-2xl px-3.5 py-3 font-mono text-sm outline-none transition-all duration-200 placeholder:text-slate-500"
                value={walletBalance}
                onChange={(e) => setWalletBalance(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-ui-muted">
                Saldo inicial opcional. Você poderá adicionar valores depois.
              </p>
            </div>
          )}
        </div>

        {isCreditWallet ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-ui-label">
                Fechamento da fatura
              </label>
              <input
                type="number"
                min={1}
                max={31}
                placeholder="Ex. 10"
                className="field-premium w-full rounded-2xl px-3.5 py-3 text-sm outline-none transition-all duration-200 placeholder:text-slate-500"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-ui-label">
                Vencimento da fatura
              </label>
              <input
                type="number"
                min={1}
                max={31}
                placeholder="Ex. 18"
                className="field-premium w-full rounded-2xl px-3.5 py-3 text-sm outline-none transition-all duration-200 placeholder:text-slate-500"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        <WalletColorPicker
          value={selectedColorIndex}
          onChange={setSelectedColorIndex}
          data-testid={TEST_IDS.walletColorPicker}
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
                {isCreditWallet ? "Limite total" : "Saldo Estimado"}
              </span>

              <span className="font-mono text-2xl font-bold tracking-tight text-white">
                {isCreditWallet
                  ? formatMoney(safePreviewCreditLimit, currency)
                  : formatMoney(safePreviewBalance, currency)}
              </span>

              {isCreditWallet ? (
                <p className="mt-2 text-xs leading-5 text-white/75">
                  Cartões começam com saldo operacional zerado e limite separado.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="submit"
          data-testid={TEST_IDS.walletFormSubmitButton}
          disabled={
            !walletName.trim() ||
            (!isCreditWallet ? !isWalletBalanceValid : !isCreditLimitValid) ||
            isSubmitting
          }
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
