/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Wallet } from '../types';
import { PRESET_CATEGORIES } from '../utils/constants';
import CategoryIcon from './CategoryIcon';
import { PlusCircle, RefreshCw, ArrowUpCircle, ArrowDownCircle, Sparkles } from 'lucide-react';

interface TransactionFormProps {
  wallets: Wallet[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  currency: 'BRL' | 'USD' | 'EUR';
}

export default function TransactionForm({ wallets, onAddTransaction, currency }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [walletId, setWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState(''); // for transfers
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Filter categories compatible with the current type
  const activeCategories = useMemo(() => {
    if (type === 'transfer') return [];
    return PRESET_CATEGORIES.filter((cat) => cat.type === type || cat.type === 'any');
  }, [type]);

  // Handle submit
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    if (type === 'transfer') {
      if (!walletId || !toWalletId || walletId === toWalletId) return;
      onAddTransaction({
        type,
        amount: Number(amount),
        category: 'Transferência',
        walletId,
        toWalletId,
        description: description.trim() || 'Transferência entre contas',
        date: new Date(date).toISOString(),
      });
    } else {
      if (!walletId || !category) return;
      onAddTransaction({
        type,
        amount: Number(amount),
        category,
        walletId,
        description: description.trim(),
        date: new Date(date).toISOString(),
      });
    }

    // Reset fields except defaults
    setAmount('');
    setDescription('');
    // keep date and walletId selected to optimize consecutive entries
  }

  // Set default category when type transitions
  function handleTypeChange(newType: TransactionType) {
    setType(newType);
    if (newType === 'transfer') {
      setCategory('transfer');
    } else {
      const firstCat = PRESET_CATEGORIES.find((cat) => cat.type === newType);
      setCategory(firstCat ? firstCat.id : '');
    }
  }

  const isFormValid = useMemo(() => {
    if (!amount || Number(amount) <= 0 || !walletId) return false;
    if (type === 'transfer') {
      return !!toWalletId && walletId !== toWalletId;
    }
    return !!category;
  }, [amount, walletId, toWalletId, category, type]);

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs transition-all duration-300">
      <div className="mb-6">
        <h3 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
          <PlusCircle className="text-emerald-500" size={20} />
          Registrar Lançamento
        </h3>
        <p className="text-xs text-slate-500">Adicione suas movimentações para atualizar instantaneamente o saldo das contas.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Transaction Type Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              type === 'expense'
                ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-xs'
                : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowDownCircle size={14} />
            Saída
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              type === 'income'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs'
                : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowUpCircle size={14} />
            Entrada
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('transfer')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              type === 'transfer'
                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <RefreshCw size={14} />
            Transf.
          </button>
        </div>

        {/* Amount input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Valor ({currency})</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-slate-400">
              {currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : '€'}
            </span>
            <input
              type="number"
              step="any"
              placeholder="0,00"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 font-mono text-base font-bold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-hidden transition-all"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Source and Destination Wallets */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {type === 'transfer' ? 'Origem' : 'Conta / Carteira'}
            </label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-hidden transition-all"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {type === 'transfer' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Destino</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-hidden transition-all"
                value={toWalletId}
                onChange={(e) => setToWalletId(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {wallets
                  .filter((w) => w.id !== walletId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-hidden transition-all"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {activeCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Date and Description */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Data</label>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-hidden transition-all"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição / Nota</label>
            <input
              type="text"
              placeholder="Ex: Compras no mercado, Freelance..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-hidden transition-all"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Category Badge recommendation to optimize visual scannability */}
        {type !== 'transfer' && category && (
          <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-2.5 border border-slate-100">
            <div className={`p-1.5 rounded-lg shrink-0 ${
              PRESET_CATEGORIES.find((cat) => cat.id === category)?.color || 'bg-slate-400 text-white'
            }`}>
              <CategoryIcon
                name={PRESET_CATEGORIES.find((cat) => cat.id === category)?.icon || 'Ellipsis'}
                size={14}
              />
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              Classificado em:{' '}
              <strong className="text-slate-800">
                {PRESET_CATEGORIES.find((cat) => cat.id === category)?.name || category}
              </strong>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isFormValid}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold text-white transition-all duration-200 cursor-pointer shadow-xs ${
            isFormValid
              ? 'bg-slate-900 hover:bg-slate-800 active:scale-97'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {type === 'transfer' ? <RefreshCw size={14} className="animate-spin-slow" /> : <PlusCircle size={14} />}
          {type === 'transfer'
            ? 'Realizar Transferência'
            : type === 'income'
            ? 'Registar Entrada'
            : 'Registrar Saída'}
        </button>
      </form>
    </div>
  );
}
