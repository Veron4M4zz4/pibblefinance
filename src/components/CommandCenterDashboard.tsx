import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowDownRight,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
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
  formatLocalDateInputValue,
  formatLocalDateLabel,
  normalizeLocalDateValue,
  parseLocalDateValue,
} from "../utils/date";
import { getStorageItem, setStorageItem } from "../services/storage";
import {
  buildFinancialSnapshot,
  buildWalletBalanceSummary,
} from "../utils/financialSnapshot";
import DashboardCharts from "./DashboardCharts";
import CoachPibble from "./CoachPibble";

interface DashboardCommandCenterProps {
  wallets: Wallet[];
  transactions: Transaction[];
  currency: "BRL" | "USD" | "EUR";
  onNavigateTab?: (tab: "wallets" | "transactions") => void;
  compact?: boolean;
}

interface MetricCard {
  label: string;
  value: number;
  previous: number;
  deltaPercent: number;
  direction: "up" | "down" | "flat";
  note: string;
  positiveWhenHigher: boolean;
}

interface DueItem {
  id: string;
  label: string;
  amount: number;
  dueDate: string;
  tone: "success" | "warning" | "danger";
  source: string;
  estimated: boolean;
}

interface CalendarItem {
  id: string;
  title: string;
  amount: number;
  tone: "income" | "expense" | "neutral";
  estimated?: boolean;
}

interface CalendarDayCell {
  dateValue: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  items: CalendarItem[];
}

const MONTHLY_GOAL_STORAGE_KEY = "pibblefinance:monthly-saving-goal";

const RECURRING_RULES = [
  {
    id: "aluguel",
    label: "Aluguel",
    keywords: ["aluguel", "rent"],
    defaultDay: 5,
    tone: "danger" as const,
  },
  {
    id: "internet",
    label: "Internet",
    keywords: ["internet", "wifi", "fibra", "banda larga"],
    defaultDay: 10,
    tone: "warning" as const,
  },
  {
    id: "cartao",
    label: "Cartão",
    keywords: ["cartao", "cartão", "fatura", "credito", "crédito"],
    defaultDay: 15,
    tone: "danger" as const,
  },
  {
    id: "assinaturas",
    label: "Assinaturas",
    keywords: [
      "assinatura",
      "subscription",
      "netflix",
      "spotify",
      "youtube premium",
      "icloud",
      "prime",
    ],
    defaultDay: 20,
    tone: "warning" as const,
  },
  {
    id: "recorrentes",
    label: "Contas recorrentes",
    keywords: ["luz", "água", "agua", "energia", "gás", "gas", "condomínio", "condominio"],
    defaultDay: 25,
    tone: "warning" as const,
  },
];

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function shiftMonth(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
}

function clampDayInMonth(year: number, monthIndex: number, desiredDay: number) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(desiredDay, 1), lastDay);
}

function getNextDueDate(reference: Date, preferredDay: number) {
  const current = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    clampDayInMonth(reference.getFullYear(), reference.getMonth(), preferredDay)
  );

  if (current < new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())) {
    const nextMonth = shiftMonth(reference, 1);
    return new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      clampDayInMonth(nextMonth.getFullYear(), nextMonth.getMonth(), preferredDay)
    );
  }

  return current;
}

function changePercent(current: number, previous: number) {
  if (previous <= 0) {
    if (current <= 0) return 0;
    return 100;
  }

  return ((current - previous) / previous) * 100;
}

function trendDirection(current: number, previous: number) {
  if (current === previous) return "flat" as const;
  return current > previous ? "up" : "down";
}

function formatTrendValue(percent: number, positiveWhenHigher: boolean) {
  const rounded = Math.round(Math.abs(percent));
  if (rounded === 0) return "Estável";

  if (positiveWhenHigher) {
    return `${percent >= 0 ? "+" : "-"}${rounded}%`;
  }

  return `${percent >= 0 ? "+" : "-"}${rounded}%`;
}

function normalizeSearchText(value: string) {
  return value.toLowerCase();
}

function buildMetricCards(
  currentIncome: number,
  previousIncome: number,
  currentExpenses: number,
  previousExpenses: number,
  currentSavings: number,
  previousSavings: number,
  currentInvestments: number,
  previousInvestments: number,
  currentLiquidBalance: number,
  previousLiquidBalance: number
): MetricCard[] {
  const incomeDelta = changePercent(currentIncome, previousIncome);
  const expenseDelta = changePercent(currentExpenses, previousExpenses);
  const savingsDelta = changePercent(currentSavings, previousSavings);
  const investmentsDelta = changePercent(currentInvestments, previousInvestments);
  const liquidDelta = changePercent(currentLiquidBalance, previousLiquidBalance);

  return [
    {
      label: "Entradas do mês",
      value: currentIncome,
      previous: previousIncome,
      deltaPercent: incomeDelta,
      direction: trendDirection(currentIncome, previousIncome),
      note: "Comparado ao mês anterior",
      positiveWhenHigher: true,
    },
    {
      label: "Saídas do mês",
      value: currentExpenses,
      previous: previousExpenses,
      deltaPercent: expenseDelta,
      direction: trendDirection(currentExpenses, previousExpenses),
      note: "Menor é melhor",
      positiveWhenHigher: false,
    },
    {
      label: "Economia acumulada",
      value: currentSavings,
      previous: previousSavings,
      deltaPercent: savingsDelta,
      direction: trendDirection(currentSavings, previousSavings),
      note: "Resultado líquido do mês",
      positiveWhenHigher: true,
    },
    {
      label: "Investimentos",
      value: currentInvestments,
      previous: previousInvestments,
      deltaPercent: investmentsDelta,
      direction: trendDirection(currentInvestments, previousInvestments),
      note: "Inclui aplicações e reserva",
      positiveWhenHigher: true,
    },
    {
      label: "Saldo líquido",
      value: currentLiquidBalance,
      previous: previousLiquidBalance,
      deltaPercent: liquidDelta,
      direction: trendDirection(currentLiquidBalance, previousLiquidBalance),
      note: "Todos os saldos consolidados",
      positiveWhenHigher: true,
    },
  ];
}

function buildRecurringDueItems(
  transactions: Transaction[],
  today = new Date()
): DueItem[] {
  const normalizedTransactions = transactions
    .filter((transaction) => transaction.type === "expense")
    .map((transaction) => ({
      transaction,
      description: normalizeSearchText(
        `${transaction.description || ""} ${transaction.category || ""}`
      ),
      date: parseLocalDateValue(transaction.date),
    }))
    .filter((item) => item.date)
    .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

  return RECURRING_RULES.map((rule) => {
    const matches = normalizedTransactions.filter((item) =>
      rule.keywords.some((keyword) => item.description.includes(keyword))
    );

    const latestMatch = matches[0];
    const preferredDay = latestMatch?.date?.getDate() || rule.defaultDay;
    const dueDate = getNextDueDate(today, preferredDay);

    const recentValues = matches.slice(0, 3).map((item) => Number(item.transaction.amount || 0));
    const amount =
      recentValues.length > 0
        ? recentValues.reduce((acc, value) => acc + value, 0) / recentValues.length
        : 0;

    return {
      id: rule.id,
      label: rule.label,
      amount,
      dueDate: formatLocalDateInputValue(dueDate),
      tone: rule.tone,
      source: matches.length > 0 ? `${matches.length} lançamento(s) recente(s)` : "Estimado",
      estimated: matches.length === 0,
    };
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function buildCalendarGrid(
  monthAnchor: Date,
  transactions: Transaction[],
  dueItems: DueItem[]
): CalendarDayCell[] {
  const { start, end } = getMonthRange(monthAnchor);
  const startOffset = start.getDay();
  const totalCells = 42;
  const todayKey = formatLocalDateInputValue();

  const eventMap = new Map<string, CalendarItem[]>();

  transactions.forEach((transaction) => {
    const dateValue = normalizeLocalDateValue(transaction.date);
    if (!dateValue) return;

    const parsed = parseLocalDateValue(dateValue);
    if (!parsed || !isSameMonth(parsed, monthAnchor)) return;

    const amount = Number(transaction.amount || 0);
    const tone: CalendarItem["tone"] =
      transaction.type === "income"
        ? "income"
        : transaction.type === "expense"
        ? "expense"
        : "neutral";

    const items = eventMap.get(dateValue) || [];
    items.push({
      id: transaction.id,
      title: transaction.description || transaction.category || "Lançamento",
      amount,
      tone,
      estimated: Boolean(transaction.dateEdited),
    });
    eventMap.set(dateValue, items);
  });

  dueItems.forEach((item) => {
    const parsed = parseLocalDateValue(item.dueDate);
    if (!parsed || !isSameMonth(parsed, monthAnchor)) return;

    const items = eventMap.get(item.dueDate) || [];
    items.push({
      id: `due-${item.id}`,
      title: item.label,
      amount: item.amount,
      tone: "neutral",
      estimated: item.estimated,
    });
    eventMap.set(item.dueDate, items);
  });

  return Array.from({ length: totalCells }, (_, index) => {
    const dayOffset = index - startOffset + 1;
    const cellDate = new Date(start.getFullYear(), start.getMonth(), dayOffset);
    const dateValue = formatLocalDateInputValue(cellDate);
    const isCurrentMonth = cellDate.getMonth() === monthAnchor.getMonth();
    return {
      dateValue,
      dayNumber: cellDate.getDate(),
      isCurrentMonth,
      isToday: dateValue === todayKey,
      items: eventMap.get(dateValue) || [],
    };
  });
}

export default function DashboardCommandCenter({
  wallets,
  transactions,
  currency,
  onNavigateTab,
  compact = false,
}: DashboardCommandCenterProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [goalAmountInput, setGoalAmountInput] = useState<string>(() => {
    const stored = getStorageItem<number>(MONTHLY_GOAL_STORAGE_KEY, 1000);
    return String(stored || 1000);
  });
  const [goalAmount, setGoalAmount] = useState<number>(() => {
    return getStorageItem<number>(MONTHLY_GOAL_STORAGE_KEY, 1000);
  });
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    formatLocalDateInputValue()
  );
  const [showAdvancedCharts, setShowAdvancedCharts] = useState(false);
  const [showCoach, setShowCoach] = useState(false);

  const totals = useMemo(
    () => buildFinancialSnapshot(wallets, transactions),
    [wallets, transactions]
  );

  const walletSummary = useMemo(
    () => buildWalletBalanceSummary(wallets, transactions),
    [wallets, transactions]
  );

  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const previousMonth = shiftMonth(currentMonth, -1);

  const monthTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const parsed = parseLocalDateValue(transaction.date);
      return parsed ? isSameMonth(parsed, today) : false;
    });
  }, [transactions, today.getFullYear(), today.getMonth()]);

  const previousMonthTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const parsed = parseLocalDateValue(transaction.date);
      return parsed ? isSameMonth(parsed, previousMonth) : false;
    });
  }, [transactions, previousMonth.getFullYear(), previousMonth.getMonth()]);

  const currentMonthIncome = useMemo(
    () =>
      monthTransactions
        .filter((item) => item.type === "income")
        .reduce((acc, item) => acc + Number(item.amount || 0), 0),
    [monthTransactions]
  );
  const previousMonthIncome = useMemo(
    () =>
      previousMonthTransactions
        .filter((item) => item.type === "income")
        .reduce((acc, item) => acc + Number(item.amount || 0), 0),
    [previousMonthTransactions]
  );
  const currentMonthExpenses = useMemo(
    () =>
      monthTransactions
        .filter((item) => item.type === "expense")
        .reduce((acc, item) => acc + Number(item.amount || 0), 0),
    [monthTransactions]
  );
  const previousMonthExpenses = useMemo(
    () =>
      previousMonthTransactions
        .filter((item) => item.type === "expense")
        .reduce((acc, item) => acc + Number(item.amount || 0), 0),
    [previousMonthTransactions]
  );

  const currentMonthSavings = Math.max(
    currentMonthIncome - currentMonthExpenses,
    0
  );
  const previousMonthSavings = Math.max(
    previousMonthIncome - previousMonthExpenses,
    0
  );

  const currentInvestments = useMemo(() => {
    return wallets
      .filter((wallet) => {
        const type = String(wallet.type || "").toLowerCase();
        return type === "investment" || type === "savings";
      })
      .reduce((acc, wallet) => acc + Number(wallet.balance || 0), 0);
  }, [wallets]);

  const previousInvestments = Math.max(
    0,
    currentInvestments - currentMonthSavings
  );

  const currentLiquidBalance = walletSummary.totalBalance;
  const previousLiquidBalance = Math.max(
    0,
    currentLiquidBalance - (currentMonthIncome - currentMonthExpenses)
  );

  const metricCards = useMemo(
    () =>
      buildMetricCards(
        currentMonthIncome,
        previousMonthIncome,
        currentMonthExpenses,
        previousMonthExpenses,
        currentMonthSavings,
        previousMonthSavings,
        currentInvestments,
        previousInvestments,
        currentLiquidBalance,
        previousLiquidBalance
      ),
    [
      currentMonthIncome,
      previousMonthIncome,
      currentMonthExpenses,
      previousMonthExpenses,
      currentMonthSavings,
      previousMonthSavings,
      currentInvestments,
      previousInvestments,
      currentLiquidBalance,
      previousLiquidBalance,
    ]
  );

  const goalProgress = goalAmount > 0 ? currentMonthSavings / goalAmount : 0;
  const goalRemaining = Math.max(goalAmount - currentMonthSavings, 0);
  const elapsedDays = today.getDate();
  const dailyPace = elapsedDays > 0 ? currentMonthSavings / elapsedDays : 0;
  const goalForecastDays =
    goalRemaining === 0
      ? 0
      : dailyPace > 0
      ? Math.ceil(goalRemaining / dailyPace)
      : null;
  const goalForecastDate =
    goalForecastDays !== null
      ? new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + goalForecastDays
        )
      : null;

  const dueItems = useMemo(
    () => buildRecurringDueItems(transactions, today),
    [transactions, today.getFullYear(), today.getMonth(), today.getDate()]
  );

  const calendarDays = useMemo(
    () => buildCalendarGrid(calendarMonth, transactions, dueItems),
    [calendarMonth, transactions, dueItems]
  );

  const selectedDayValue = normalizeLocalDateValue(selectedDate) || formatLocalDateInputValue();
  const selectedDayEvents = useMemo(
    () => calendarDays.find((day) => day.dateValue === selectedDayValue)?.items || [],
    [calendarDays, selectedDayValue]
  );

  const monthlyGoalTone =
    goalProgress >= 1 ? "success" : goalProgress >= 0.8 ? "warning" : "danger";

  const mainInsights = useMemo(() => {
    const insights = [
      totals.mainInsight,
      {
        tone:
          currentMonthSavings >= previousMonthSavings ? ("success" as const) : ("warning" as const),
        title:
          currentMonthSavings >= previousMonthSavings
            ? "Sua economia está melhor"
            : "Sua economia caiu no comparativo",
        text:
          currentMonthSavings >= previousMonthSavings
            ? `Você economizou ${Math.abs(Math.round(changePercent(currentMonthSavings, previousMonthSavings)))}% mais que no mês passado.`
            : `Sua economia ficou ${Math.abs(Math.round(changePercent(currentMonthSavings, previousMonthSavings)))}% abaixo do mês passado.`,
      },
      {
        tone: totals.expenseTrendPercent > 0 ? ("warning" as const) : ("success" as const),
        title:
          totals.expenseTrendPercent > 0
            ? "Gastos recentes subiram"
            : "Gastos recentes mais controlados",
        text:
          totals.expenseTrendPercent > 0
            ? `Seu gasto com saídas aumentou ${Math.round(totals.expenseTrendPercent)}% nos últimos 7 dias.`
            : `Seu gasto com saídas ficou ${Math.abs(Math.round(totals.expenseTrendPercent))}% abaixo dos 7 dias anteriores.`,
      },
    ];

    if (goalProgress >= 0.8 && goalProgress < 1) {
      insights.unshift({
        tone: "warning",
        title: "Você está perto da meta",
        text: `Faltam ${formatMoney(goalRemaining, currency)} para bater a meta mensal.`,
      });
    }

    if (goalProgress >= 1) {
      insights.unshift({
        tone: "success",
        title: "Meta mensal concluída",
        text: "Você já superou a economia planejada para este mês.",
      });
    }

    return insights.slice(0, 3);
  }, [
    currentMonthSavings,
    previousMonthSavings,
    currency,
    goalProgress,
    goalRemaining,
    totals.expenseTrendPercent,
    totals.mainInsight,
  ]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        const aTime = parseLocalDateValue(a.date)?.getTime() || 0;
        const bTime = parseLocalDateValue(b.date)?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [transactions]);

  function saveGoal() {
    const parsed = Number(goalAmountInput.replace(",", "."));
    const nextGoal = Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
    setGoalAmount(nextGoal);
    setGoalAmountInput(String(nextGoal));
    setStorageItem(MONTHLY_GOAL_STORAGE_KEY, nextGoal);
  }

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="card-premium rounded-[28px] p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-200">
                <Sparkles size={12} />
                Centro de comando
              </div>
              <h2 className={`mt-3 text-2xl font-black tracking-tight ${isLight ? "text-slate-950" : "text-white"}`}>
                Dashboard de decisão financeira
              </h2>
              <p className={`mt-2 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                Resumo direto do mês, metas e sinais importantes sem poluir a tela inicial.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {metricCards.map((card) => {
              const isHigherGood = card.positiveWhenHigher;
              const positiveTrend =
                card.direction === "flat"
                  ? "text-slate-400"
                  : isHigherGood
                  ? card.direction === "up"
                    ? "text-emerald-300"
                    : "text-rose-300"
                  : card.direction === "down"
                  ? "text-emerald-300"
                  : "text-rose-300";

              return (
                <div
                  key={card.label}
                  className={`rounded-[24px] border p-4 ${
                    isLight
                      ? "border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.06)]"
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
                      {card.direction === "up" ? (
                        <TrendingUp size={16} className={positiveTrend} />
                      ) : card.direction === "down" ? (
                        <TrendingDown size={16} className={positiveTrend} />
                      ) : (
                        <CircleDollarSign size={16} className={positiveTrend} />
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold ${positiveTrend}`}>
                      {card.direction === "flat"
                        ? "Estável"
                        : formatTrendValue(card.deltaPercent, card.positiveWhenHigher)}
                    </span>
                    <span className={`text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      {card.note}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className={`rounded-[28px] border p-5 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  <Target size={12} />
                  Meta mensal
                </div>
                <p className={`mt-2 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  Economizar {formatMoney(goalAmount, currency)}.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Progresso</span>
                <span>{Math.round(Math.min(goalProgress, 1) * 100)}%</span>
              </div>
              <div className="h-3 rounded-full bg-white/10">
                <div
                  className={`h-3 rounded-full ${
                    monthlyGoalTone === "success"
                      ? "bg-emerald-400"
                      : monthlyGoalTone === "warning"
                      ? "bg-amber-400"
                      : "bg-indigo-400"
                  }`}
                  style={{ width: `${Math.min(Math.max(goalProgress, 0), 1) * 100}%` }}
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className={`rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-slate-950/60"}`}>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Restante</span>
                  <strong className="mt-1 block text-base font-black text-white">{formatMoney(goalRemaining, currency)}</strong>
                </div>
                <div className={`rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-slate-950/60"}`}>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Status</span>
                  <strong className="mt-1 block text-base font-black text-white">
                    {goalProgress >= 1 ? "Meta concluída" : goalProgress >= 0.8 ? "Quase lá" : "Em construção"}
                  </strong>
                </div>
                <div className={`rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-slate-950/60"}`}>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Previsão</span>
                  <strong className="mt-1 block text-base font-black text-white">
                    {goalForecastDate
                      ? formatLocalDateLabel(formatLocalDateInputValue(goalForecastDate))
                      : "Sem ritmo definido"}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-[28px] border p-5 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  <Clock3 size={12} />
                  Próximos vencimentos
                </div>
                <p className={`mt-2 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  Contas recorrentes ordenadas por proximidade.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {dueItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className={`rounded-[20px] border px-4 py-3 ${
                    isLight
                      ? "border-slate-200 bg-white"
                      : item.tone === "danger"
                      ? "border-rose-400/20 bg-rose-500/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className={`text-sm font-black ${isLight ? "text-slate-950" : "text-white"}`}>
                          {item.label}
                        </strong>
                        {item.estimated ? (
                          <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                            Estimado
                          </span>
                        ) : null}
                      </div>
                      <p className={`mt-1 text-xs leading-5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                        {item.source}
                      </p>
                    </div>
                    <div className="text-right">
                      <strong className={`block text-sm font-black tabular-nums ${isLight ? "text-slate-950" : "text-white"}`}>
                        {item.amount > 0 ? formatMoney(item.amount, currency) : "Sem valor"}
                      </strong>
                      <span className="text-xs text-slate-400">{formatLocalDateLabel(item.dueDate)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className={`rounded-[28px] border p-5 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  <NotebookPen size={12} />
                  Insights do Coach Pibble
                </div>
                <p className={`mt-2 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  Alertas rápidos sem abrir painéis pesados.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {mainInsights.map((insight) => (
                <div
                  key={insight.title}
                  className={`rounded-[20px] border p-4 ${
                    isLight
                      ? insight.tone === "danger"
                        ? "border-rose-200 bg-rose-50"
                        : insight.tone === "warning"
                        ? "border-amber-200 bg-amber-50"
                        : "border-emerald-200 bg-emerald-50"
                      : insight.tone === "danger"
                      ? "border-rose-400/20 bg-rose-500/10"
                      : insight.tone === "warning"
                      ? "border-amber-400/20 bg-amber-500/10"
                      : "border-emerald-400/20 bg-emerald-500/10"
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

          <div className={`rounded-[28px] border p-5 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  <Clock3 size={12} />
                  Últimas movimentações
                </div>
                <p className={`mt-2 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  Os 4 lançamentos mais recentes.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {recentTransactions.slice(0, 4).map((transaction) => {
                const dateValue = normalizeLocalDateValue(transaction.date);
                const tone =
                  transaction.type === "income"
                    ? "text-emerald-300"
                    : transaction.type === "expense"
                    ? "text-rose-300"
                    : "text-sky-300";

                return (
                  <div
                    key={transaction.id}
                    className={`flex items-center justify-between gap-3 rounded-[20px] border px-4 py-3 ${
                      isLight
                        ? "border-slate-200 bg-white"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="min-w-0">
                      <strong className={`block truncate text-sm font-black ${isLight ? "text-slate-950" : "text-white"}`}>
                        {transaction.description || "Lançamento"}
                      </strong>
                      <p className="mt-1 text-xs text-slate-500">
                        {dateValue ? formatLocalDateLabel(dateValue) : "Data inválida"}
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
        </div>

        <div className={`rounded-[28px] border p-5 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className={`text-lg font-black ${isLight ? "text-slate-950" : "text-white"}`}>
                Abrir visão completa
              </h3>
              <p className={`mt-1 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                No desktop, a versão completa traz calendário, coach e análise profunda.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab?.("wallets")}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  isLight
                    ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                Carteiras
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab?.("transactions")}
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Transações
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card-premium rounded-[32px] p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-200">
              <Sparkles size={12} />
              Centro de comando
            </div>
            <h2 className={`text-3xl font-black tracking-tight ${isLight ? "text-slate-950" : "text-white"}`}>
              Dashboard de decisão financeira
            </h2>
            <p className={`mt-2 max-w-2xl text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              Veja em poucos segundos quanto entrou, saiu, quanto você economizou e quais contas merecem atenção agora.
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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {metricCards.map((card) => {
            const isHigherGood = card.positiveWhenHigher;
            const positiveTrend =
              card.direction === "flat"
                ? "text-slate-400"
                : isHigherGood
                ? card.direction === "up"
                  ? "text-emerald-300"
                  : "text-rose-300"
                : card.direction === "down"
                ? "text-emerald-300"
                : "text-rose-300";

            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-[28px] border p-5 ${
                  isLight
                    ? "border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`block text-[10px] font-bold uppercase tracking-[0.24em] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      {card.label}
                    </span>
                    <strong className={`mt-2 block text-[1.65rem] font-black tracking-tight tabular-nums ${isLight ? "text-slate-950" : "text-white"}`}>
                      {formatMoney(card.value, currency)}
                    </strong>
                  </div>

                  <div className={`rounded-2xl border p-2 ${isLight ? "border-slate-200 bg-slate-50 text-slate-600" : "border-white/10 bg-white/6 text-slate-200"}`}>
                    {card.direction === "up" ? (
                      <TrendingUp size={16} className={positiveTrend} />
                    ) : card.direction === "down" ? (
                      <TrendingDown size={16} className={positiveTrend} />
                    ) : (
                      <CircleDollarSign size={16} className={positiveTrend} />
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className={`text-xs font-semibold ${positiveTrend}`}>
                    {card.direction === "flat"
                      ? "Estável"
                      : formatTrendValue(card.deltaPercent, card.positiveWhenHigher)}
                  </span>
                  <span className={`text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    {card.note}
                  </span>
                </div>

                <div className={`mt-3 h-1.5 rounded-full ${isLight ? "bg-slate-100" : "bg-white/10"}`}>
                  <div
                    className={`h-1.5 rounded-full ${
                      card.label === "Saídas do mês"
                        ? "bg-rose-400"
                        : card.label === "Entradas do mês"
                        ? "bg-emerald-400"
                        : card.label === "Saldo líquido"
                        ? "bg-indigo-400"
                        : card.label === "Investimentos"
                        ? "bg-cyan-400"
                        : "bg-amber-400"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(12, Math.abs(card.deltaPercent) || 18)
                      )}%`,
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className={`rounded-[32px] border p-6 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  <Target size={12} />
                  Meta mensal
                </div>
                <h3 className={`mt-3 text-xl font-black tracking-tight ${isLight ? "text-slate-950" : "text-white"}`}>
                  Economizar {formatMoney(goalAmount, currency)}
                </h3>
                <p className={`mt-1 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  Atual: {formatMoney(currentMonthSavings, currency)} {goalForecastDate ? `• previsão ${formatLocalDateLabel(goalForecastDate.toISOString())}` : "• acompanhe seu ritmo diário"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={goalAmountInput}
                  onChange={(event) => setGoalAmountInput(event.target.value)}
                  className={`w-32 rounded-2xl border px-3 py-2 text-sm outline-none ${
                    isLight
                      ? "border-slate-200 bg-white text-slate-900"
                      : "border-white/10 bg-slate-950 text-white"
                  }`}
                />
                <button
                  type="button"
                  onClick={saveGoal}
                  className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  Salvar
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[26px] border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Progresso</span>
                <span>{Math.round(Math.min(goalProgress, 1) * 100)}%</span>
              </div>
              <div className="h-3 rounded-full bg-white/10">
                <div
                  className={`h-3 rounded-full ${
                    monthlyGoalTone === "success"
                      ? "bg-emerald-400"
                      : monthlyGoalTone === "warning"
                      ? "bg-amber-400"
                      : "bg-indigo-400"
                  }`}
                  style={{ width: `${Math.min(Math.max(goalProgress, 0), 1) * 100}%` }}
                />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className={`rounded-2xl border p-4 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-slate-950/60"}`}>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Restante</span>
                  <strong className="mt-1 block text-lg font-black text-white">{formatMoney(goalRemaining, currency)}</strong>
                </div>
                <div className={`rounded-2xl border p-4 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-slate-950/60"}`}>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Status</span>
                  <strong className="mt-1 block text-lg font-black text-white">
                    {goalProgress >= 1 ? "Meta concluída" : goalProgress >= 0.8 ? "Quase lá" : "Em construção"}
                  </strong>
                </div>
                <div className={`rounded-2xl border p-4 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-slate-950/60"}`}>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Previsão</span>
                  <strong className="mt-1 block text-lg font-black text-white">
                    {goalForecastDate
                      ? formatLocalDateLabel(formatLocalDateInputValue(goalForecastDate))
                      : "Sem ritmo definido"}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-[32px] border p-6 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  <Clock3 size={12} />
                  Próximos vencimentos
                </div>
                <p className={`mt-2 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  Aluguel, internet, cartão e recorrências estimadas por proximidade.
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
                Ver histórico
              </button>
            </div>

            <div className="space-y-3">
              {dueItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-[24px] border px-4 py-3 ${
                    isLight
                      ? "border-slate-200 bg-white"
                      : item.tone === "danger"
                      ? "border-rose-400/20 bg-rose-500/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className={`text-sm font-black ${isLight ? "text-slate-950" : "text-white"}`}>
                          {item.label}
                        </strong>
                        {item.estimated ? (
                          <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                            Estimado
                          </span>
                        ) : null}
                      </div>
                      <p className={`mt-1 text-xs leading-5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                        {item.source}
                      </p>
                    </div>
                    <div className="text-right">
                      <strong className={`block text-sm font-black tabular-nums ${isLight ? "text-slate-950" : "text-white"}`}>
                        {item.amount > 0 ? formatMoney(item.amount, currency) : "Sem valor"}
                      </strong>
                      <span className="text-xs text-slate-400">
                        {formatLocalDateLabel(item.dueDate)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-[32px] border p-6 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  <CalendarRange size={12} />
                  Calendário financeiro
                </div>
                <p className={`mt-2 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  Clique em uma data para ver lançamentos e vencimentos daquele dia.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCalendarMonth(shiftMonth(calendarMonth, -1))}
                  className={`rounded-2xl border p-2 transition ${
                    isLight
                      ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  <ChevronLeft size={16} />
                </button>
                <strong className="min-w-40 text-center text-sm font-black uppercase tracking-[0.18em] text-slate-300">
                  {getMonthLabel(calendarMonth)}
                </strong>
                <button
                  type="button"
                  onClick={() => setCalendarMonth(shiftMonth(calendarMonth, 1))}
                  className={`rounded-2xl border p-2 transition ${
                    isLight
                      ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-7 gap-2">
              {calendarDays.map((cell) => (
                <button
                  key={cell.dateValue}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateValue)}
                  className={`min-h-[84px] rounded-[20px] border p-2 text-left transition ${
                    cell.dateValue === selectedDayValue
                      ? "border-indigo-400/40 bg-indigo-500/10"
                      : isLight
                      ? "border-slate-200 bg-white hover:bg-slate-50"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  } ${cell.isCurrentMonth ? "" : "opacity-40"}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span
                      className={`text-xs font-black ${
                        cell.isToday
                          ? "text-indigo-300"
                          : isLight
                          ? "text-slate-950"
                          : "text-white"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {cell.items.length > 0 ? (
                      <span className="rounded-full bg-indigo-500/15 px-1.5 py-0.5 text-[9px] font-bold text-indigo-200">
                        {cell.items.length}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 space-y-1">
                    {cell.items.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className={`h-1.5 rounded-full ${
                          item.tone === "income"
                            ? "bg-emerald-400"
                            : item.tone === "expense"
                            ? "bg-rose-400"
                            : "bg-slate-400"
                        }`}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>

            <div className={`mt-4 rounded-[24px] border p-4 ${isLight ? "border-slate-200 bg-slate-50/80" : "border-white/10 bg-slate-950/40"}`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                    Dia selecionado
                  </span>
                  <strong className="mt-1 block text-lg font-black text-white">
                    {formatLocalDateLabel(selectedDayValue)}
                  </strong>
                </div>
                <CalendarDays className="text-indigo-300" size={18} />
              </div>

              <div className="space-y-2">
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhum lançamento ou vencimento nesse dia.</p>
                ) : (
                  selectedDayEvents.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between rounded-2xl border px-3 py-2 ${
                        isLight
                          ? "border-slate-200 bg-white text-slate-900"
                          : "border-white/10 bg-white/5 text-white"
                      }`}
                    >
                      <div className="min-w-0">
                        <strong className="block truncate text-sm font-bold">{item.title}</strong>
                        <p className="text-xs text-slate-500">
                          {item.estimated ? "Estimado" : "Lançamento real"}
                        </p>
                      </div>
                      <span className={`font-mono text-sm font-bold ${
                        item.tone === "income"
                          ? "text-emerald-300"
                          : item.tone === "expense"
                          ? "text-rose-300"
                          : "text-sky-300"
                      }`}>
                        {item.amount > 0 ? formatMoney(item.amount, currency) : "—"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className={`rounded-[32px] border p-6 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  <NotebookPen size={12} />
                  Insights do Coach Pibble
                </div>
                <p className={`mt-2 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  Sinais rápidos para decidir o que fazer agora.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCoach((prev) => !prev)}
                className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                  isLight
                    ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {showCoach ? "Ocultar coach" : "Abrir coach"}
              </button>
            </div>

            <div className="space-y-3">
              {mainInsights.map((insight) => (
                <div
                  key={insight.title}
                  className={`rounded-[24px] border p-4 ${
                    isLight
                      ? insight.tone === "danger"
                        ? "border-rose-200 bg-rose-50"
                        : insight.tone === "warning"
                        ? "border-amber-200 bg-amber-50"
                        : "border-emerald-200 bg-emerald-50"
                      : insight.tone === "danger"
                      ? "border-rose-400/20 bg-rose-500/10"
                      : insight.tone === "warning"
                      ? "border-amber-400/20 bg-amber-500/10"
                      : "border-emerald-400/20 bg-emerald-500/10"
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

            {showCoach ? (
              <div className="mt-5">
                <CoachPibble wallets={wallets} transactions={transactions} currency={currency} />
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className={`rounded-[32px] border p-6 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  <LineChart size={12} />
                  Leitura rápida
                </div>
                <p className={`mt-2 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  Um resumo direto para entender o momento financeiro em segundos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvancedCharts((prev) => !prev)}
                className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                  isLight
                    ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {showAdvancedCharts ? "Ocultar gráficos" : "Ver análise profunda"}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`rounded-[24px] border p-4 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-slate-950/40"}`}>
                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Hoje</span>
                <strong className="mt-2 block text-xl font-black text-white">{formatMoney(totals.cashBalance, currency)}</strong>
                <p className="mt-1 text-xs text-slate-400">Saldo disponível consolidado.</p>
              </div>
              <div className={`rounded-[24px] border p-4 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-slate-950/40"}`}>
                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Mescla</span>
                <strong className="mt-2 block text-xl font-black text-white">{formatMoney(walletSummary.totalBalance, currency)}</strong>
                <p className="mt-1 text-xs text-slate-400">Patrimônio líquido total.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onNavigateTab?.("transactions")}
                className={`flex items-center justify-between rounded-[24px] border px-4 py-3 text-left transition ${
                  isLight
                    ? "border-slate-200 bg-white hover:bg-slate-50"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Ir para</span>
                  <strong className="mt-1 block text-sm font-black text-white">Transações</strong>
                </span>
                <ArrowDownRight className="text-emerald-300" size={18} />
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab?.("wallets")}
                className={`flex items-center justify-between rounded-[24px] border px-4 py-3 text-left transition ${
                  isLight
                    ? "border-slate-200 bg-white hover:bg-slate-50"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Ir para</span>
                  <strong className="mt-1 block text-sm font-black text-white">Carteiras</strong>
                </span>
                <WalletIcon className="text-indigo-300" size={18} />
              </button>
            </div>
          </div>

          <div className={`rounded-[32px] border p-6 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  <Clock3 size={12} />
                  Últimas movimentações
                </div>
                <p className={`mt-2 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  O histórico recente para tomar decisões sem abrir outra tela.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {recentTransactions.map((transaction) => {
                const dateValue = normalizeLocalDateValue(transaction.date);
                const tone =
                  transaction.type === "income"
                    ? "text-emerald-300"
                    : transaction.type === "expense"
                    ? "text-rose-300"
                    : "text-sky-300";

                return (
                  <div
                    key={transaction.id}
                    className={`flex items-center justify-between gap-3 rounded-[22px] border px-4 py-3 ${
                      isLight
                        ? "border-slate-200 bg-white"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="min-w-0">
                      <strong className={`block truncate text-sm font-black ${isLight ? "text-slate-950" : "text-white"}`}>
                        {transaction.description || "Lançamento"}
                      </strong>
                      <p className="mt-1 text-xs text-slate-500">
                        {dateValue ? formatLocalDateLabel(dateValue) : "Data inválida"}
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
        </div>
      </div>

      {showAdvancedCharts ? (
        <div className={`rounded-[32px] border p-6 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
          <DashboardCharts wallets={wallets} transactions={transactions} currency={currency} />
        </div>
      ) : null}
    </div>
  );
}
