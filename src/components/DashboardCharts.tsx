/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
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
  transactions: Transaction[];
  wallets: Wallet[];
  currency: "BRL" | "USD" | "EUR";
}

const COLORS = {
  realBalance: "#4f46e5",
  creditAvailable: "#8b5cf6",
  realExpense: "#f97316",
  creditExpense: "#e11d48",
  income: "#10b981",
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

export default function DashboardCharts({
  transactions,
  wallets,
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

  const overviewData = [
    {
      name: "Resumo",
      "Saldo disponível": financialOverview.realBalance,
      "Crédito restante": financialOverview.creditAvailable,
      "Gasto no saldo": financialOverview.realExpense,
      "Gasto no crédito": financialOverview.creditExpense,
    },
  ];

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

        const color = isCredit ? COLORS.creditExpense : COLORS.realExpense;

        if (!totals[catName]) {
          totals[catName] = {
            name: catName,
            value: 0,
            creditValue: 0,
            realValue: 0,
            color,
          };
        }

        totals[catName].value += amount;

        if (isCredit) {
          totals[catName].creditValue += amount;
        } else {
          totals[catName].realValue += amount;
        }
      });

    return Object.values(totals).sort((a, b) => b.value - a.value);
  }, [transactions, walletById]);

  const pieData = [
    {
      name: "Gasto no saldo",
      value: financialOverview.realExpense,
      color: COLORS.realExpense,
    },
    {
      name: "Gasto no crédito",
      value: financialOverview.creditExpense,
      color: COLORS.creditExpense,
    },
  ].filter((item) => item.value > 0);

  const hasExpenses = financialOverview.totalExpense > 0;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs transition-all duration-300">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900">
            Análise Financeira
          </h3>

          <p className="text-xs text-slate-500">
            Entenda seu dinheiro real separado do limite de crédito.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "overview"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 size={14} />
            Visão Geral
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "categories"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <PieIcon size={14} />
            Gastos
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-500">
            <WalletIcon size={14} />
            Saldo
          </div>

          <strong className="block text-xl font-black text-slate-950">
            {formatMoney(financialOverview.realBalance, currency)}
          </strong>

          <p className="mt-1 text-[11px] text-slate-500">
            Dinheiro disponível em conta, pix e débito.
          </p>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-500">
            <CreditCard size={14} />
            Crédito
          </div>

          <strong className="block text-xl font-black text-violet-700">
            {formatMoney(financialOverview.creditAvailable, currency)}
          </strong>

          <p className="mt-1 text-[11px] text-slate-500">
            Limite restante nos cartões.
          </p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-500">
            <TrendingUp size={14} />
            Gasto no saldo
          </div>

          <strong className="block text-xl font-black text-orange-600">
            {formatMoney(financialOverview.realExpense, currency)}
          </strong>

          <p className="mt-1 text-[11px] text-slate-500">
            Saídas em débito, conta, pix e dinheiro.
          </p>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rose-500">
            <CreditCard size={14} />
            Gasto no crédito
          </div>

          <strong className="block text-xl font-black text-rose-600">
            {formatMoney(financialOverview.creditExpense, currency)}
          </strong>

          <p className="mt-1 text-[11px] text-slate-500">
            Saídas feitas em cartões de crédito.
          </p>
        </div>
      </div>

      <div className="h-[300px] w-full">
        {activeTab === "overview" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={overviewData}
              margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
              barGap={10}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />

              <XAxis
                dataKey="name"
                fontSize={11}
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

              <Bar
  dataKey="value"
  radius={[10, 10, 0, 0]}
>
  {expensesByCategory.map((entry, index) => (
    <Cell
      key={`bar-${entry.name}`}
      fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
    />
  ))}
</Bar><Bar
  dataKey="value"
  radius={[10, 10, 0, 0]}
>
  {expensesByCategory.map((entry, index) => (
    <Cell
      key={`bar-${entry.name}`}
      fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
    />
  ))}
</Bar>
              <Bar
                dataKey="Crédito restante"
                fill={COLORS.creditAvailable}
                radius={[10, 10, 0, 0]}
                maxBarSize={54}
              />

              <Bar
                dataKey="Gasto no saldo"
                fill={COLORS.realExpense}
                radius={[10, 10, 0, 0]}
                maxBarSize={54}
              />

              <Bar
                dataKey="Gasto no crédito"
                fill={COLORS.creditExpense}
                radius={[10, 10, 0, 0]}
                maxBarSize={54}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : hasExpenses ? (
          <div className="grid h-full grid-cols-1 md:grid-cols-[0.9fr_1.1fr]">
            <div className="relative flex h-full items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                 <Pie
  data={expensesByCategory}
  dataKey="value"
  nameKey="name"
  innerRadius={72}
  outerRadius={108}
  paddingAngle={4}
  stroke="none"
>
  {expensesByCategory.map((entry, index) => (
    <Cell
      key={`cell-${entry.name}`}
      fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
    />
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

              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Total gasto
                </span>

                <span className="mt-1 font-mono text-base font-black text-slate-900">
                  {formatMoney(financialOverview.totalExpense, currency)}
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-2 overflow-y-auto px-2">
              <div className="mb-2 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-orange-500">
                    No saldo
                  </span>
                  <strong className="mt-1 block text-sm font-black text-orange-600">
                    {formatMoney(financialOverview.realExpense, currency)}
                  </strong>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-rose-500">
                    No crédito
                  </span>
                  <strong className="mt-1 block text-sm font-black text-rose-600">
                    {formatMoney(financialOverview.creditExpense, currency)}
                  </strong>
                </div>
              </div>

              {expensesByCategory.slice(0, 6).map((item) => {
                const percentage = financialOverview.totalExpense
                  ? ((item.value / financialOverview.totalExpense) * 100).toFixed(
                      1
                    )
                  : "0";

                return (
                  <div
                    key={item.name}
                    className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 transition hover:bg-white hover:shadow-xs"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />

                        <strong className="text-xs font-bold text-slate-800">
                          {item.name}
                        </strong>
                      </div>

                      <span className="font-mono text-xs font-bold text-slate-900">
                        {formatMoney(item.value, currency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{percentage}% dos gastos</span>

                      <span>
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
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 text-slate-400">
            <TrendingUp size={36} className="mb-2 text-indigo-400/50" />

            <p className="text-sm font-semibold text-slate-600">
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