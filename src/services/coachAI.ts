import { formatMoney } from "../utils/formatMoney";
import { detectCoachIntent, normalizeCoachText, type CoachIntent } from "./coachIntent";

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
Você é o Coach Pibble, um conselheiro financeiro inteligente do app PibbleFinance.

Objetivo:
- Responder de forma curta, natural e contextual.
- Usar o histórico recente apenas para continuidade da conversa.
- Tratar o contexto financeiro como dados de apoio, nunca como a intenção da pergunta.

Regras:
- Responda sempre em português do Brasil.
- Seja específico quando a pergunta for sobre saldo, crédito, score, gastos ou entradas.
- Se a pergunta for genérica, faça uma leitura geral curta da situação.
- Mantenha a resposta em no máximo 4 linhas curtas.
- Não use títulos, markdown complexo ou estruturas repetidas.
- Varie a abertura da resposta.
- Se faltar informação relevante, diga isso de forma direta e faça uma pergunta curta.
`.trim();

function stableHash(value: string) {
  const text = normalizeCoachText(value);
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function pickVariant(seed: string, variants: string[]) {
  if (variants.length === 0) {
    return "";
  }

  return variants[stableHash(seed) % variants.length];
}

function formatContextLine(
  label: string,
  value: number,
  currency: CoachFinancialContext["currency"]
) {
  return `- ${label}: ${formatMoney(value, currency)}`;
}

function buildPrompt(input: AskCoachPibbleInput, intent: CoachIntent) {
  return [
    `Intenção detectada: ${intent}`,
    `Pergunta do usuário: ${input.question.trim()}`,
    "Contexto financeiro:",
    formatContextLine("Saldo disponível", input.context.balance, input.context.currency),
    formatContextLine("Crédito restante", input.context.creditRemaining, input.context.currency),
    formatContextLine("Entradas", input.context.income, input.context.currency),
    formatContextLine("Gastos totais", input.context.totalExpenses, input.context.currency),
    formatContextLine("Gastos no crédito", input.context.creditExpenses, input.context.currency),
    formatContextLine("Gastos no saldo", input.context.debitExpenses, input.context.currency),
    `- Índice de saúde financeira: ${Math.round(input.context.healthScore)}/100`,
    "",
    "Instruções:",
    "- Use a pergunta do usuário para decidir o assunto da resposta.",
    "- Use o contexto financeiro apenas para aprofundar o que foi perguntado.",
    "- Não repita o texto do contexto na resposta.",
    "- Seja curto, prático e humano.",
  ].join("\n");
}

function buildMessages(input: AskCoachPibbleInput): OpenRouterMessage[] {
  const intent = detectCoachIntent(input.question).intent;
  const history = input.history?.slice(-8) ?? [];

  return [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    ...history.map<OpenRouterMessage>((entry) => ({
      role: entry.role,
      content: entry.text,
    })),
    {
      role: "user",
      content: buildPrompt(input, intent),
    },
  ];
}

function normalizeAssistantResponse(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/```[\s\S]*?```/g, "")
    .trim();
}

function describeScoreSignal(context: CoachFinancialContext) {
  if (context.healthScore >= 80) {
    return "Sua estrutura está bem equilibrada no momento.";
  }

  if (context.totalExpenses > context.income && context.income > 0) {
    return "Seus gastos já estão mais pesados que suas entradas.";
  }

  if (context.creditExpenses > context.debitExpenses && context.creditExpenses > 0) {
    return "O cartão está carregando boa parte das saídas.";
  }

  if (context.balance < context.totalExpenses * 0.25) {
    return "A sua folga de caixa está apertada.";
  }

  return "Ainda há espaço para melhorar com ajustes pequenos e constantes.";
}

function getLocalFallback(input: AskCoachPibbleInput) {
  const question = input.question.trim();
  const { intent } = detectCoachIntent(question);

  const opener = pickVariant(question, {
    score: [
      "Seu score está em",
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
  }[intent]);

  if (intent === "score") {
    const followUp = pickVariant(question, [
      "Quer que eu te diga o que mais está puxando esse número para baixo?",
      "Se quiser, eu posso apontar o principal fator que está mexendo nele.",
      "Posso também resumir o que mais pesa no seu score agora.",
    ]);

    return `${opener} ${Math.round(input.context.healthScore)}/100. ${describeScoreSignal(input.context)} ${followUp}`;
  }

  if (intent === "credit") {
    const followUp = pickVariant(question, [
      "Quer que eu avalie se o uso do cartão está saudável?",
      "Se quiser, eu também posso te dizer se esse ritmo de crédito está pesado.",
      "Posso comparar esse uso com seu saldo disponível, se ajudar.",
    ]);

    return `${opener} ${formatMoney(input.context.creditRemaining, input.context.currency)} e você já usou ${formatMoney(input.context.creditExpenses, input.context.currency)} no cartão. ${followUp}`;
  }

  if (intent === "balance") {
    const followUp = pickVariant(question, [
      "Quer que eu veja se isso aguenta as próximas contas?",
      "Se quiser, eu posso cruzar esse valor com seus gastos previstos.",
      "Posso te dizer se essa sobra parece confortável para o mês.",
    ]);

    return `${opener} ${formatMoney(input.context.balance, input.context.currency)}. ${followUp}`;
  }

  if (intent === "expenses") {
    const followUp = pickVariant(question, [
      "Quer que eu destaque onde pode estar o maior vazamento?",
      "Se quiser, eu posso te ajudar a cortar o que está pesando mais.",
      "Posso separar isso em uma leitura mais prática por categoria.",
    ]);

    return `${opener} ${formatMoney(input.context.totalExpenses, input.context.currency)}. ${followUp}`;
  }

  if (intent === "income") {
    const followUp = pickVariant(question, [
      "Quer que eu compare isso com seus gastos para ver a folga do mês?",
      "Se quiser, eu posso te dizer se a renda já está cobrindo bem as saídas.",
      "Posso transformar isso numa leitura mais objetiva do seu fluxo de caixa.",
    ]);

    return `${opener} ${formatMoney(input.context.income, input.context.currency)}. ${followUp}`;
  }

  const generalOpener = pickVariant(question, [
    "Seu score está em",
    "Hoje o resumo geral mostra",
    "No panorama atual, você tem",
  ]);

  const generalFollowUp = pickVariant(question, [
    "Quer que eu aprofunde crédito, saldo ou gastos?",
    "Se quiser, eu posso focar na parte que mais precisa de atenção.",
    "Posso abrir a análise por saldo, cartão ou orçamento.",
  ]);

  return `${generalOpener} ${Math.round(input.context.healthScore)}/100, com ${formatMoney(
    input.context.balance,
    input.context.currency
  )} de saldo, ${formatMoney(input.context.income, input.context.currency)} em entradas e ${formatMoney(
    input.context.totalExpenses,
    input.context.currency
  )} em gastos. ${generalFollowUp}`;
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
      temperature: 0.6,
      max_tokens: 180,
      messages: buildMessages(input),
    }),
  });

  const data = await response.json();

  console.log(`OPENROUTER RESPONSE (${model})`, data);

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
    question: input.question.trim(),
    history: input.history?.filter((item) => item.text.trim().length > 0),
  };
}

export async function askCoachPibble(input: AskCoachPibbleInput): Promise<string> {
  const normalizedInput = normalizeInput(input);

  if (!normalizedInput.question) {
    return "Me conta sua dúvida financeira, que eu te ajudo.";
  }

  if (!OPENROUTER_API_KEY) {
    return getLocalFallback(normalizedInput);
  }

  for (const model of MODELS) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));

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
