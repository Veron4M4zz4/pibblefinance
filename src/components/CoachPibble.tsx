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
  X,
} from "lucide-react";

import { formatMoney } from "../utils/formatMoney";
import { askCoachPibble } from "../services/coachAI";

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
  role: "coach" | "user";
  text: string;
}

const cleanType = (type?: string) => String(type || "").toLowerCase();
const getTxWalletId = (tx: TransactionType) => tx.walletId || tx.wallet_id || "";

function calculateFinancialHealth(
  wallets: WalletType[],
  transactions: TransactionType[],
  currency: Props["currency"]
) {
  const walletById = wallets.reduce<Record<string, WalletType>>(
    (acc, wallet) => {
      acc[wallet.id] = wallet;
      return acc;
    },
    {}
  );

  let totalCredit = 0;
  let totalDebit = 0;

  wallets.forEach((wallet) => {
    const value = Number(wallet.balance || 0);

    if (cleanType(wallet.type) === "credit") {
      totalCredit += value;
    } else {
      totalDebit += value;
    }
  });

  let totalIncome = 0;
  let creditExpenses = 0;
  let debitExpenses = 0;

  transactions.forEach((transaction) => {
    const amount = Number(transaction.amount || 0);

    if (transaction.type === "income") {
      totalIncome += amount;
      return;
    }

    if (transaction.type === "expense") {
      const wallet = walletById[getTxWalletId(transaction)];

      if (cleanType(wallet?.type) === "credit") {
        creditExpenses += amount;
      } else {
        debitExpenses += amount;
      }
    }
  });

  const totalExpenses = creditExpenses + debitExpenses;

  let healthScore = 100;

  if (totalIncome === 0 && totalExpenses > 0) healthScore -= 20;
  if (creditExpenses > totalDebit && creditExpenses > 0) healthScore -= 30;
  if (creditExpenses > debitExpenses && creditExpenses > 0) healthScore -= 15;
  if (totalDebit < 100) healthScore -= 20;
  if (totalIncome > 0 && totalExpenses > totalIncome) healthScore -= 25;

  let mainInsight = {
    type: "success" as "success" | "warning" | "danger",
    title: "Sua estrutura financeira parece saudável",
    text: "Não encontrei sinais críticos no momento.",
  };

  if (totalIncome === 0 && totalExpenses > 0) {
    mainInsight = {
      type: "danger",
      title: "Você está gastando sem registrar renda",
      text: "Cadastre entradas para medir corretamente sua saúde financeira.",
    };
  } else if (creditExpenses > totalDebit && creditExpenses > 0) {
    mainInsight = {
      type: "danger",
      title: "O crédito passou do saldo disponível",
      text: `Você gastou ${formatMoney(
        creditExpenses,
        currency
      )} no crédito e possui ${formatMoney(
        totalDebit,
        currency
      )} em saldo disponível.`,
    };
  } else if (creditExpenses > debitExpenses && creditExpenses > 0) {
    mainInsight = {
      type: "warning",
      title: "Gastos concentrados no crédito",
      text: "Grande parte das saídas está sendo feita no cartão.",
    };
  }

  return {
    totalCredit,
    totalDebit,
    totalIncome,
    totalExpenses,
    creditExpenses,
    debitExpenses,
    healthScore: Math.max(0, healthScore),
    mainInsight,
  };
}

export default function CoachPibble({
  wallets,
  transactions,
  currency,
}: Props) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<MessageItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const analysis = useMemo(
    () => calculateFinancialHealth(wallets, transactions, currency),
    [wallets, transactions, currency]
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

    const financialContext = `
Saldo disponível: ${formatMoney(analysis.totalDebit, currency)}
Crédito restante: ${formatMoney(analysis.totalCredit, currency)}
Entradas: ${formatMoney(analysis.totalIncome, currency)}
Gastos totais: ${formatMoney(analysis.totalExpenses, currency)}
Gastos no crédito: ${formatMoney(analysis.creditExpenses, currency)}
Gastos no saldo: ${formatMoney(analysis.debitExpenses, currency)}
Score financeiro: ${analysis.healthScore}/100

Pergunta do usuário:
${userText}
`;

    try {
      const coachText = await askCoachPibble(financialContext);

      setChatMessages((prev) => [
        ...prev,
        {
          id: `coach-${Date.now()}`,
          role: "coach",
          text: coachText,
        },
      ]);
    } catch (error) {
      console.error(error);

      setChatMessages((prev) => [
        ...prev,
        {
          id: `coach-error-${Date.now()}`,
          role: "coach",
          text: "Não consegui responder agora. Tente novamente em instantes.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const InsightIcon =
    analysis.mainInsight.type === "danger"
      ? ShieldAlert
      : analysis.mainInsight.type === "warning"
      ? AlertTriangle
      : CheckCircle2;

  return (
    <>
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              <Brain size={13} />
              Coach Pibble IA
            </div>

            <h3 className="text-2xl font-black text-slate-900">
              Dores & Cuidados
            </h3>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              Diagnóstico financeiro inteligente.
            </p>
          </div>

          <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-700 text-white shadow-lg">
            <span className="text-2xl font-black">{analysis.healthScore}</span>
            <span className="text-[10px] font-bold uppercase text-white/70">
              score
            </span>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            analysis.mainInsight.type === "danger"
              ? "border-rose-200 bg-rose-50"
              : analysis.mainInsight.type === "warning"
              ? "border-amber-200 bg-amber-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            <InsightIcon size={18} className="text-slate-700" />

            <strong className="text-sm font-black text-slate-900">
              {analysis.mainInsight.title}
            </strong>
          </div>

          <p className="text-xs leading-5 text-slate-600">
            {analysis.mainInsight.text}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsChatOpen(true);

            if (chatMessages.length === 0) {
              setChatMessages([
                {
                  id: "welcome",
                  role: "coach",
                  text: `Oi! Eu sou o Coach Pibble 🐶\n\nSeu score atual é **${analysis.healthScore}/100**.\n\nPosso te ajudar com crédito, saldo disponível, gastos ou próximos passos.`,
                },
              ]);
            }
          }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          <MessageCircle size={16} />
          Conversar com Coach Pibble
        </button>
      </div>

      {isChatOpen && (
        <motion.div
          initial={{
            opacity: 0,
            backdropFilter: "blur(0px)",
          }}
          animate={{
            opacity: 1,
            backdropFilter: "blur(12px)",
          }}
          transition={{
            duration: 0.22,
            ease: "easeOut",
          }}
          className="fixed inset-0 z-[9999] h-screen w-screen overflow-hidden bg-slate-950/40 backdrop-blur-md"
        >
          <div className="absolute inset-0" />

          <div className="absolute bottom-0 right-0 flex items-end justify-end p-0 md:p-4">
            <motion.div
              initial={{
                y: 48,
                opacity: 0,
                scale: 0.97,
              }}
              animate={{
                y: 0,
                opacity: 1,
                scale: 1,
              }}
              transition={{
                type: "spring",
                damping: 24,
                stiffness: 260,
              }}
              className="flex h-[700px] w-screen max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/20 bg-white shadow-2xl md:mb-4 md:mr-4 md:w-full md:rounded-3xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4 text-white">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo-pibble.png"
                    alt="Coach Pibble"
                    className="h-10 w-10 rounded-2xl object-cover shadow-md"
                  />

                  <div>
                    <strong className="block text-sm font-black tracking-wide">
                      Coach Pibble
                    </strong>

                    <span className="text-xs text-slate-400">
                      Conselheiro financeiro inteligente
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                {chatMessages.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{
                      opacity: 0,
                      y: 10,
                      scale: 0.98,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    transition={{
                      duration: 0.18,
                      ease: "easeOut",
                    }}
                    className={`flex ${
                      item.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] overflow-hidden rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words shadow-xs ${
                        item.role === "user"
                          ? "rounded-br-xs bg-indigo-600 font-medium text-white"
                          : "rounded-bl-xs border border-slate-100 bg-white text-slate-700"
                      }`}
                    >
                      {item.role === "user" ? (
                        <span className="whitespace-pre-wrap">
                          {item.text}
                        </span>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => (
                              <p className="mb-1.5 text-sm font-black text-slate-900">
                                {children}
                              </p>
                            ),
                            h2: ({ children }) => (
                              <p className="mb-1.5 text-sm font-black text-slate-900">
                                {children}
                              </p>
                            ),
                            h3: ({ children }) => (
                              <p className="mb-1.5 text-sm font-black text-slate-900">
                                {children}
                              </p>
                            ),
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
                            li: ({ children }) => (
                              <li className="pl-0.5">{children}</li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-extrabold text-slate-900">
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
                    initial={{
                      opacity: 0,
                      y: 10,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.18,
                    }}
                    className="flex justify-start"
                  >
                    <div className="rounded-2xl rounded-bl-xs border border-slate-100 bg-white px-4 py-2.5 text-sm text-slate-400 shadow-xs animate-pulse">
                      Pibble está pensando 🐾
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-slate-100 bg-white p-4">
                <div className="mb-3.5 flex flex-wrap gap-2">
                  {[
                    "Como está meu crédito?",
                    "Tenho saldo suficiente?",
                    "O que devo fazer agora?",
                    "Explique meu score",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSendMessage(suggestion)}
                      disabled={isLoading}
                      className="rounded-full border border-slate-200/60 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-indigo-100 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                        ? "Aguardando o Pibble..."
                        : "Pergunte ao Coach Pibble..."
                    }
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!message.trim() || isLoading}
                    className="flex aspect-square items-center justify-center rounded-2xl bg-indigo-600 px-4 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
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