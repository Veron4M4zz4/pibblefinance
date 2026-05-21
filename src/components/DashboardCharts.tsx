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

export default function DashboardCharts({
  transactions = [],
  wallets = [],
  currency,
}: DashboardChartsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "categories">(
    "overview"
  );

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

  const hasExpenses = financialOverview.totalExpense > 0;

  return (
    <div className="card-premium rounded-[28px] p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
            <BarChart3 size={12} />
            Análise financeira
          </div>
          <h3 className="font-display text-lg font-bold text-white">
            Fluxo e gastos
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Veja suas entradas, saídas e o peso do crédito em um resumo visual.
          </p>
        </div>

        <div className="flex rounded-2xl border border-white/10 bg-white/6 p-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              activeTab === "overview"
                ? "bg-white text-slate-950 shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BarChart3 size={14} />
            Visão geral
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              activeTab === "categories"
                ? "bg-white text-slate-950 shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <PieIcon size={14} />
            Gastos
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Saldo", financialOverview.realBalance, COLORS.realBalance, WalletIcon],
          ["Crédito", financialOverview.creditAvailable, COLORS.creditAvailable, CreditCard],
          ["Gasto no saldo", financialOverview.realExpense, COLORS.realExpense, TrendingUp],
          ["Gasto no crédito", financialOverview.creditExpense, COLORS.creditExpense, CreditCard],
        ].map(([label, value, color, Icon]: any) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div
              className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em]"
              style={{ color }}
            >
              <Icon size={14} />
              {label}
            </div>

            <strong className="block text-xl font-black tracking-tight text-white">
              {formatMoney(value, currency)}
            </strong>
          </div>
        ))}
      </div>

      <div className="min-h-[380px] w-full overflow-hidden">
        {activeTab === "overview" ? (
          <div className="h-[360px] w-full rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-white">
                  Fluxo dos últimos 14 dias
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Entradas versus gastos no período.
                </p>
              </div>

              <div className="flex gap-3 text-[11px] font-bold text-slate-400">
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
                  stroke="rgba(148,163,184,0.18)"
                />

                <XAxis
                  dataKey="date"
                  fontSize={10}
                  stroke="#94a3b8"
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  fontSize={10}
                  stroke="#94a3b8"
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
                  labelStyle={{ color: "#fff" }}
                  contentStyle={{
                    background: "#0f172a",
                    border: "none",
                    borderRadius: "14px",
                    color: "#fff",
                    fontSize: "12px",
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
                      background: "#0f172a",
                      border: "none",
                      borderRadius: "14px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                  Total gasto
                </span>
                <span className="mt-1 font-mono text-base font-black text-white">
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
                    className="rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/8 hover:shadow-xs"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />

                        <strong className="truncate text-xs font-bold text-slate-100">
                          {item.name}
                        </strong>
                      </div>

                      <span className="shrink-0 font-mono text-xs font-bold text-white">
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

                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                      <span>{percentage}% dos gastos</span>
                      <span className="truncate text-right">
                        Saldo: {formatMoney(item.realValue, currency)} · Crédito:{" "}
                        {formatMoney(item.creditValue, currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex h-[340px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/5 text-slate-400">
            <TrendingUp size={36} className="mb-2 text-indigo-300/60" />
            <p className="text-sm font-semibold text-slate-200">
              Sem gastos cadastrados
            </p>
            <p className="mt-1 px-4 text-center text-xs text-slate-500">
              Registre uma saída para visualizar a divisão entre saldo e crédito.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
