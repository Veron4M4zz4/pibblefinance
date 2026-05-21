import { formatMoney } from "../utils/formatMoney";
import {
  detectCoachIntent,
  getQuestionOnlyText,
  normalizeCoachText,
  type CoachIntent,
} from "./coachIntent";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const MODELS = [
  "openai/gpt-oss-20b:free",
  "meta-llama/llama-3.3-8b-instruct:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
];

export interface CoachFinancialContext {
  balance: number;
  creditRemaining: number;
  income: number;
  totalExpenses: number;
  creditExpenses: number;
  debitExpenses: number;
  healthScore: number;
  currency: "BRL" | "USD" | "EUR";
}

export interface CoachChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface AskCoachPibbleInput {
  question: string;
  context: CoachFinancialContext;
  history?: CoachChatTurn[];
}

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `
Você é o Coach Pibble, um assistente financeiro do PibbleFinance.

Objetivo:
- Responder em português do Brasil.
- Ser curto, humano e contextual.
- Usar o contexto financeiro como dado de apoio, nunca como substituto da pergunta.
- Priorizar a intenção da pergunta do usuário.

Regras de qualidade:
- Máximo de 4 linhas curtas.
- Evite markdown pesado, títulos ou explicações longas.
- Não repita os números do contexto sem necessidade.
- Se a pergunta for vaga, faça uma leitura geral curta e útil.
- Se faltar informação relevante, seja direto e faça uma pergunta curta.
- Varie a abertura da resposta para não soar robótico.
`.trim();

const INTENT_RESPONSE_HINTS: Record<CoachIntent, string> = {
  score:
    "Responda sobre o score financeiro com uma leitura objetiva, um motivo principal e uma sugestão curta.",
  credit:
    "Responda sobre crédito/cartão/fatura com foco em limite, uso e risco atual.",
  balance:
    "Responda sobre saldo/caixa com foco em disponibilidade e folga financeira.",
  expenses:
    "Responda sobre gastos com foco em volume, pressão no orçamento e se há concentração no crédito.",
  income:
    "Responda sobre entradas com foco em fluxo de caixa e cobertura das saídas.",
  general:
    "Responda com uma leitura geral curta, equilibrada e útil do cenário financeiro.",
};

function stableHash(value: string) {
  const text = normalizeCoachText(value);
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function pickVariant(seed: string, variants: string[], avoidText = "") {
  if (variants.length === 0) {
    return "";
  }

  const startIndex = stableHash(seed) % variants.length;
  const avoidNormalized = normalizeCoachText(avoidText);

  for (let offset = 0; offset < variants.length; offset += 1) {
    const candidate = variants[(startIndex + offset) % variants.length];

    if (!avoidNormalized || !avoidNormalized.includes(normalizeCoachText(candidate))) {
      return candidate;
    }
  }

  return variants[startIndex];
}

function formatContextLine(
  label: string,
  value: number,
  currency: CoachFinancialContext["currency"]
) {
  return `- ${label}: ${formatMoney(value, currency)}`;
}

function buildFinancialContextSection(input: AskCoachPibbleInput) {
  const { context } = input;

  return [
    "Contexto financeiro:",
    formatContextLine("Saldo disponível", context.balance, context.currency),
    formatContextLine("Crédito restante", context.creditRemaining, context.currency),
    formatContextLine("Entradas", context.income, context.currency),
    formatContextLine("Gastos totais", context.totalExpenses, context.currency),
    formatContextLine("Gastos no crédito", context.creditExpenses, context.currency),
    formatContextLine("Gastos no saldo", context.debitExpenses, context.currency),
    `- Índice de saúde financeira: ${Math.round(context.healthScore)}/100`,
  ].join("\n");
}

function buildUserPrompt(input: AskCoachPibbleInput, intent: CoachIntent) {
  const question = input.question.trim();

  return [
    `Pergunta do usuário: ${question}`,
    `Intenção detectada na pergunta: ${intent}`,
    "",
    buildFinancialContextSection(input),
    "",
    "Orientações de resposta:",
    `- ${INTENT_RESPONSE_HINTS[intent]}`,
    "- Não use o contexto para adivinhar a intenção da pergunta.",
    "- Use o contexto apenas para sustentar a resposta.",
    "- Seja objetivo, natural e específico.",
  ].join("\n");
}

function buildMessages(input: AskCoachPibbleInput): OpenRouterMessage[] {
  const intent = detectCoachIntent(input.question).intent;
  const history = input.history?.slice(-6) ?? [];

  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map<OpenRouterMessage>((entry) => ({
      role: entry.role === "assistant" ? "assistant" : "user",
      content: entry.text,
    })),
    {
      role: "user",
      content: buildUserPrompt(input, intent),
    },
  ];
}

function normalizeAssistantResponse(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function describeScoreSignal(context: CoachFinancialContext) {
  if (context.healthScore >= 85) {
    return "O score está bem encaixado com o cenário atual.";
  }

  if (context.totalExpenses > context.income && context.income > 0) {
    return "As saídas estão pressionando mais do que as entradas.";
  }

  if (context.creditExpenses > context.debitExpenses && context.creditExpenses > 0) {
    return "O crédito está absorvendo boa parte dos gastos.";
  }

  if (context.balance < context.totalExpenses * 0.25) {
    return "A folga de caixa está curta para o ritmo atual.";
  }

  return "Ainda há espaço para melhorar com ajustes pequenos e constantes.";
}

function getLocalFallback(input: AskCoachPibbleInput) {
  const question = input.question.trim();
  const intentResult = detectCoachIntent(question);
  const intent = intentResult.intent;
  const previousAssistantText = [...(input.history || [])]
    .reverse()
    .find((entry) => entry.role === "assistant")?.text || "";

  const openers: Record<CoachIntent, string[]> = {
    score: [
      "Seu score financeiro está em",
      "A leitura do seu score hoje é",
      "No momento, seu score ficou em",
    ],
    credit: [
      "Seu crédito disponível agora é",
      "Hoje você ainda tem",
      "No cartão, sobrou",
    ],
    balance: [
      "Seu saldo disponível está em",
      "Hoje o seu caixa está em",
      "No momento, você tem",
    ],
    expenses: [
      "Você já registrou",
      "Até agora, seus gastos somam",
      "Neste momento, o total gasto é",
    ],
    income: [
      "Você tem",
      "Até agora, suas entradas somam",
      "No momento, as entradas registradas são",
    ],
    general: [
      "Pelo seu painel financeiro, eu diria que",
      "Fazendo uma leitura geral,",
      "No geral, seu momento financeiro parece",
    ],
  };

  const followUps: Record<CoachIntent, string[]> = {
    score: [
      "Quer que eu diga o que mais está puxando esse número para baixo?",
      "Se quiser, eu posso apontar o principal fator que está mexendo nele.",
      "Posso também resumir o que mais pesa no seu score agora.",
    ],
    credit: [
      "Quer que eu avalie se o uso do cartão está saudável?",
      "Se quiser, eu também posso te dizer se esse ritmo de crédito está pesado.",
      "Posso comparar esse uso com seu saldo disponível, se ajudar.",
    ],
    balance: [
      "Quer que eu veja se isso aguenta as próximas contas?",
      "Se quiser, eu posso cruzar esse valor com seus gastos previstos.",
      "Posso te dizer se essa sobra parece confortável para o mês.",
    ],
    expenses: [
      "Quer que eu destaque onde pode estar o maior vazamento?",
      "Se quiser, eu posso te ajudar a cortar o que está pesando mais.",
      "Posso separar isso em uma leitura mais prática por categoria.",
    ],
    income: [
      "Quer que eu compare isso com seus gastos para ver a folga do mês?",
      "Se quiser, eu posso te dizer se a renda já está cobrindo bem as saídas.",
      "Posso transformar isso numa leitura mais objetiva do seu fluxo de caixa.",
    ],
    general: [
      "Quer que eu aprofunde crédito, saldo ou gastos?",
      "Se quiser, eu posso focar na parte que mais precisa de atenção.",
      "Posso abrir a análise por saldo, cartão ou orçamento.",
    ],
  };

  if (intent === "score") {
    return `${pickVariant(question, openers.score, previousAssistantText)} ${Math.round(
      input.context.healthScore
    )}/100. ${describeScoreSignal(input.context)} ${pickVariant(
      question,
      followUps.score,
      previousAssistantText
    )}`;
  }

  if (intent === "credit") {
    return `${pickVariant(question, openers.credit, previousAssistantText)} ${formatMoney(
      input.context.creditRemaining,
      input.context.currency
    )} e você já usou ${formatMoney(input.context.creditExpenses, input.context.currency)} no cartão. ${pickVariant(
      question,
      followUps.credit,
      previousAssistantText
    )}`;
  }

  if (intent === "balance") {
    return `${pickVariant(question, openers.balance, previousAssistantText)} ${formatMoney(
      input.context.balance,
      input.context.currency
    )}. ${pickVariant(question, followUps.balance, previousAssistantText)}`;
  }

  if (intent === "expenses") {
    return `${pickVariant(question, openers.expenses, previousAssistantText)} ${formatMoney(
      input.context.totalExpenses,
      input.context.currency
    )}. ${pickVariant(question, followUps.expenses, previousAssistantText)}`;
  }

  if (intent === "income") {
    return `${pickVariant(question, openers.income, previousAssistantText)} ${formatMoney(
      input.context.income,
      input.context.currency
    )}. ${pickVariant(question, followUps.income, previousAssistantText)}`;
  }

  return `${pickVariant(question, openers.general, previousAssistantText)} ${
    Math.round(input.context.healthScore)
  }/100, com ${formatMoney(input.context.balance, input.context.currency)} de saldo, ${formatMoney(
    input.context.income,
    input.context.currency
  )} em entradas e ${formatMoney(input.context.totalExpenses, input.context.currency)} em gastos. ${pickVariant(
    question,
    followUps.general,
    previousAssistantText
  )}`;
}

async function requestOpenRouter(input: AskCoachPibbleInput, model: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "PibbleFinance",
    },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      top_p: 0.9,
      max_tokens: 160,
      messages: buildMessages(input),
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || `Erro ao usar modelo ${model}`);
  }

  const content = data?.choices?.[0]?.message?.content?.trim();

  if (!content || content.length < 10) {
    throw new Error(`Resposta inválida do modelo ${model}`);
  }

  return normalizeAssistantResponse(content);
}

function normalizeInput(input: AskCoachPibbleInput) {
  return {
    ...input,
    question: getQuestionOnlyText(input.question),
    history: input.history?.filter((item) => item.text.trim().length > 0),
  };
}

export async function askCoachPibble(input: AskCoachPibbleInput): Promise<string> {
  const normalizedInput = normalizeInput(input);

  if (!normalizedInput.question) {
    return "Me conta sua dúvida financeira que eu te ajudo.";
  }

  if (!OPENROUTER_API_KEY) {
    return getLocalFallback(normalizedInput);
  }

  for (const model of MODELS) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 250));

      const response = await requestOpenRouter(normalizedInput, model);

      if (response) {
        return response;
      }
    } catch (error) {
      console.warn(`Modelo falhou (${model})`, error);
    }
  }

  return getLocalFallback(normalizedInput);
}
