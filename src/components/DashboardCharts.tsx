import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Wallet, Transaction } from "../types";
import { PRESET_CATEGORIES } from "../utils/constants";
import { formatMoney } from "../utils/formatMoney";
import { useTheme } from "../context/ThemeProvider";
import {
  PieChart as PieIcon,
  BarChart3,
  CreditCard,
  Wallet as WalletIcon,
  TrendingUp,
} from "lucide-react";

interface DashboardChartsProps {
  transactions?: Transaction[];
  wallets?: Wallet[];
  currency: "BRL" | "USD" | "EUR";
}

const COLORS = {
  realBalance: "#6366f1",
  creditAvailable: "#a78bfa",
  realExpense: "#fb923c",
  creditExpense: "#f43f5e",
  income: "#34d399",
};

const CATEGORY_COLORS = [
  "#7c3aed",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#fb923c",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
];

function getWalletIdFromTransaction(transaction: any) {
  return transaction.walletId || transaction.wallet_id || "";
}

function getWalletType(type?: string) {
  return String(type || "").toLowerCase();
}

function isCreditWallet(wallet?: Wallet) {
  return getWalletType(wallet?.type) === "credit";
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatTrendSummary(current: number, previous: number) {
  if (previous <= 0 && current <= 0) return "Sem movimentação recente";
  if (previous <= 0) return "Começou a movimentar agora";

  const diff = current - previous;
  const percent = Math.abs(Math.round((diff / previous) * 100));

  if (diff === 0) return "Praticamente estável";
  return diff > 0 ? `Subiu ${percent}%` : `Caiu ${percent}%`;
}

export default function DashboardCharts({
  transactions = [],
  wallets = [],
  currency,
}: DashboardChartsProps) {
  const { resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"overview" | "categories">(
    "overview"
  );
  const isLight = resolvedTheme === "light";
  const chartAxisColor = isLight ? "#64748b" : "#94a3b8";
  const chartGridColor = isLight
    ? "rgba(100, 116, 139, 0.18)"
    : "rgba(148,163,184,0.18)";
  const chartTooltipSurface = isLight ? "#ffffff" : "#0f172a";
  const chartTooltipText = isLight ? "#0f172a" : "#ffffff";
  const cardToneClass = isLight
    ? "border-slate-200/80 bg-white/88 shadow-[0_16px_42px_rgba(15,23,42,0.08)]"
    : "border-white/10 bg-white/5";

  const walletById = useMemo(() => {
    return wallets.reduce<Record<string, Wallet>>((acc, wallet) => {
      acc[wallet.id] = wallet;
      return acc;
    }, {});
  }, [wallets]);

  const financialOverview = useMemo(() => {
    const realBalance = wallets
      .filter((wallet) => !isCreditWallet(wallet))
      .reduce((acc, wallet) => acc + Number(wallet.balance || 0), 0);

    const creditAvailable = wallets
      .filter((wallet) => isCreditWallet(wallet))
      .reduce((acc, wallet) => acc + Number(wallet.balance || 0), 0);

    const income = transactions
      .filter((transaction) => transaction.type === "income")
      .reduce((acc, transaction) => acc + Number(transaction.amount || 0), 0);

    const realExpense = transactions
      .filter((transaction) => {
        const wallet = walletById[getWalletIdFromTransaction(transaction)];
        return transaction.type === "expense" && !isCreditWallet(wallet);
      })
      .reduce((acc, transaction) => acc + Number(transaction.amount || 0), 0);

    const creditExpense = transactions
      .filter((transaction) => {
        const wallet = walletById[getWalletIdFromTransaction(transaction)];
        return transaction.type === "expense" && isCreditWallet(wallet);
      })
      .reduce((acc, transaction) => acc + Number(transaction.amount || 0), 0);

    return {
      realBalance,
      creditAvailable,
      income,
      realExpense,
      creditExpense,
      totalExpense: realExpense + creditExpense,
    };
  }, [wallets, transactions, walletById]);

  const timelineData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - index));

      return {
        rawDate: date.toISOString().slice(0, 10),
        date: formatDateLabel(date),
        entradas: 0,
        gastos: 0,
      };
    });

    transactions.forEach((transaction) => {
      const transactionDate = String(transaction.date || "").slice(0, 10);
      const day = days.find((item) => item.rawDate === transactionDate);

      if (!day) return;

      const amount = Number(transaction.amount || 0);

      if (transaction.type === "income") {
        day.entradas += amount;
      }

      if (transaction.type === "expense") {
        day.gastos += amount;
      }
    });

    return days;
  }, [transactions]);

  const expensesByCategory = useMemo(() => {
    const totals: Record<
      string,
      {
        name: string;
        value: number;
        creditValue: number;
        realValue: number;
        color: string;
      }
    > = {};

    transactions
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => {
        const categoryObj = PRESET_CATEGORIES.find(
          (cat) =>
            cat.name.toLowerCase() ===
              String(transaction.category).toLowerCase() ||
            cat.id === String(transaction.category).toLowerCase()
        );

        const catName = categoryObj ? categoryObj.name : transaction.category;
        const wallet = walletById[getWalletIdFromTransaction(transaction)];
        const isCredit = isCreditWallet(wallet);
        const amount = Number(transaction.amount || 0);

        if (!totals[catName]) {
          totals[catName] = {
            name: catName,
            value: 0,
            creditValue: 0,
            realValue: 0,
            color: "#000",
          };
        }

        totals[catName].value += amount;
        if (isCredit) totals[catName].creditValue += amount;
        else totals[catName].realValue += amount;
      });

    return Object.values(totals)
      .sort((a, b) => b.value - a.value)
      .map((item, index) => ({
        ...item,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }));
  }, [transactions, walletById]);

  const simpleReading = useMemo(() => {
    const last7 = timelineData.slice(-7);
    const prev7 = timelineData.slice(0, 7);

    const last7Income = last7.reduce(
      (acc, item) => acc + Number(item.entradas || 0),
      0
    );
    const prev7Income = prev7.reduce(
      (acc, item) => acc + Number(item.entradas || 0),
      0
    );
    const last7Expenses = last7.reduce(
      (acc, item) => acc + Number(item.gastos || 0),
      0
    );
    const prev7Expenses = prev7.reduce(
      (acc, item) => acc + Number(item.gastos || 0),
      0
    );

    const totalExpense = financialOverview.totalExpense;
    const creditShare =
      totalExpense > 0
        ? Math.round((financialOverview.creditExpense / totalExpense) * 100)
        : 0;

    return {
      incomeTrend: formatTrendSummary(last7Income, prev7Income),
      expenseTrend: formatTrendSummary(last7Expenses, prev7Expenses),
      creditShare,
      balanceNote:
        financialOverview.totalExpense > financialOverview.income
          ? "Os gastos já passaram das entradas"
          : financialOverview.totalExpense > 0
          ? "Os gastos ainda estão abaixo das entradas"
          : "Ainda não há gastos registrados",
    };
  }, [financialOverview, timelineData]);

  const hasExpenses = financialOverview.totalExpense > 0;

  return (
    <div className="card-premium rounded-[28px] p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className={`mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 ${isLight ? "border-slate-200 bg-white text-slate-700" : "border-white/10 bg-white/6 text-slate-300"} text-ui-label`}>
            <BarChart3 size={12} />
            Análise financeira
          </div>
          <h3 className="font-display text-lg font-bold text-ui-title">
            Entenda seu dinheiro com mais clareza
          </h3>
          <p className="mt-1 text-sm leading-6 text-ui-muted">
            Entradas, gastos e uso do cartão explicados de forma simples.
          </p>
        </div>

        <div className={`flex rounded-2xl border p-1 ${isLight ? "border-slate-200 bg-white/90" : "border-white/10 bg-white/6"}`}>
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              activeTab === "overview"
                ? isLight
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-950 shadow-xs"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BarChart3 size={14} />
            Visão simples
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              activeTab === "categories"
                ? isLight
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-950 shadow-xs"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <PieIcon size={14} />
            Por categoria
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-3">
        <div className={`rounded-2xl p-4 ${cardToneClass}`}>
          <span className="text-ui-label">
            Resumo rápido
          </span>
          <p className="mt-2 text-sm leading-6 text-ui-body">
            {simpleReading.balanceNote}.{" "}
            {simpleReading.creditShare > 0
              ? `${simpleReading.creditShare}% dos gastos foram no cartão.`
              : "Ainda não houve gastos no cartão."}
          </p>
        </div>

        <div className={`rounded-2xl p-4 ${cardToneClass}`}>
          <span className="text-ui-label">
            Entradas
          </span>
          <p className="mt-2 text-sm leading-6 text-ui-body">
            {simpleReading.incomeTrend} em relação à semana anterior.
          </p>
        </div>

        <div className={`rounded-2xl p-4 ${cardToneClass}`}>
          <span className="text-ui-label">
            Gastos
          </span>
          <p className="mt-2 text-sm leading-6 text-ui-body">
            {simpleReading.expenseTrend} em relação à semana anterior.
          </p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [
            "Dinheiro disponível",
            financialOverview.realBalance,
            COLORS.realBalance,
            WalletIcon,
          ],
          [
            "Limite livre",
            financialOverview.creditAvailable,
            COLORS.creditAvailable,
            CreditCard,
          ],
          [
            "Gasto no dinheiro",
            financialOverview.realExpense,
            COLORS.realExpense,
            TrendingUp,
          ],
          [
            "Gasto no cartão",
            financialOverview.creditExpense,
            COLORS.creditExpense,
            CreditCard,
          ],
        ].map(([label, value, color, Icon]: any) => (
              <div key={label} className={`rounded-2xl p-4 ${cardToneClass}`}>
            <div
              className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em]"
              style={{ color }}
            >
              <Icon size={14} />
              {label}
            </div>

            <strong className="block text-xl text-ui-value">
              {formatMoney(value, currency)}
            </strong>
          </div>
        ))}
      </div>

      <div className="min-h-[380px] w-full overflow-hidden">
        {activeTab === "overview" ? (
          <div className={`h-[360px] w-full rounded-[24px] p-4 ${cardToneClass}`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-ui-title">
                  Seu dinheiro nos últimos 14 dias
                </p>
                <p className="mt-1 text-xs text-ui-muted">
                  Linha verde = entradas. Linha laranja = gastos.
                </p>
              </div>

              <div className="flex gap-3 text-[11px] font-bold text-ui-muted">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Entradas
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  Gastos
                </span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height="82%">
              <LineChart
                data={timelineData}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={chartGridColor}
                />

                <XAxis
                  dataKey="date"
                  fontSize={10}
                  stroke={chartAxisColor}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  fontSize={10}
                  stroke={chartAxisColor}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) =>
                    formatMoney(value, currency).split(",")[0]
                  }
                />

                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatMoney(value, currency),
                    name === "entradas" ? "Entradas" : "Gastos",
                  ]}
                    labelStyle={{ color: chartTooltipText }}
                    contentStyle={{
                      background: chartTooltipSurface,
                      border: `1px solid ${isLight ? "rgba(15,23,42,0.08)" : "transparent"}`,
                      borderRadius: "14px",
                      color: chartTooltipText,
                      fontSize: "12px",
                      boxShadow: isLight
                        ? "0 16px 34px rgba(15,23,42,0.12)"
                        : "none",
                    }}
                  />

                <Line
                  type="monotone"
                  dataKey="entradas"
                  stroke={COLORS.income}
                  strokeWidth={3}
                  dot={{ r: 3, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />

                <Line
                  type="monotone"
                  dataKey="gastos"
                  stroke={COLORS.realExpense}
                  strokeWidth={3}
                  dot={{ r: 3, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : hasExpenses ? (
          <div className="grid min-h-[360px] grid-cols-1 gap-6 xl:grid-cols-[0.75fr_1.25fr]">
            <div className="relative flex min-h-[320px] items-center justify-center">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={108}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {expensesByCategory.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatMoney(value, currency),
                      name,
                    ]}
                    contentStyle={{
                      background: chartTooltipSurface,
                      border: `1px solid ${isLight ? "rgba(15,23,42,0.08)" : "transparent"}`,
                      borderRadius: "14px",
                      color: chartTooltipText,
                      fontSize: "12px",
                      boxShadow: isLight
                        ? "0 16px 34px rgba(15,23,42,0.12)"
                        : "none",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
                <span className="text-ui-label">
                  Total gasto
                </span>
                <span className="mt-1 font-mono text-base text-ui-value">
                  {formatMoney(financialOverview.totalExpense, currency)}
                </span>
              </div>
            </div>

            <div className="flex h-[320px] min-h-0 flex-col gap-2 overflow-y-auto pb-3 pr-3">
              {expensesByCategory.map((item) => {
                const percentage = financialOverview.totalExpense
                  ? ((item.value / financialOverview.totalExpense) * 100).toFixed(1)
                  : "0";

                return (
                  <div
                    key={item.name}
                    className={`rounded-2xl p-3 transition hover:shadow-xs ${cardToneClass}`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />

                        <strong className="truncate text-xs font-bold text-ui-title">
                          {item.name}
                        </strong>
                      </div>

                      <span className="shrink-0 font-mono text-xs font-bold text-ui-value">
                        {formatMoney(item.value, currency)}
                      </span>
                    </div>

                    <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px] text-ui-muted">
                      <span>{percentage}% dos gastos</span>
                      <span className="truncate text-right">
                        Dinheiro: {formatMoney(item.realValue, currency)} · Cartão:{" "}
                        {formatMoney(item.creditValue, currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`flex h-[340px] flex-col items-center justify-center rounded-2xl border-2 border-dashed text-ui-muted ${isLight ? "border-slate-200 bg-white/90" : "border-white/10 bg-white/5"}`}>
            <TrendingUp size={36} className={`mb-2 ${isLight ? "text-indigo-400/80" : "text-indigo-300/60"}`} />
            <p className="text-sm font-semibold text-ui-title">
              Sem gastos cadastrados
            </p>
            <p className="mt-1 px-4 text-center text-xs text-ui-muted">
              Registre uma saída para ver como o dinheiro foi dividido.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
