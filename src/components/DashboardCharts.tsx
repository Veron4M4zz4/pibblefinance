/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
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
  Legend,
} from 'recharts';
import { Transaction, Wallet } from '../types';
import { PRESET_CATEGORIES } from '../utils/constants';
import { formatMoney } from '../utils/formatMoney';
import { PieChart as PieIcon, BarChart3, TrendingUp, HelpCircle } from 'lucide-react';

interface DashboardChartsProps {
  transactions: Transaction[];
  wallets: Wallet[];
  currency: 'BRL' | 'USD' | 'EUR';
}

export default function DashboardCharts({ transactions, wallets, currency }: DashboardChartsProps) {
  const [activeTab, setActiveTab] = useState<'expenses' | 'overview'>('expenses');

  // 1. Group expenses by category
  const expensesByCategory = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'expense');
    const totals: Record<string, { name: string; value: number; color: string }> = {};

    expenses.forEach((t) => {
      const categoryObj = PRESET_CATEGORIES.find((cat) => cat.name.toLowerCase() === t.category.toLowerCase() || cat.id === t.category.toLowerCase());
      const catName = categoryObj ? categoryObj.name : t.category;
      
      // Select beautiful colors
      let color = '#6366f1'; // indigo
      if (categoryObj) {
        if (categoryObj.id === 'food') color = '#10b981'; // emerald
        else if (categoryObj.id === 'transport') color = '#3b82f6'; // blue
        else if (categoryObj.id === 'leisure') color = '#ec4899'; // pink
        else if (categoryObj.id === 'health') color = '#f43f5e'; // rose
        else if (categoryObj.id === 'education') color = '#8b5cf6'; // violet
        else if (categoryObj.id === 'home') color = '#f59e0b'; // amber
        else if (categoryObj.id === 'shopping') color = '#a855f7'; // purple
      }

      if (totals[catName]) {
        totals[catName].value += t.amount;
      } else {
        totals[catName] = { name: catName, value: t.amount, color };
      }
    });

    return Object.values(totals).sort((a, b) => b.value - a.value);
  }, [transactions]);

  // Total expenses
  const totalExpense = useMemo(() => {
    return expensesByCategory.reduce((sum, current) => sum + current.value, 0);
  }, [expensesByCategory]);

  // 2. Comparative summary
  const summaryData = useMemo(() => {
    const incomeTotal = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenseTotal = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const walletsInitialBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

    return [
      {
        name: 'Histórico de Fluxos',
        Entradas: incomeTotal,
        Saídas: expenseTotal,
        Investido: walletsInitialBalance,
      },
    ];
  }, [transactions, wallets]);

  const hasExpenses = expensesByCategory.length > 0;
  const hasTransactions = transactions.length > 0;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs transition-all duration-300">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900">Análise Financeira</h3>
          <p className="text-xs text-slate-500">Métricas visuais de entradas e saídas</p>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'expenses'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieIcon size={14} />
            Gastos por Categoria
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={14} />
            Entradas vs Saídas
          </button>
        </div>
      </div>

      <div className="h-[280px] w-full items-center justify-center">
        {activeTab === 'expenses' ? (
          hasExpenses ? (
            <div className="grid h-full grid-cols-1 md:grid-cols-2">
              <div className="relative h-full flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [formatMoney(v, currency), 'Total']}
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-widest leading-none">Total Geral</span>
                  <span className="font-mono text-base font-bold text-slate-800 tracking-tight mt-1">
                    {formatMoney(totalExpense, currency)}
                  </span>
                </div>
              </div>

              {/* Custom Legend layout */}
              <div className="flex flex-col justify-center gap-2 overflow-y-auto px-2 max-h-[260px]">
                {expensesByCategory.slice(0, 6).map((item, index) => {
                  const percentage = ((item.value / totalExpense) * 100).toFixed(1);
                  return (
                    <div key={index} className="flex items-center justify-between text-xs py-1 hover:bg-slate-50 rounded-lg px-2 transition-all">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-medium text-slate-700 truncate max-w-[124px]">{item.name}</span>
                      </div>
                      <div className="flex gap-2 font-mono text-slate-500">
                        <span className="font-semibold text-slate-900">{formatMoney(item.value, currency)}</span>
                        <span className="text-slate-400">({percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
                {expensesByCategory.length > 6 && (
                  <p className="text-center text-[10px] text-slate-400 mt-1">
                    + {expensesByCategory.length - 6} categorias adicionais listadas abaixo.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
              <TrendingUp size={36} className="text-indigo-400/50 mb-2 animate-pulse" />
              <p className="text-sm font-semibold text-slate-600">Sem saídas cadastradas</p>
              <p className="text-xs text-slate-500 px-4 text-center mt-1">Cadastre transações na seção "Registrar movimentação"</p>
            </div>
          )
        ) : hasTransactions ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={summaryData}
              margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
              barGap={8}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" axisLine={false} tickLine={false} />
              <YAxis
                fontSize={10}
                stroke="#94a3b8"
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatMoney(v, currency).split(',')[0]} // simplified format on axis
              />
              <Tooltip
                formatter={(v: number) => [formatMoney(v, currency), 'Valor']}
                contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="Entradas" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={48} />
              <Bar dataKey="Saídas" fill="#ef4444" radius={[8, 8, 0, 0]} maxBarSize={48} />
              <Bar dataKey="Investido" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
            <HelpCircle size={36} className="text-indigo-400/50 mb-2" />
            <p className="text-sm font-semibold text-slate-600">Sem dados financeiros</p>
            <p className="text-xs text-slate-500 px-4 text-center mt-1">Associe suas contas a uma carteira com saldo inicial para renderizar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
