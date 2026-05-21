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
}

const INTENT_RULES: Array<{
  intent: CoachIntent;
  terms: RegExp[];
}> = [
  {
    intent: "score",
    terms: [
      /\bscore\b/i,
      /\bpontuacao\b/i,
      /\bnota financeira\b/i,
      /\bsaude financeira\b/i,
    ],
  },
  {
    intent: "credit",
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
  const matchedIntents: string[] = [];

  for (const rule of INTENT_RULES) {
    const terms = rule.terms.filter((term) => term.test(normalized));

    if (terms.length > 0) {
      matchedIntents.push(rule.intent);
    }
  }

  return {
    intent: matchedIntents[0] || "general",
    matchedIntents,
  };
}
