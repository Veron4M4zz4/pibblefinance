/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { ShieldCheck, ShieldAlert, Sparkles, AlertTriangle, Lightbulb } from 'lucide-react';

interface FinancialHealthProps {
  income: number;
  expense: number;
  balance: number;
}

export default function FinancialHealth({ income, expense, balance }: FinancialHealthProps) {
  const metrics = useMemo(() => {
    let health = 'Incompleta';
    let description = 'Adicione entradas e saídas para ver a saúde financeira.';
    let advice = 'Nossos algoritmos estimam taxas saudáveis quando você cadastra fluxos.';
    let statusClass = 'bg-white/70 backdrop-blur-md border-slate-200/50 text-slate-700 shadow-sm';
    let badgeClass = 'bg-slate-100 border-slate-200 text-slate-800';
    let score = 0; // 0 to 100
    let percentageRemaining = 100;

    if (income > 0) {
      const expenseRate = expense / income;
      percentageRemaining = Math.max(0, Math.round(((income - expense) / income) * 100));

      if (balance < 0 || expenseRate > 0.8) {
        health = 'Atenção';
        description = 'Seus gastos estão muito elevados.';
        advice = 'Evite compras parceladas nos próximos 15 dias. Separe gastos essenciais dos supérfluos e limite o cartão de crédito.';
        statusClass = 'bg-rose-50/70 backdrop-blur-md border-rose-150/40 text-rose-950 glow-rose shadow-sm';
        badgeClass = 'bg-rose-100 border-rose-250 text-rose-700 font-bold';
        score = Math.max(10, Math.round(100 - expenseRate * 80));
      } else if (expenseRate > 0.5) {
        health = 'Saudável';
        description = 'Suas finanças estão equilibradas.';
        advice = 'Muito bem! Você está no caminho certo. Tente economizar um pouco mais este mês para construir sua reserva.';
        statusClass = 'bg-amber-50/60 backdrop-blur-md border-amber-150/40 text-amber-950 glow-indigo shadow-sm';
        badgeClass = 'bg-amber-100 border-amber-250 text-amber-800 font-bold';
        score = Math.round(100 - expenseRate * 60);
      } else {
        health = 'Excelente';
        description = 'Sua saúde financeira está fantástica!';
        advice = 'Incrível! Menos de 50% de sua renda está comprometida. Acelere seus objetivos aportando na Reserva de Emergência.';
        statusClass = 'bg-emerald-50/60 backdrop-blur-md border-emerald-150/40 text-emerald-950 glow-emerald shadow-sm';
        badgeClass = 'bg-emerald-100 border-emerald-250 text-emerald-800 font-bold';
        score = Math.min(100, Math.round(100 - expenseRate * 40));
      }
    }

    return { health, description, advice, statusClass, badgeClass, score, percentageRemaining };
  }, [income, expense, balance]);

  return (
    <div className={`rounded-3xl border p-6 transition-all duration-350 ${metrics.statusClass}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${metrics.badgeClass}`}>
            {metrics.health === 'Excelente' && <Sparkles size={12} />}
            {metrics.health === 'Saudável' && <ShieldCheck size={12} />}
            {metrics.health === 'Atenção' && <ShieldAlert size={12} />}
            {metrics.health === 'Incompleta' && <AlertTriangle size={12} />}
            {metrics.health}
          </span>
          <h4 className="font-display font-black text-slate-900 text-base mt-2">Dores & Cuidados</h4>
        </div>

        {income > 0 && (
          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-semibold block leading-none">Capacidade</span>
            <strong className="text-xl font-mono text-slate-900 leading-tight">
              {metrics.percentageRemaining}%
            </strong>
            <span className="text-[10px] text-slate-400 block font-medium">livre</span>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-700 font-medium leading-relaxed">{metrics.description}</p>

      {income > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mb-1">
            <span>Score Geral</span>
            <span>{metrics.score}/100</span>
          </div>
          <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                metrics.health === 'Excelente'
                  ? 'bg-emerald-500'
                  : metrics.health === 'Saudável'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${metrics.score}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2.5 items-start bg-white/45 p-3.5 rounded-2xl border border-white/40">
        <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold tracking-tight text-slate-800">COACH PIBBLE</span>
          <p className="text-[11px] text-slate-600 leading-normal">{metrics.advice}</p>
        </div>
      </div>
    </div>
  );
}
