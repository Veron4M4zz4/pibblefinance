/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Wallet, WalletType } from '../types';
import { WALLET_TYPES } from '../utils/constants';
import { formatMoney } from '../utils/formatMoney';

import {
  Building2,
  CreditCard,
  Coins,
  PiggyBank,
  Plus,
  Trash2,
  Wallet as WalletIcon
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';

import {
  getWallets,
  createWallet,
  deleteWallet
} from '../services/storage';

interface WalletFormProps {
  currency: 'BRL' | 'USD' | 'EUR';
}

const COLOR_PRESETS = [
  { class: 'from-slate-800 to-slate-950 text-white border-slate-700', bg: 'bg-slate-900', hover: 'hover:border-slate-500', name: 'Charcoal' },
  { class: 'from-indigo-600 to-violet-800 text-white border-indigo-500', bg: 'bg-indigo-600', hover: 'hover:border-indigo-400', name: 'Indigo Aura' },
  { class: 'from-emerald-500 to-teal-700 text-white border-emerald-400', bg: 'bg-emerald-600', hover: 'hover:border-emerald-400', name: 'Forest Emerald' },
  { class: 'from-rose-500 to-pink-700 text-white border-rose-400', bg: 'bg-rose-500', hover: 'hover:border-rose-400', name: 'Fierce Rose' },
  { class: 'from-amber-400 to-orange-600 text-slate-900 border-amber-300', bg: 'bg-amber-500', hover: 'hover:border-amber-400', name: 'Solar Orange' },
  { class: 'from-sky-500 to-blue-700 text-white border-sky-400', bg: 'bg-sky-500', hover: 'hover:border-sky-400', name: 'Ocean Sky' },
];

export default function WalletForm({ currency }: WalletFormProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);

  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState<WalletType>('checking');
  const [walletBalance, setWalletBalance] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(1);

  async function loadWallets() {
    const data = await getWallets();
    setWallets(data || []);
  }

  useEffect(() => {
    loadWallets();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!walletName.trim() || !walletBalance) return;

    await createWallet({
      name: walletName.trim(),
      type: walletType,
      balance: Number(walletBalance),
      color: COLOR_PRESETS[selectedColorIndex].class,
      currency,
    });

    setWalletName('');
    setWalletBalance('');

    await loadWallets();
  }

  async function handleDelete(walletId: string) {
    await deleteWallet(walletId);
    await loadWallets();
  }

  function getWalletTypeIcon(type: WalletType) {
    switch (type) {
      case 'credit':
        return <CreditCard size={18} />;

      case 'cash':
        return <Coins size={18} />;

      case 'savings':
        return <PiggyBank size={18} />;

      default:
        return <Building2 size={18} />;
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs lg:col-span-7">
        <h3 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
          <WalletIcon className="text-indigo-600" size={20} />
          Minhas Carteiras
        </h3>

        <p className="text-xs text-slate-500 mb-6">
          Cadastre contas bancárias, cartões, dinheiro e investimentos.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nome da Carteira
            </label>

            <input
              type="text"
              placeholder="Ex: Nubank, Carteira Física, XP Reserva"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-950 placeholder-slate-400 focus:border-indigo-600 focus:bg-white outline-none transition-all duration-200"
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tipo de Conta
              </label>

              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-950 focus:border-indigo-600 focus:bg-white outline-none transition-all duration-200"
                value={walletType}
                onChange={(e) => setWalletType(e.target.value as WalletType)}
              >
                {WALLET_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Saldo Inicial ({currency})
              </label>

              <input
                type="number"
                step="any"
                placeholder="Ex. 1500,00"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-950 placeholder-slate-400 focus:border-indigo-600 focus:bg-white outline-none transition-all duration-200 font-mono"
                value={walletBalance}
                onChange={(e) => setWalletBalance(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Tema & Aparência
            </label>

            <div className="flex flex-wrap gap-2.5">
              {COLOR_PRESETS.map((color, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedColorIndex(index)}
                  className={`h-7 w-7 rounded-full border-2 ${color.bg} ${color.hover} transition-all duration-200 flex items-center justify-center ${
                    selectedColorIndex === index
                      ? 'ring-2 ring-slate-900 ring-offset-2'
                      : ''
                  }`}
                >
                  {selectedColorIndex === index && (
                    <span
                      className={`block h-1.5 w-1.5 rounded-full ${
                        index === 4 ? 'bg-slate-950' : 'bg-white'
                      }`}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <div
              className={`w-full rounded-2xl bg-gradient-to-br ${COLOR_PRESETS[selectedColorIndex].class} p-5 shadow-lg border relative overflow-hidden transition-all duration-300 min-h-[140px] flex flex-col justify-between`}
            >
              <div className="absolute top-0 right-0 h-28 w-28 bg-white/5 rounded-full -mr-6 -mt-6 backdrop-blur-3xl pointer-events-none" />

              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-semibold tracking-wider uppercase opacity-80">
                    {WALLET_TYPES.find(w => w.id === walletType)?.name}
                  </span>

                  <p className="font-display font-bold text-lg leading-tight truncate max-w-[200px] mt-0.5">
                    {walletName.trim() || 'Minha Nova Conta'}
                  </p>
                </div>

                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                  {getWalletTypeIcon(walletType)}
                </div>
              </div>

              <div className="mt-4">
                <span className="text-[10px] opacity-70 block">
                  Saldo Estimado
                </span>

                <span className="font-mono text-2xl font-bold tracking-tight">
                  {formatMoney(Number(walletBalance) || 0, currency)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 active:scale-95 transition-all duration-200 cursor-pointer shadow-md"
          >
            <Plus size={16} />
            Cadastrar Carteira
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs lg:col-span-5 flex flex-col justify-between">
        <div>
          <h4 className="font-display font-semibold text-slate-800 text-sm mb-4">
            Suas Contas Ativas ({wallets.length})
          </h4>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {wallets.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                <Building2 size={24} className="text-slate-400 mb-2" />

                <p className="text-xs font-medium text-slate-600">
                  Nenhuma carteira ativa
                </p>

                <p className="text-[10px] text-slate-400 px-3">
                  Crie uma carteira para começar.
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {wallets.map((wallet) => (
                  <motion.div
                    key={wallet.id}
                    layoutId={`wallet-card-${wallet.id}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${wallet.color} border shadow-xs text-white shrink-0`}
                      >
                        {getWalletTypeIcon(wallet.type)}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {wallet.name}
                        </p>

                        <p className="text-[10px] text-slate-400 font-medium">
                          {WALLET_TYPES.find(
                            t => t.id === wallet.type
                          )?.name || wallet.type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                        {formatMoney(wallet.balance, wallet.currency)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDelete(wallet.id)}
                        className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}