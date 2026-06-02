import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  BadgeCheck,
  BadgeDollarSign,
  CalendarRange,
  CircleDollarSign,
  Clock3,
  LineChart,
  NotebookPen,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet as WalletIcon,
} from "lucide-react";

import type { Transaction, Wallet } from "../types";
import { useTheme } from "../context/ThemeProvider";
import { formatMoney } from "../utils/formatMoney";
import {
  buildFinancialSnapshot,
  buildWalletBalanceSummary,
} from "../utils/financialSnapshot";
import {
  buildSubscriptionOverview,
  type SubscriptionOverride,
  SUBSCRIPTION_OVERRIDES_STORAGE_KEY,
} from "../utils/subscriptions";
import {
  formatLocalDateInputValue,
  formatLocalDateLabel,
  parseLocalDateValue,
} from "../utils/date";
import { getStorageItem, setStorageItem } from "../services/storage";
import { TEST_IDS } from "../utils/testIds";
import DashboardCharts from "./DashboardCharts";
import CoachPibble from "./CoachPibble";
import {
  resolveDashboardInsightTargets,
  getDashboardSectionLabel,
  scrollToDashboardSection,
  type DashboardSectionId,
  type DashboardInsightTargets,
} from "../utils/dashboardNavigation";

interface DashboardCommandCenterProps {
  wallets: Wallet[];
  transactions: Transaction[];
  currency: "BRL" | "USD" | "EUR";
  onNavigateTab?: (tab: "wallets" | "transactions") => void;
  onRequestDeepDive?: (targets: DashboardInsightTargets) => void;
  deepDiveRequest?: {
    requestId: number;
    primarySectionId: DashboardSectionId;
    relatedSectionIds: DashboardSectionId[];
  } | null;
  onDeepDiveHandled?: () => void;
  compact?: boolean;
}

interface MetricCard {
  label: string;
  value: number;
  note: string;
  tone: "neutral" | "positive" | "negative";
}

const MONTHLY_GOAL_STORAGE_KEY = "pibblefinance:monthly-saving-goal";

function getWalletTypeLabel(type?: string) {
  const normalized = String(type || "").toLowerCase();

  if (normalized === "credit") return "Crédito";
  if (normalized === "debit") return "Débito";
  if (normalized === "investment") return "Investimento";
  if (normalized === "cash") return "Dinheiro";
  if (normalized === "savings") return "Poupança";

  return "Carteira";
}

function formatCompactDate(date?: string | null) {
  if (!date) return "Sem data";
  const parsed = parseLocalDateValue(date);
  return parsed ? formatLocalDateLabel(date) : "Data inválida";
}

export default function DashboardCommandCenter({
  wallets,
  transactions,
  currency,
  onNavigateTab,
  onRequestDeepDive,
  deepDiveRequest,
  onDeepDiveHandled,
  compact = false,
}: DashboardCommandCenterProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [goalAmountInput, setGoalAmountInput] = useState<string>(() => {
    return String(getStorageItem<number>(MONTHLY_GOAL_STORAGE_KEY, 1000));
  });
  const [goalAmount, setGoalAmount] = useState<number>(() => {
    return getStorageItem<number>(MONTHLY_GOAL_STORAGE_KEY, 1000);
  });
  const [showCoach, setShowCoach] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deepDiveNotice, setDeepDiveNotice] = useState<string>("");
  const [isDeepDiveLoading, setIsDeepDiveLoading] = useState(false);
  const [highlightedSectionIds, setHighlightedSectionIds] = useState<
    DashboardSectionId[]
  >([]);
  const [subscriptionOverrides, setSubscriptionOverrides] = useState<
    Record<string, SubscriptionOverride>
  >(() => getStorageItem<Record<string, SubscriptionOverride>>(
    SUBSCRIPTION_OVERRIDES_STORAGE_KEY,
    {}
  ));

  useMemo(() => {
    setStorageItem(SUBSCRIPTION_OVERRIDES_STORAGE_KEY, subscriptionOverrides);
    return null;
  }, [subscriptionOverrides]);

  const totals = useMemo(
    () => buildFinancialSnapshot(wallets, transactions),
    [wallets, transactions]
  );

  const walletSummary = useMemo(
    () => buildWalletBalanceSummary(wallets, transactions),
    [wallets, transactions]
  );

  const subscriptionOverview = useMemo(
    () => buildSubscriptionOverview(wallets, transactions, subscriptionOverrides),
    [wallets, transactions, subscriptionOverrides]
  );

  const topWallets = useMemo(
    () =>
      [...wallets]
        .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
        .slice(0, 4),
    [wallets]
  );

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => {
          const aTime = parseLocalDateValue(a.date)?.getTime() || 0;
          const bTime = parseLocalDateValue(b.date)?.getTime() || 0;
          return bTime - aTime;
        })
        .slice(0, 5),
    [transactions]
  );

  const metricCards: MetricCard[] = [
    {
      label: "Saldo total",
      value: totals.cashBalance,
      note: "Caixa consolidado",
      tone: "neutral",
    },
    {
      label: "Entradas",
      value: totals.income,
      note: "Receitas registradas",
      tone: "positive",
    },
    {
      label: "Saídas",
      value: totals.totalExpenses,
      note: "Despesas do período",
      tone: "negative",
    },
    {
      label: "Economia",
      value: Math.max(totals.netCashFlow, 0),
      note: "Fluxo líquido positivo",
      tone: totals.netCashFlow >= 0 ? "positive" : "negative",
    },
  ];

  const goalProgress = goalAmount > 0 ? Math.min(1, Math.max(0, totals.netCashFlow / goalAmount)) : 0;
  const goalRemaining = Math.max(goalAmount - totals.netCashFlow, 0);
  const dueItems = subscriptionOverview.items.slice(0, 4);
  const deepDiveLoadingTimerRef = useRef<number | null>(null);
  const deepDiveScrollTimerRef = useRef<number | null>(null);
  const deepDiveClearTimerRef = useRef<number | null>(null);
  const sectionHighlightClass = isLight
    ? "ring-2 ring-indigo-400/35 shadow-[0_0_0_1px_rgba(99,102,241,0.14),0_0_40px_rgba(99,102,241,0.16)]"
    : "ring-2 ring-indigo-300/35 shadow-[0_0_0_1px_rgba(129,140,248,0.18),0_0_40px_rgba(99,102,241,0.2)]";

  function getSectionClass(sectionId: DashboardSectionId, baseClassName: string) {
    const isHighlighted = highlightedSectionIds.includes(sectionId);

    return `${baseClassName} scroll-mt-28 transition-all duration-500 ${isHighlighted ? sectionHighlightClass : ""}`;
  }

  function triggerDeepDive(targets: DashboardInsightTargets) {
    setIsDeepDiveLoading(true);
    onRequestDeepDive?.(targets);

    window.clearTimeout(deepDiveLoadingTimerRef.current ?? undefined);
    deepDiveLoadingTimerRef.current = window.setTimeout(() => {
      setIsDeepDiveLoading(false);
    }, 250);
  }

  useEffect(() => {
    return () => {
      window.clearTimeout(deepDiveLoadingTimerRef.current ?? undefined);
      window.clearTimeout(deepDiveScrollTimerRef.current ?? undefined);
      window.clearTimeout(deepDiveClearTimerRef.current ?? undefined);
    };
  }, []);

  useEffect(() => {
    if (!deepDiveRequest) return;

    const nextHighlightedSectionIds = [
      "dashboard-summary",
      deepDiveRequest.primarySectionId,
      ...deepDiveRequest.relatedSectionIds,
    ].filter((sectionId, index, array) => array.indexOf(sectionId) === index) as DashboardSectionId[];

    setShowAdvanced(true);
    setShowCoach(true);

    setHighlightedSectionIds(nextHighlightedSectionIds);

    window.clearTimeout(deepDiveScrollTimerRef.current ?? undefined);
    deepDiveScrollTimerRef.current = window.setTimeout(() => {
      const found =
        scrollToDashboardSection(deepDiveRequest.primarySectionId) ||
        scrollToDashboardSection("dashboard-summary");

      if (!found) {
        setDeepDiveNotice(
          `Não encontrei ${getDashboardSectionLabel(deepDiveRequest.primarySectionId)} nesta visão.`
        );
      } else {
        setDeepDiveNotice(
          `Abrindo ${getDashboardSectionLabel(deepDiveRequest.primarySectionId)}.`
        );
      }

      window.clearTimeout(deepDiveClearTimerRef.current ?? undefined);
      deepDiveClearTimerRef.current = window.setTimeout(() => {
        setDeepDiveNotice("");
        setHighlightedSectionIds([]);
        onDeepDiveHandled?.();
      }, 2600);
    }, 80);
  }, [deepDiveRequest, onDeepDiveHandled]);

  function saveGoal() {
    const parsed = Number(String(goalAmountInput).replace(",", "."));
    const nextGoal = Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
    setGoalAmount(nextGoal);
    setGoalAmountInput(String(nextGoal));
    setStorageItem(MONTHLY_GOAL_STORAGE_KEY, nextGoal);
  }

  const shellClass = compact
    ? "space-y-4"
    : "space-y-5 xl:space-y-6";

  return (
    <div className={shellClass} data-testid={TEST_IDS.dashboardPageDesktop}>
      <section className="card-premium rounded-[32px] p-5 lg:p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-200">
              <Sparkles size={12} />
              Centro de comando
            </div>
            <h2 className={`text-3xl font-black tracking-tight ${isLight ? "text-slate-950" : "text-white"}`}>
              Dashboard de decisão financeira
            </h2>
            <p className={`mt-2 max-w-2xl text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              A visão operacional que prioriza saldo, fluxo, risco e próximos movimentos sem pedir scroll desnecessário.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab?.("transactions")}
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                isLight
                  ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              Ver transações
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab?.("wallets")}
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Abrir carteiras
            </button>
          </div>
        </div>

        <div className={compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-3 md:grid-cols-2 xl:grid-cols-4"}>
          {metricCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-[24px] border p-4 ${
                isLight
                  ? "border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`block text-[10px] font-bold uppercase tracking-[0.24em] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    {card.label}
                  </span>
                  <strong className={`mt-2 block text-[1.35rem] font-black tracking-tight tabular-nums ${isLight ? "text-slate-950" : "text-white"}`}>
                    {formatMoney(card.value, currency)}
                  </strong>
                </div>

                <div className={`rounded-2xl border p-2 ${isLight ? "border-slate-200 bg-slate-50 text-slate-600" : "border-white/10 bg-white/6 text-slate-200"}`}>
                  {card.tone === "positive" ? (
                    <TrendingUp size={16} className="text-emerald-300" />
                  ) : card.tone === "negative" ? (
                    <TrendingDown size={16} className="text-rose-300" />
                  ) : (
                    <CircleDollarSign size={16} className="text-indigo-300" />
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className={`text-xs font-semibold ${
                  card.tone === "positive"
                    ? "text-emerald-300"
                    : card.tone === "negative"
                    ? "text-rose-300"
                    : "text-slate-400"
                }`}>
                  {card.note}
                </span>
                <span className={`text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  {card.label === "Economia" && totals.netCashFlow < 0 ? "Atenção" : "Resumo"}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <DashboardCharts
              wallets={wallets}
              transactions={transactions}
              currency={currency}
              highlightedSectionIds={highlightedSectionIds}
            />
          </div>

          <div className="space-y-4 xl:col-span-4">
            <div
              className={getSectionClass(
                "dashboard-summary",
                `rounded-[28px] border p-5 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    <NotebookPen size={12} />
                    Coach Pibble
                  </div>
                  <h3 className={`mt-3 text-xl font-black tracking-tight ${isLight ? "text-slate-950" : "text-white"}`}>
                    {totals.mainInsight.title}
                  </h3>
                </div>

                <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/6"}`}>
                  <span className={`text-lg font-black ${isLight ? "text-slate-950" : "text-white"}`}>{totals.healthScore}</span>
                  <span className={`text-[9px] uppercase tracking-[0.2em] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    score
                  </span>
                </div>
              </div>

              <p className={`text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                {totals.mainInsight.text}
              </p>

              <button
                type="button"
                onClick={() =>
                  triggerDeepDive(resolveDashboardInsightTargets(totals.mainInsight))
                }
                disabled={isDeepDiveLoading}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                  isLight
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    : "border-indigo-400/20 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/15"
                }`}
              >
                <Sparkles size={14} />
                {isDeepDiveLoading ? "Abrindo..." : "Ver descrição profunda"}
              </button>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className={`rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/6"}`}>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                    Saúde
                  </span>
                  <strong className="mt-1 block text-sm font-black text-white">
                    {totals.healthLabel}
                  </strong>
                </div>
                <div className={`rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/6"}`}>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                    Fluxo
                  </span>
                  <strong className={`mt-1 block text-sm font-black tabular-nums ${totals.netCashFlow >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {formatMoney(totals.netCashFlow, currency)}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCoach((prev) => !prev)}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  isLight
                    ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {showCoach ? "Ocultar análise completa" : "Ver análise completa"}
              </button>

              {deepDiveNotice ? (
                <p
                  aria-live="polite"
                  className={`mt-3 text-xs leading-5 ${isLight ? "text-slate-500" : "text-slate-400"}`}
                >
                  {deepDiveNotice}
                </p>
              ) : null}
            </div>

            <div
              id="wallet-performance-chart"
              className={getSectionClass(
                "wallet-performance-chart",
                `rounded-[28px] border p-5 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    <WalletIcon size={12} />
                    Carteiras em foco
                  </div>
                  <p className={`mt-2 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                    Saldos principais em uma leitura compacta.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateTab?.("wallets")}
                  className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                    isLight
                      ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  Ver todas
                </button>
              </div>

              <div className="space-y-2">
                {topWallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}
                  >
                    <div className="min-w-0">
                      <strong className={`block truncate text-sm font-black ${isLight ? "text-slate-950" : "text-white"}`}>
                        {wallet.name}
                      </strong>
                      <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        {getWalletTypeLabel(wallet.type)}
                      </p>
                    </div>

                    <strong className={`font-mono text-sm font-black tabular-nums ${isLight ? "text-slate-950" : "text-white"}`}>
                      {formatMoney(wallet.balance || 0, wallet.currency || currency)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={compact ? "mt-4 space-y-4" : "mt-4 grid gap-4 xl:grid-cols-12"}>
          <div className={`xl:col-span-7 rounded-[28px] border p-5 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  <Clock3 size={12} />
                  Histórico recente
                </div>
                <p className={`mt-2 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  Os últimos lançamentos em uma lista mais densa.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab?.("transactions")}
                className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                  isLight
                    ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                Abrir histórico
              </button>
            </div>

            <div className="space-y-2.5">
              {recentTransactions.map((transaction) => {
                const dateValue = parseLocalDateValue(transaction.date);
                const tone =
                  transaction.type === "income"
                    ? "text-emerald-300"
                    : transaction.type === "expense"
                    ? "text-rose-300"
                    : "text-sky-300";

                return (
                  <div
                    key={transaction.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}
                  >
                    <div className="min-w-0">
                      <strong className={`block truncate text-sm font-black ${isLight ? "text-slate-950" : "text-white"}`}>
                        {transaction.description || "Lançamento"}
                      </strong>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {dateValue ? formatLocalDateLabel(transaction.date) : "Data inválida"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`block text-sm font-black tabular-nums ${tone}`}>
                        {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : "↔"}
                        {formatMoney(transaction.amount, currency)}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        {transaction.type === "income"
                          ? "Entrada"
                          : transaction.type === "expense"
                          ? "Saída"
                          : "Transferência"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`xl:col-span-5 rounded-[28px] border p-5 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  <BadgeDollarSign size={12} />
                  Assinaturas e alertas
                </div>
                <p className={`mt-2 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  Um resumo compacto do que merece atenção.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className={`rounded-2xl border p-4 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
                <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Mensal</span>
                <strong className="mt-1 block text-lg font-black text-white">{formatMoney(subscriptionOverview.monthlyTotal, currency)}</strong>
              </div>
              <div className={`rounded-2xl border p-4 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
                <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Detectadas</span>
                <strong className="mt-1 block text-lg font-black text-white">{subscriptionOverview.items.length}</strong>
              </div>
              <div className={`rounded-2xl border p-4 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
                <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Próximos</span>
                <strong className="mt-1 block text-lg font-black text-white">{dueItems.length}</strong>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {subscriptionOverview.items.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border px-3 py-2.5 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className={`block truncate text-sm font-black ${isLight ? "text-slate-950" : "text-white"}`}>
                        {item.displayName}
                      </strong>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {item.frequency === "monthly" ? "Mensal" : "Anual"} · {formatMoney(item.amount, currency)}
                      </p>
                    </div>
                    <span className="text-right text-[11px] text-slate-500">
                      {formatCompactDate(item.nextChargeDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className={`mt-4 flex w-full items-center justify-between rounded-[26px] border px-4 py-3 text-left text-sm font-semibold transition ${
            isLight
              ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
          }`}
        >
          <span className="flex items-center gap-2">
            <CalendarRange size={14} className="text-indigo-300" />
            {showAdvanced ? "Ocultar detalhes avançados" : "Ver detalhes avançados"}
          </span>
          <span className="text-xs text-slate-400">
            Meta, vencimentos e leitura adicional
          </span>
        </button>

        {showAdvanced ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-12">
            <div
              id="subscriptions-chart"
              className={getSectionClass(
                "subscriptions-chart",
                `xl:col-span-5 rounded-[28px] border p-5 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`
              )}
            >
              <div className="mb-4 flex items-center gap-2">
                <Target size={14} className="text-indigo-300" />
                <strong className={`text-sm font-black uppercase tracking-[0.18em] ${isLight ? "text-slate-950" : "text-white"}`}>
                  Meta mensal
                </strong>
              </div>

              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={goalAmountInput}
                  onChange={(event) => setGoalAmountInput(event.target.value)}
                  className={`w-full rounded-2xl border px-3 py-3 text-sm outline-none ${
                    isLight
                      ? "border-slate-200 bg-white text-slate-900"
                      : "border-white/10 bg-slate-950 text-white"
                  }`}
                />
                <button
                  type="button"
                  onClick={saveGoal}
                  className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  Salvar
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>Progresso</span>
                  <span>{Math.round(goalProgress * 100)}%</span>
                </div>
                <div className="h-3 rounded-full bg-white/10">
                  <div
                    className="h-3 rounded-full bg-indigo-400"
                    style={{ width: `${goalProgress * 100}%` }}
                  />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className={`rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-slate-950/60"}`}>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Restante</span>
                    <strong className="mt-1 block text-base font-black text-white">{formatMoney(goalRemaining, currency)}</strong>
                  </div>
                  <div className={`rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-slate-950/60"}`}>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Carteiras</span>
                    <strong className="mt-1 block text-base font-black text-white">{wallets.length}</strong>
                  </div>
                  <div className={`rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-slate-950/60"}`}>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Resultado</span>
                    <strong className={`mt-1 block text-base font-black tabular-nums ${totals.netCashFlow >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {formatMoney(totals.netCashFlow, currency)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className={`xl:col-span-7 rounded-[28px] border p-5 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    <Clock3 size={12} />
                    Vencimentos
                  </div>
                  <p className={`mt-2 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                    Recorrências e sinais rápidos do que vem pela frente.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {dueItems.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Ainda não há recorrências identificadas.
                  </p>
                ) : (
                  dueItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}
                    >
                      <div className="min-w-0">
                        <strong className={`block truncate text-sm font-black ${isLight ? "text-slate-950" : "text-white"}`}>
                          {item.displayName}
                        </strong>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {item.frequency === "monthly" ? "Mensal" : "Anual"} · {item.walletName}
                        </p>
                      </div>
                      <div className="text-right">
                        <strong className="block text-sm font-black text-white">
                          {formatMoney(item.amount, currency)}
                        </strong>
                        <span className="text-[11px] text-slate-400">
                          {formatCompactDate(item.nextChargeDate)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {subscriptionOverview.insights.slice(0, 2).map((insight) => (
                  <div
                    key={insight.title}
                    className={`rounded-2xl border p-4 ${
                      isLight
                        ? insight.tone === "danger"
                          ? "border-rose-200 bg-rose-50"
                          : insight.tone === "warning"
                          ? "border-amber-200 bg-amber-50"
                          : "border-emerald-200 bg-emerald-50"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <strong className={`block text-sm font-black ${isLight ? "text-slate-950" : "text-white"}`}>
                      {insight.title}
                    </strong>
                    <p className={`mt-1 text-xs leading-5 ${isLight ? "text-slate-700" : "text-white/80"}`}>
                      {insight.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {showCoach ? (
              <div
                className={`xl:col-span-12 rounded-[28px] border p-4 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"} ${
                  highlightedSectionIds.length > 0 ? sectionHighlightClass : ""
                }`}
              >
                <CoachPibble
                  wallets={wallets}
                  transactions={transactions}
                  currency={currency}
                  onRequestDeepDive={onRequestDeepDive}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
