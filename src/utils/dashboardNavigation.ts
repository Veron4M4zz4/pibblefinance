export type DashboardSectionId =
  | "dashboard-summary"
  | "expense-categories-chart"
  | "financial-evolution-chart"
  | "wallet-performance-chart"
  | "subscriptions-chart"
  | "credit-utilization-chart"
  | "subscriptions-dashboard"
  | "goals-section"
  | "anomaly-analysis-chart";

export type InsightPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type InsightType =
  | "CATEGORY_SPENDING"
  | "CREDIT_USAGE"
  | "CASHFLOW"
  | "SUBSCRIPTIONS"
  | "SAVINGS"
  | "GOALS"
  | "WALLET_PERFORMANCE"
  | "INCOME"
  | "INSTALLMENTS"
  | "ANOMALY";

export type InsightSourceValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number>;

export type InsightSourceData = Record<string, InsightSourceValue>;

export interface DashboardInsightLike {
  title: string;
  text: string;
  tone?: string;
  type?: InsightType;
  priority?: InsightPriority;
  chartTarget?: DashboardSectionId;
  relatedSectionIds?: DashboardSectionId[];
  sourceData?: InsightSourceData;
  actionSuggestion?: string;
}

export interface DashboardInsightTargets {
  primary: DashboardSectionId;
  related: DashboardSectionId[];
  focusLabel?: string;
}

const SECTION_LABELS: Record<DashboardSectionId, string> = {
  "dashboard-summary": "Resumo do dashboard",
  "expense-categories-chart": "gráfico por categoria",
  "financial-evolution-chart": "evolução financeira",
  "wallet-performance-chart": "desempenho das carteiras",
  "subscriptions-chart": "assinaturas e recorrências",
  "credit-utilization-chart": "uso de crédito",
  "subscriptions-dashboard": "painel de assinaturas",
  "goals-section": "metas",
  "anomaly-analysis-chart": "análises de anomalia",
};

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueSections(sections: DashboardSectionId[]) {
  return [...new Set(sections)];
}

function getInsightText(insight: DashboardInsightLike) {
  return normalizeText(`${insight.title} ${insight.text}`);
}

function inferFromType(type?: InsightType): DashboardSectionId | null {
  if (!type) return null;

  const map: Record<InsightType, DashboardSectionId> = {
    CATEGORY_SPENDING: "expense-categories-chart",
    CREDIT_USAGE: "credit-utilization-chart",
    CASHFLOW: "financial-evolution-chart",
    SUBSCRIPTIONS: "subscriptions-dashboard",
    SAVINGS: "goals-section",
    GOALS: "goals-section",
    WALLET_PERFORMANCE: "wallet-performance-chart",
    INCOME: "financial-evolution-chart",
    INSTALLMENTS: "credit-utilization-chart",
    ANOMALY: "anomaly-analysis-chart",
  };

  return map[type] || null;
}

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

export function resolveDashboardInsightTargets(
  insight: DashboardInsightLike
): DashboardInsightTargets {
  const typeTarget = inferFromType(insight.type);
  const regexText = getInsightText(insight);
  const related = uniqueSections([
    ...(insight.relatedSectionIds || []),
    ...(insight.chartTarget && insight.chartTarget !== typeTarget ? [insight.chartTarget] : []),
  ]);

  if (typeTarget) {
    const primary =
      insight.chartTarget && insight.chartTarget !== typeTarget
        ? insight.chartTarget
        : typeTarget;

    return {
      primary,
      related: uniqueSections(
        [
          ...related,
          ...(primary === "expense-categories-chart"
            ? ["financial-evolution-chart"]
            : primary === "financial-evolution-chart"
            ? ["expense-categories-chart"]
            : primary === "credit-utilization-chart"
            ? ["wallet-performance-chart"]
            : primary === "subscriptions-dashboard"
            ? ["subscriptions-chart", "wallet-performance-chart"]
            : primary === "goals-section"
            ? ["dashboard-summary"]
            : primary === "anomaly-analysis-chart"
            ? ["financial-evolution-chart", "expense-categories-chart"]
            : []),
        ].filter((section): section is DashboardSectionId => Boolean(section))
      ).filter((section) => section !== primary),
      focusLabel:
        String(insight.sourceData?.categoryName || insight.sourceData?.walletName || insight.sourceData?.subscriptionName || "").trim() ||
        undefined,
    };
  }

  if (/(alimenta|mercad|restaur|delivery|supermerc|gasto[s]?\s+acima|gastos\s+acima|categoria)/.test(regexText)) {
    return {
      primary: "expense-categories-chart",
      related: ["financial-evolution-chart", "dashboard-summary"],
      focusLabel: String(
        insight.sourceData?.categoryName || insight.sourceData?.category || ""
      ).trim() || undefined,
    };
  }

  if (/(assinatur|recorr|mensal|anual|renov|cobran[cç]a recorrente|streaming|premium)/.test(regexText)) {
    return {
      primary: "subscriptions-dashboard",
      related: ["subscriptions-chart", "dashboard-summary"],
      focusLabel: String(
        insight.sourceData?.subscriptionName || insight.sourceData?.serviceName || ""
      ).trim() || undefined,
    };
  }

  if (/(cart[aã]o|cr[eé]dito|limite|fatura|parcel|uso do cr[eé]dito)/.test(regexText)) {
    return {
      primary: "credit-utilization-chart",
      related: ["wallet-performance-chart", "financial-evolution-chart"],
      focusLabel: String(
        insight.sourceData?.walletName || insight.sourceData?.cardName || ""
      ).trim() || undefined,
    };
  }

  if (/(meta|objetivo|viagem|economi|guardando|poupan|faltam|atingiu)/.test(regexText)) {
    return {
      primary: "goals-section",
      related: ["dashboard-summary", "financial-evolution-chart"],
      focusLabel: String(insight.sourceData?.goalName || "").trim() || undefined,
    };
  }

  if (/(anom|fora do padrão|incomum|outlier|subiu|aumentou|caiu|revisar|investigar)/.test(regexText)) {
    return {
      primary: "anomaly-analysis-chart",
      related: ["financial-evolution-chart", "expense-categories-chart"],
      focusLabel: String(
        insight.sourceData?.categoryName || insight.sourceData?.walletName || ""
      ).trim() || undefined,
    };
  }

  if (/(saldo|caixa|fluxo|score|sa[úu]de financeira|patrim|reserva|receita|entrada)/.test(regexText)) {
    return {
      primary: "financial-evolution-chart",
      related: ["dashboard-summary", "expense-categories-chart"],
      focusLabel: String(insight.sourceData?.walletName || "").trim() || undefined,
    };
  }

  return {
    primary: "dashboard-summary",
    related: ["financial-evolution-chart"],
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
