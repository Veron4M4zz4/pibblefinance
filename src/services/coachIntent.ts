export type CoachIntent =
  | "balance"
  | "credit"
  | "score"
  | "expenses"
  | "income"
  | "general";

export interface CoachIntentMatch {
  intent: CoachIntent;
  matchedIntents: string[];
  confidence: number;
  keywords: string[];
}

const INTENT_RULES: Array<{
  intent: CoachIntent;
  terms: RegExp[];
  keywords: string[];
}> = [
  {
    intent: "score",
    keywords: ["score", "pontuação", "nota", "saúde financeira"],
    terms: [
      /\bscore\b/i,
      /\bpontuacao\b/i,
      /\bnota financeira\b/i,
      /\bsaude financeira\b/i,
    ],
  },
  {
    intent: "credit",
    keywords: ["crédito", "cartão", "fatura", "limite", "parcelas"],
    terms: [
      /\bcredito\b/i,
      /\bcartao\b/i,
      /\bfatura\b/i,
      /\blimite\b/i,
      /\bparcela(?:s)?\b/i,
    ],
  },
  {
    intent: "balance",
    keywords: ["saldo", "caixa", "disponível", "reserva"],
    terms: [
      /\bsaldo\b/i,
      /\bcaixa\b/i,
      /\bdisponivel\b/i,
      /\bdinheiro\b/i,
      /\bconta\b/i,
      /\breserva\b/i,
    ],
  },
  {
    intent: "income",
    keywords: ["entrada", "receita", "salário", "ganho"],
    terms: [
      /\bentrada(?:s)?\b/i,
      /\breceita(?:s)?\b/i,
      /\breceb(?:er|imento|idos?)\b/i,
      /\bsalario\b/i,
      /\bganho(?:s)?\b/i,
    ],
  },
  {
    intent: "expenses",
    keywords: ["gasto", "despesa", "custo", "saída", "economia"],
    terms: [
      /\bgasto(?:s)?\b/i,
      /\bdespesa(?:s)?\b/i,
      /\bcusto(?:s)?\b/i,
      /\bsaida(?:s)?\b/i,
      /\beconomiz/i,
    ],
  },
];

export function normalizeCoachText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectCoachIntent(question: string): CoachIntentMatch {
  const normalized = normalizeCoachText(question);
  const scoredMatches = INTENT_RULES.map((rule) => {
    const termMatches = rule.terms.filter((term) => term.test(normalized));

    return {
      intent: rule.intent,
      matched: termMatches.length,
      keywords: rule.keywords,
    };
  }).filter((item) => item.matched > 0);

  const matchedIntents = scoredMatches.map((item) => item.intent);
  const bestMatch = scoredMatches.sort((a, b) => b.matched - a.matched)[0];

  return {
    intent: bestMatch?.intent || "general",
    matchedIntents,
    confidence: bestMatch ? Math.min(1, bestMatch.matched / 3) : 0,
    keywords: bestMatch?.keywords || [],
  };
}

export function getQuestionOnlyText(rawValue: string) {
  return rawValue.trim().replace(/\s+/g, " ");
}
