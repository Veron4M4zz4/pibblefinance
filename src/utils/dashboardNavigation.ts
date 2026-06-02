export type DashboardSectionId =
  | "dashboard-summary"
  | "expense-categories-chart"
  | "financial-evolution-chart"
  | "wallet-performance-chart"
  | "subscriptions-chart";

export interface DashboardInsightLike {
  title: string;
  text: string;
  tone?: string;
}

export interface DashboardInsightTargets {
  primary: DashboardSectionId;
  related: DashboardSectionId[];
}

const SECTION_LABELS: Record<DashboardSectionId, string> = {
  "dashboard-summary": "Resumo do dashboard",
  "expense-categories-chart": "gráfico por categoria",
  "financial-evolution-chart": "evolução financeira",
  "wallet-performance-chart": "desempenho das carteiras",
  "subscriptions-chart": "assinaturas e recorrências",
};

export function scrollToDashboardSection(sectionId: DashboardSectionId) {
  const element = document.getElementById(sectionId);

  if (!element) {
    return false;
  }

  element.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  if (element instanceof HTMLElement) {
    if (!element.hasAttribute("tabindex")) {
      element.setAttribute("tabindex", "-1");
    }

    window.setTimeout(() => {
      element.focus({ preventScroll: true });
    }, 120);
  }

  return true;
}

function getInsightText(insight: DashboardInsightLike) {
  return `${insight.title} ${insight.text}`.toLowerCase();
}

function matchesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function uniqueSections(sections: DashboardSectionId[]) {
  return [...new Set(sections)];
}

export function resolveDashboardInsightTargets(
  insight: DashboardInsightLike
): DashboardInsightTargets {
  const text = getInsightText(insight);

  const expenseSignals = [
    /alimenta/,
    /mercad/,
    /restaur/,
    /delivery/,
    /supermerc/,
    /gasto[s]?\s+pequen/,
    /microgasto/,
    /cuidado com gastos pequenos/,
    /gastos?\s+acima\s+da\s+m[eé]dia/,
  ];

  const financialSignals = [
    /saldo/,
    /caixa/,
    /fluxo/,
    /folga/,
    /reserva/,
    /patrim/,
    /dinheiro dispon[ií]vel/,
    /sa[úu]de financeira/,
    /sem renda/,
    /sem entrada/,
    /entradas?/,
  ];

  const walletSignals = [
    /cart[aã]o/,
    /cr[eé]dito/,
    /limite/,
    /fatura/,
    /parcel/,
    /uso do cart[aã]o/,
    /uso do cr[eé]dito/,
  ];

  const subscriptionSignals = [
    /assinatur/,
    /recorr/,
    /mensal/,
    /anual/,
    /renov/,
    /venc/,
    /cobran[cç]a recorrente/,
  ];

  const related: DashboardSectionId[] = [];
  let primary: DashboardSectionId = "financial-evolution-chart";

  if (matchesAny(text, subscriptionSignals)) {
    primary = "subscriptions-chart";
    related.push("wallet-performance-chart");
  } else if (matchesAny(text, walletSignals)) {
    primary = "wallet-performance-chart";
    related.push("financial-evolution-chart");
  } else if (matchesAny(text, expenseSignals)) {
    primary = "expense-categories-chart";
    related.push("financial-evolution-chart");
  } else if (matchesAny(text, financialSignals)) {
    primary = "financial-evolution-chart";
    if (/(gasto|sa[ií]da|cresc|subi|reduz|m[eé]dia|tend[eê]ncia)/.test(text)) {
      related.push("expense-categories-chart");
    }
  }

  if (/(as sa[ií]das j[aá] est[aã]o acima das entradas|grande parte das sa[ií]das est[aã] indo para o cr[eé]dito)/.test(text)) {
    related.push("financial-evolution-chart", "wallet-performance-chart");
    if (text.includes("crédito") || text.includes("cartão")) {
      primary = "wallet-performance-chart";
    }
  }

  if (/seus gastos subiram recentemente|gastos cresceram nos [úu]ltimos dias|gastos acima da m[eé]dia/.test(text)) {
    primary = "financial-evolution-chart";
    related.push("expense-categories-chart");
  }

  if (!primary) {
    primary = "financial-evolution-chart";
  }

  return {
    primary,
    related: uniqueSections(related).filter((section) => section !== primary),
  };
}

export function resolveDashboardSectionFromInsight(
  insight: DashboardInsightLike
): DashboardSectionId {
  return resolveDashboardInsightTargets(insight).primary;
}

export function getDashboardSectionLabel(sectionId: DashboardSectionId) {
  return SECTION_LABELS[sectionId];
}
