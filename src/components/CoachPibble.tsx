import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  MessageCircle,
  Send,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";

import { askCoachPibble } from "../services/coachAI";
import { useTheme } from "../context/ThemeProvider";
import { buildFinancialSnapshot } from "../utils/financialSnapshot";
import { formatMoney } from "../utils/formatMoney";
import { TEST_IDS } from "../utils/testIds";

interface WalletType {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface TransactionType {
  id: string;
  type: string;
  amount: number;
  category: string;
  wallet_id?: string;
  walletId?: string;
  description?: string;
}

interface Props {
  wallets: WalletType[];
  transactions: TransactionType[];
  currency: "BRL" | "USD" | "EUR";
}

interface MessageItem {
  id: string;
  role: "assistant" | "user";
  text: string;
}

const QUICK_PROMPTS = [
  "Como está meu crédito?",
  "Tenho saldo suficiente?",
  "Explique meu score",
  "O que devo priorizar agora?",
];

function getTransactionAsFinancialItem(transaction: TransactionType) {
  return {
    ...transaction,
    walletId: transaction.walletId || transaction.wallet_id || "",
  };
}

function getInsightToneClass(tone: "success" | "warning" | "danger") {
  if (tone === "danger") return "border-rose-500/20 bg-rose-500/10 text-rose-100";
  if (tone === "warning")
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
}

export default function CoachPibble({
  wallets,
  transactions,
  currency,
}: Props) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<MessageItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const normalizedTransactions = useMemo(
    () => transactions.map(getTransactionAsFinancialItem) as any,
    [transactions]
  );

  const analysis = useMemo(
    () => buildFinancialSnapshot(wallets as any, normalizedTransactions),
    [wallets, normalizedTransactions]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [chatMessages, isLoading]);

  async function handleSendMessage(customMessage?: string) {
    const userText = (customMessage || message).trim();

    if (!userText || isLoading) return;

    setChatMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user",
        text: userText,
      },
    ]);

    setMessage("");
    setIsLoading(true);

    const financialContext = {
      balance: analysis.cashBalance,
      creditRemaining: analysis.creditRemaining,
      income: analysis.income,
      totalExpenses: analysis.totalExpenses,
      creditExpenses: analysis.creditExpenses,
      debitExpenses: analysis.debitExpenses,
      healthScore: analysis.healthScore,
      currency,
      incomeLast7Days: analysis.incomeLast7Days,
      incomePrev7Days: analysis.incomePrev7Days,
      expenseLast7Days: analysis.expenseLast7Days,
      expensePrev7Days: analysis.expensePrev7Days,
      incomeTrendPercent: analysis.incomeTrendPercent,
      expenseTrendPercent: analysis.expenseTrendPercent,
      daysSinceLastIncome: analysis.daysSinceLastIncome,
      daysSinceLastExpense: analysis.daysSinceLastExpense,
      alerts: analysis.alerts,
    } as const;

    const recentHistory = chatMessages.slice(-8).map((item) => ({
      role: item.role,
      text: item.text,
    }));

    try {
      const coachText = await askCoachPibble({
        question: userText,
        context: financialContext,
        history: recentHistory,
      });

      setChatMessages((prev) => [
        ...prev,
        {
          id: `coach-${Date.now()}`,
          role: "assistant",
          text: coachText,
        },
      ]);
    } catch (error) {
      console.error(error);

      setChatMessages((prev) => [
        ...prev,
        {
          id: `coach-error-${Date.now()}`,
          role: "assistant",
          text: "Não consegui responder agora. Tente novamente em instantes.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const InsightIcon =
    analysis.mainInsight.tone === "danger"
      ? ShieldAlert
      : analysis.mainInsight.tone === "warning"
      ? AlertTriangle
      : CheckCircle2;

  return (
    <>
      <div
        data-testid={TEST_IDS.coachCard}
        className={`card-premium relative overflow-hidden rounded-[28px] p-6 ${
          isLight ? "text-slate-950" : "text-white"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.18),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.12),_transparent_30%)]" />

        <div className="relative mb-5 flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
              isLight
                ? "border-slate-200 bg-white text-slate-700"
                : "border-indigo-400/20 bg-indigo-400/10 text-indigo-200"
            }`}>
              <Brain size={13} />
              Coach Pibble IA
            </div>

            <div>
              <h3 className={`text-2xl font-black tracking-tight ${isLight ? "text-slate-950" : "text-white"}`}>
                Leitura financeira instantânea
              </h3>
              <p className={`mt-1 max-w-sm text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                Um resumo curto do seu cenário, com contexto e orientação prática.
              </p>
            </div>
          </div>

          <div
            className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-[24px] border shadow-lg backdrop-blur-md ${
              isLight
                ? "border-slate-200 bg-white/90"
                : "border-white/10 bg-white/8"
            }`}
          >
            <span className={`text-2xl font-black ${isLight ? "text-slate-950" : "text-white"}`}>
              {analysis.healthScore}
            </span>
            <span className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              score
            </span>
          </div>
        </div>

        <div className="relative grid gap-3 sm:grid-cols-3">
          <div className={`rounded-3xl border p-4 ${isLight ? "border-slate-200 bg-white/90" : "border-white/10 bg-white/5"}`}>
            <span className={`text-[10px] font-bold uppercase tracking-[0.28em] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Saldo disponível
            </span>
            <strong className={`mt-2 block text-lg font-black ${isLight ? "text-slate-950" : "text-white"}`}>
              {formatMoney(analysis.cashBalance, currency)}
            </strong>
          </div>

          <div className={`rounded-3xl border p-4 ${isLight ? "border-slate-200 bg-white/90" : "border-white/10 bg-white/5"}`}>
            <span className={`text-[10px] font-bold uppercase tracking-[0.28em] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Crédito restante
            </span>
            <strong className={`mt-2 block text-lg font-black ${isLight ? "text-slate-950" : "text-white"}`}>
              {formatMoney(analysis.creditRemaining, currency)}
            </strong>
          </div>

          <div className={`rounded-3xl border p-4 ${isLight ? "border-slate-200 bg-white/90" : "border-white/10 bg-white/5"}`}>
            <span className={`text-[10px] font-bold uppercase tracking-[0.28em] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Fluxo líquido
            </span>
            <strong className={`mt-2 block text-lg font-black ${isLight ? "text-slate-950" : "text-white"}`}>
              {formatMoney(analysis.netCashFlow, currency)}
            </strong>
          </div>
        </div>

        <div
          className={`relative mt-4 rounded-3xl border p-4 ${
            isLight
              ? analysis.mainInsight.tone === "danger"
                ? "border-rose-200 bg-rose-50 text-rose-950"
                : analysis.mainInsight.tone === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-emerald-200 bg-emerald-50 text-emerald-950"
              : getInsightToneClass(analysis.mainInsight.tone)
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            <InsightIcon size={18} />
            <strong className={`text-sm font-black ${isLight ? "text-slate-950" : "text-white"}`}>
              {analysis.mainInsight.title}
            </strong>
          </div>

          <p className={`text-xs leading-6 ${isLight ? "text-slate-700" : "text-white/80"}`}>
            {analysis.mainInsight.text}
          </p>
        </div>

        <div className="relative mt-4 grid gap-3 sm:grid-cols-3">
          <div className={`rounded-3xl border p-4 ${isLight ? "border-slate-200 bg-white/90" : "border-white/10 bg-white/5"}`}>
            <span className={`text-[10px] font-bold uppercase tracking-[0.24em] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Leitura rápida
            </span>
            <strong className={`mt-2 block text-sm font-black ${isLight ? "text-slate-950" : "text-white"}`}>
              {analysis.healthLabel}
            </strong>
            <p className={`mt-1 text-xs leading-5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              Score financeiro simplificado para entender o momento.
            </p>
          </div>

          <div className={`rounded-3xl border p-4 ${isLight ? "border-slate-200 bg-white/90" : "border-white/10 bg-white/5"}`}>
            <span className={`text-[10px] font-bold uppercase tracking-[0.24em] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Gastos recentes
            </span>
            <strong
              className={`mt-2 block text-sm font-black ${
                analysis.expenseTrendPercent > 0
                  ? "text-rose-300"
                  : "text-emerald-300"
              }`}
            >
              {analysis.expenseTrendPercent > 0 ? "+" : ""}
              {Math.round(analysis.expenseTrendPercent)}%
            </strong>
            <p className={`mt-1 text-xs leading-5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              Comparação dos últimos 7 dias com o período anterior.
            </p>
          </div>

          <div className={`rounded-3xl border p-4 ${isLight ? "border-slate-200 bg-white/90" : "border-white/10 bg-white/5"}`}>
            <span className={`text-[10px] font-bold uppercase tracking-[0.24em] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Última entrada
            </span>
            <strong className={`mt-2 block text-sm font-black ${isLight ? "text-slate-950" : "text-white"}`}>
              {analysis.daysSinceLastIncome === null
                ? "Sem registro"
                : analysis.daysSinceLastIncome === 0
                ? "Hoje"
                : `${analysis.daysSinceLastIncome} dias`}
            </strong>
            <p className={`mt-1 text-xs leading-5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              Ajuda a entender se há renda nova entrando no caixa.
            </p>
          </div>
        </div>

        <div className="relative mt-4 grid gap-2 sm:grid-cols-2">
          {analysis.alerts.slice(0, 2).map((alert) => (
            <div
              key={alert.title}
              className={`rounded-3xl border p-4 ${
                isLight
                  ? alert.tone === "danger"
                    ? "border-rose-200 bg-rose-50"
                    : alert.tone === "warning"
                    ? "border-amber-200 bg-amber-50"
                    : "border-emerald-200 bg-emerald-50"
                  : alert.tone === "danger"
                  ? "border-rose-400/20 bg-rose-500/10"
                  : alert.tone === "warning"
                  ? "border-amber-400/20 bg-amber-500/10"
                  : "border-emerald-400/20 bg-emerald-500/10"
              }`}
            >
              <strong className={`block text-sm font-black ${isLight ? "text-slate-950" : "text-white"}`}>
                {alert.title}
              </strong>
              <p className={`mt-1 text-xs leading-5 ${isLight ? "text-slate-700" : "text-white/75"}`}>{alert.text}</p>
              <p className={`mt-2 text-xs font-semibold ${isLight ? "text-slate-900" : "text-white/90"}`}>
                Próximo passo: {alert.suggestion}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setIsChatOpen(true);

            if (chatMessages.length === 0) {
              setChatMessages([
                {
                  id: "welcome",
                  role: "assistant",
                  text: `Oi! Eu sou o Coach Pibble.\n\nSeu score atual é **${analysis.healthScore}/100** e eu posso te ajudar a interpretar crédito, saldo, gastos ou entradas.`,
                },
              ]);
            }
        }}
        data-testid={TEST_IDS.coachChatButton}
          className={`relative mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition ${
            isLight
              ? "border-slate-200 bg-slate-900 text-white hover:bg-slate-800"
              : "border-white/10 bg-white text-slate-950 hover:bg-slate-100"
          }`}
        >
          <MessageCircle size={16} />
          Conversar com o Coach
        </button>
      </div>

      {isChatOpen && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={`fixed inset-0 z-[9999] h-screen w-screen overflow-hidden backdrop-blur-md ${
            isLight ? "bg-slate-900/25" : "bg-slate-950/60"
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_32%)]" />

          <div className="absolute bottom-0 right-0 flex items-end justify-end p-0 md:p-4">
            <motion.div
              initial={{ y: 48, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              className="surface-premium flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden rounded-none md:mb-4 md:mr-4 md:h-[720px] md:max-w-[420px] md:rounded-[28px]"
            >
              <div
                className={`flex items-center justify-between border-b bg-transparent px-5 py-[calc(1rem+env(safe-area-inset-top))] md:py-4 ${
                  isLight ? "border-slate-200 text-slate-950" : "border-white/10 text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                      isLight ? "border-slate-200 bg-white text-slate-900" : "border-white/10 bg-white/6 text-white"
                    }`}
                  >
                    <Sparkles size={18} className="text-indigo-300" />
                  </div>

                  <div>
                    <strong className="block text-sm font-black tracking-wide text-ui-title">
                      Coach Pibble
                    </strong>
                    <span className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                      Leitura financeira contextual
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className={`rounded-xl p-2 transition ${
                    isLight
                      ? "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                      : "text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <X size={18} />
                </button>
              </div>

              <div
                className={`flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600 ${
                  isLight ? "text-slate-950 [&::-webkit-scrollbar-thumb]:bg-slate-300" : "text-white [&::-webkit-scrollbar-thumb]:bg-slate-700"
                }`}
              >
                {chatMessages.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className={`flex ${
                      item.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[92%] overflow-hidden rounded-3xl px-4 py-3 text-sm leading-relaxed break-words shadow-lg ${
                        item.role === "user"
                          ? isLight
                            ? "rounded-br-sm border border-indigo-200 bg-indigo-600 text-white"
                            : "rounded-br-sm border border-indigo-400/20 bg-indigo-500 text-white"
                          : isLight
                          ? "rounded-bl-sm border border-slate-200 bg-white text-slate-900"
                          : "rounded-bl-sm border border-white/10 bg-white/6 text-slate-100"
                      }`}
                    >
                      {item.role === "user" ? (
                        <span className="whitespace-pre-wrap">{item.text}</span>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => (
                              <p className="mb-1.5 last:mb-0">{children}</p>
                            ),
                            ul: ({ children }) => (
                              <ul className="mb-1.5 list-disc space-y-1 pl-4 last:mb-0">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="mb-1.5 list-decimal space-y-1 pl-4 last:mb-0">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => <li className="pl-0.5">{children}</li>,
                            strong: ({ children }) => (
                              <strong
                                className={`font-extrabold ${
                                  isLight ? "text-slate-950" : "text-white"
                                }`}
                              >
                                {children}
                              </strong>
                            ),
                          }}
                        >
                          {item.text}
                        </ReactMarkdown>
                      )}
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex justify-start"
                  >
                    <div
                      className={`rounded-3xl rounded-bl-sm border px-4 py-3 text-sm shadow-lg ${
                        isLight
                          ? "border-slate-200 bg-white text-slate-700"
                          : "border-white/10 bg-white/6 text-slate-300"
                      }`}
                    >
                      Pibble está pensando...
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div
                className={`border-t bg-transparent px-4 py-[calc(1rem+env(safe-area-inset-bottom))] ${
                  isLight ? "border-slate-200" : "border-white/10"
                }`}
              >
                <div className="mb-3 flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSendMessage(suggestion)}
                      disabled={isLoading}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        isLight
                          ? "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                          : "border-white/10 bg-white/6 text-slate-200 hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-white"
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleSendMessage();
                    }}
                    disabled={isLoading}
                    placeholder={
                      isLoading
                        ? "Aguardando o Coach..."
                        : "Pergunte ao Coach Pibble..."
                    }
                    className={`flex-1 rounded-2xl border px-4 py-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-indigo-400/40 disabled:cursor-not-allowed disabled:opacity-60 ${
                      isLight
                        ? "border-slate-200 bg-white text-slate-950 focus:bg-white"
                        : "border-white/10 bg-white/6 text-white focus:bg-white/8"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!message.trim() || isLoading}
                    className={`flex aspect-square items-center justify-center rounded-2xl px-4 text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      isLight
                        ? "bg-slate-900 hover:bg-slate-800"
                        : "bg-indigo-500 hover:bg-indigo-400"
                    }`}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </>
  );
}
