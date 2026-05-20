/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { Transaction, Wallet } from '../types';
import { PRESET_CATEGORIES } from '../utils/constants';
import { formatDate, formatMoney } from '../utils/formatMoney';
import CategoryIcon from './CategoryIcon';
import {
  Search,
  Filter,
  Trash2,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionListProps {
  transactions: Transaction[];
  wallets: Wallet[];
  onDeleteTransaction: (id: string) => void;
  currency: 'BRL' | 'USD' | 'EUR';
}

type TypeFilter = 'all' | 'income' | 'expense' | 'transfer';
type PeriodFilter = 'all' | 'today' | 'week' | 'month';

export default function TransactionList({
  transactions,
  wallets,
  onDeleteTransaction,
  currency
}: TransactionListProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [walletFilter, setWalletFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filter transactions based on active inputs
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // 1. Search Query
      const categoryObj = PRESET_CATEGORIES.find((c) => c.id === t.category);
      const categoryName = categoryObj ? categoryObj.name : t.category;
      
      const matchSearch =
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        categoryName.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase());

      // 2. Type Filter
      const matchType = typeFilter === 'all' || t.type === typeFilter;

      // 3. Wallet Filter
      const matchWallet =
        walletFilter === 'all' ||
        t.walletId === walletFilter ||
        (t.type === 'transfer' && t.toWalletId === walletFilter);

      // 4. Period Filter
      let matchPeriod = true;
      if (periodFilter !== 'all') {
        const tDate = new Date(t.date);
        const today = new Date();
        
        if (periodFilter === 'today') {
          matchPeriod = tDate.toDateString() === today.toDateString();
        } else if (periodFilter === 'week') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(today.getDate() - 7);
          matchPeriod = tDate >= sevenDaysAgo;
        } else if (periodFilter === 'month') {
          matchPeriod =
            tDate.getMonth() === today.getMonth() &&
            tDate.getFullYear() === today.getFullYear();
        }
      }

      return matchSearch && matchType && matchWallet && matchPeriod;
    });
  }, [transactions, search, typeFilter, walletFilter, periodFilter]);

  // Handle Export to CSV
  function handleExportCSV() {
    if (filteredTransactions.length === 0) return;

    const headers = ['Data', 'Tipo', 'Categoria', 'Conta Origem', 'Conta Destino', 'Valor', 'Descrição'];
    const rows = filteredTransactions.map((t) => {
      const wSource = wallets.find((w) => w.id === t.walletId)?.name || 'N/A';
      const wDest = t.toWalletId ? (wallets.find((w) => w.id === t.toWalletId)?.name || 'N/A') : '';
      const catName = PRESET_CATEGORIES.find((cat) => cat.id === t.category)?.name || t.category;
      
      return [
        formatDate(t.date),
        t.type === 'income' ? 'Entrada' : t.type === 'expense' ? 'Saída' : 'Transferência',
        catName,
        wSource,
        wDest,
        t.amount.toString(),
        t.description
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pibble_extrato_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Get active configurations
  const walletList = useMemo(() => wallets, [wallets]);

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs transition-all duration-300">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900">Histórico de Transações</h3>
          <p className="text-xs text-slate-500">Filtre, pesquise e faça exportações dos fluxos fiscais</p>
        </div>

        {/* Action icons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              showAdvanced || typeFilter !== 'all' || walletFilter !== 'all' || periodFilter !== 'all'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-250 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal size={13} />
            {showAdvanced ? 'Ocultar Filtros' : 'Filtros'}
          </button>
          
          <button
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-250 bg-white text-slate-600 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-350 disabled:border-slate-100 disabled:cursor-not-allowed text-xs font-semibold transition-all cursor-pointer"
          >
            <FileSpreadsheet size={13} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Inputs block */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Pesquise por mercados, salários, freelances, etc..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-hidden transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Advanced Filters Drawer */}
        <AnimatePresence>
          {(showAdvanced || typeFilter !== 'all' || walletFilter !== 'all' || periodFilter !== 'all') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 text-xs">
                {/* 1. Filter by Type */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Tipo de Fluxo</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-hidden"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                  >
                    <option value="all">Ver Tudo</option>
                    <option value="expense">Saídas (Despesas)</option>
                    <option value="income">Entradas (Receitas)</option>
                    <option value="transfer">Transferências</option>
                  </select>
                </div>

                {/* 2. Filter by Wallet */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Conta de Vínculo</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-hidden"
                    value={walletFilter}
                    onChange={(e) => setWalletFilter(e.target.value)}
                  >
                    <option value="all">Qualquer Carteira</option>
                    {walletList.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Filter by Time Period */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Período Fiscal</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-hidden"
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                  >
                    <option value="all">Qualquer Momento</option>
                    <option value="today">Hoje</option>
                    <option value="week">Últimos 7 dias</option>
                    <option value="month">Este Mês</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Listings list */}
      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
            <SlidersHorizontal size={24} className="text-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-600">Nenhum lançamento corresponde</p>
            <p className="text-[10px] text-slate-400 px-4 mt-1">
              {transactions.length === 0
                ? 'Cadastre movimentações financeiras para iniciar seu extrato.'
                : 'Remova ou altere os filtros aplicados acima para listar transações.'}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredTransactions.map((t) => {
              const categoryObj = PRESET_CATEGORIES.find((cat) => cat.id === t.category || cat.name.toLowerCase() === t.category.toLowerCase());
              const catName = categoryObj ? categoryObj.name : t.category;
              const sourceWalletName = wallets.find((w) => w.id === t.walletId)?.name || 'Outro';
              
              let desc = t.description || 'Lançamento sem nota descritiva';
              let badgeBg = categoryObj ? categoryObj.color : 'bg-slate-400 text-white';

              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between gap-4 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/20 hover:bg-slate-50/60 hover:shadow-2xs transition-all duration-200 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center border ${badgeBg} shadow-2xs`}>
                      {t.type === 'transfer' ? (
                        <RefreshCw size={15} />
                      ) : t.type === 'income' ? (
                        <ArrowDownLeft size={16} />
                      ) : (
                        <ArrowUpRight size={16} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 truncate">{desc}</span>
                        <span className="text-[10px] text-slate-400 font-medium">• {catName}</span>
                      </div>
                      
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {t.type === 'transfer' ? (
                          <span>
                            Surgiu de <strong className="text-slate-500">{sourceWalletName}</strong> para{' '}
                            <strong className="text-indigo-600">
                              {wallets.find((w) => w.id === t.toWalletId)?.name || 'Conta Receptora'}
                            </strong>
                          </span>
                        ) : (
                          <span>
                            Contabilizado na carteira <strong className="text-slate-500">{sourceWalletName}</strong>
                          </span>
                        )}
                        <span className="mx-1">•</span>
                        <span>{formatDate(t.date)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`font-mono text-sm font-bold tracking-tight ${
                        t.type === 'income'
                          ? 'text-emerald-600'
                          : t.type === 'expense'
                          ? 'text-rose-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : '⇄'}
                      {formatMoney(t.amount, currency)}
                    </span>

                    <button
                      onClick={() => onDeleteTransaction(t.id)}
                      className="text-slate-350 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Excluir Lançamento"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
