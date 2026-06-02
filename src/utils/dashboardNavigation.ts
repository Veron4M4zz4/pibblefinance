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

export function resolveDashboardSectionFromInsight(
  insight: DashboardInsightLike
): DashboardSectionId {
  const haystack = `${insight.title} ${insight.text}`.toLowerCase();

  if (
    /(alimenta|mercad|restaur|delivery|supermerc|gasto acima da média|gastos acima da média)/.test(
      haystack
    )
  ) {
    return "expense-categories-chart";
  }

  if (/(assinatur|recorr|mensal|anual|renov|cobrança recorrente)/.test(haystack)) {
    return "subscriptions-chart";
  }

  if (/(cart[aã]o|cr[eé]dito|limite|fatura|parcel|uso do cr[eé]dito)/.test(haystack)) {
    return "wallet-performance-chart";
  }

  if (/(saldo|caixa|fluxo|score|sa[úu]de financeira|patrim|reserva)/.test(haystack)) {
    return "financial-evolution-chart";
  }

  if (/(tend[eê]ncia|evolu|m[eé]dia|cresc|queda|aument|reduz)/.test(haystack)) {
    return "financial-evolution-chart";
  }

  return "financial-evolution-chart";
}

export function getDashboardSectionLabel(sectionId: DashboardSectionId) {
  return SECTION_LABELS[sectionId];
}
