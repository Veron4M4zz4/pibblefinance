import type { Transaction, Wallet } from "../types";
import { formatLocalDateInputValue, parseLocalDateValue } from "./date";

export type SubscriptionFrequency = "monthly" | "yearly";

export type SubscriptionOverride = {
  status: "confirmed" | "ignored";
  frequency?: SubscriptionFrequency;
  displayName?: string;
};

export type SubscriptionTone = "success" | "warning" | "danger";

export interface SubscriptionInsight {
  tone: SubscriptionTone;
  title: string;
  text: string;
}

export interface SubscriptionCategorySummary {
  name: string;
  value: number;
}

export interface SubscriptionItem {
  id: string;
  canonicalName: string;
  displayName: string;
  walletId: string;
  walletName: string;
  amount: number;
  frequency: SubscriptionFrequency;
  lastChargeDate: string;
  nextChargeDate: string;
  annualCostEstimate: number;
  monthlyEquivalent: number;
  transactionCount: number;
  confidence: number;
  categoryName: string;
  signals: string[];
  transactions: Transaction[];
  ignored: boolean;
}

export interface SubscriptionEntity {
  name: string;
  value: number;
  frequency: SubscriptionFrequency;
  nextChargeDate: string;
  annualCost: number;
  walletName: string;
  confidence: number;
}

export interface SubscriptionOverview {
  monthlyTotal: number;
  annualTotal: number;
  items: SubscriptionItem[];
  entities: SubscriptionEntity[];
  insights: SubscriptionInsight[];
  categoryBreakdown: SubscriptionCategorySummary[];
}

export const SUBSCRIPTION_OVERRIDES_STORAGE_KEY =
  "pibblefinance:subscription-overrides";

type BrandGroup = {
  label: string;
  aliases: string[];
};

export const subscriptionAliases = [
  "netflix",
  "disney",
  "disney+",
  "max",
  "hbo",
  "hbo max",
  "prime",
  "amazon prime",
  "spotify",
  "youtube",
  "youtube premium",
  "chatgpt",
  "openai",
  "claude",
  "anthropic",
  "google one",
  "dropbox",
  "canva",
  "microsoft 365",
  "office",
  "adobe",
  "icloud",
  "apple",
  "crunchyroll",
  "paramount",
  "deezer",
  "nordvpn",
  "expressvpn",
] as const;

const BRAND_GROUPS: BrandGroup[] = [
  { label: "Netflix", aliases: ["netflix"] },
  { label: "Disney+", aliases: ["disney+", "disney"] },
  { label: "Max", aliases: ["max", "hbo max", "hbo"] },
  { label: "Amazon Prime", aliases: ["prime", "amazon prime", "prime video"] },
  { label: "Spotify", aliases: ["spotify"] },
  { label: "YouTube Premium", aliases: ["youtube premium", "youtube"] },
  { label: "ChatGPT", aliases: ["chatgpt", "openai"] },
  { label: "Claude", aliases: ["claude", "anthropic"] },
  { label: "Google One", aliases: ["google one", "google"] },
  { label: "Dropbox", aliases: ["dropbox"] },
  { label: "Canva", aliases: ["canva"] },
  { label: "Microsoft 365", aliases: ["microsoft 365", "office", "microsoft"] },
  { label: "Adobe", aliases: ["adobe"] },
  { label: "iCloud", aliases: ["icloud", "apple"] },
  { label: "Crunchyroll", aliases: ["crunchyroll"] },
  { label: "Paramount+", aliases: ["paramount"] },
  { label: "Deezer", aliases: ["deezer"] },
  { label: "NordVPN", aliases: ["nordvpn"] },
  { label: "ExpressVPN", aliases: ["expressvpn"] },
];

const STOP_WORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "em",
  "no",
  "na",
  "para",
  "pagamento",
  "pagto",
  "recorrente",
  "assinatura",
  "subscription",
  "mensalidade",
  "mensal",
  "anual",
  "pix",
  "cartao",
  "cartão",
  "credito",
  "crédito",
  "debito",
  "débito",
  "charge",
  "payment",
  "app",
  "servico",
  "serviço",
]);

type SubscriptionCandidate = {
  key: string;
  canonicalName: string;
  displayName: string;
  walletId: string;
  walletName: string;
  categoryName: string;
  amounts: number[];
  dates: Date[];
  transactions: Transaction[];
  brandMatched: boolean;
  signals: string[];
};

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getWalletName(wallets: Wallet[], walletId: string) {
  return wallets.find((wallet) => wallet.id === walletId)?.name || "Carteira";
}

function getMerchantText(transaction: Transaction) {
  return normalizeText(
    `${transaction.description || ""} ${transaction.category || ""}`
  );
}

function getBrandMatch(text: string) {
  for (const brand of BRAND_GROUPS) {
    if (
      brand.aliases.some((alias) =>
        text.includes(normalizeText(alias))
      )
    ) {
      return brand.label;
    }
  }

  return "";
}

function buildFallbackCanonicalName(text: string) {
  const tokens = text
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

  if (tokens.length === 0) {
    return "Assinatura";
  }

  return titleCase(tokens.slice(0, 3).join(" "));
}

function buildCandidateKey(canonicalName: string, walletId: string) {
  return `${normalizeText(canonicalName)}|${walletId}`;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function stdDev(values: number[]) {
  if (values.length < 2) return 0;
  const avg = average(values);
  const variance =
    values.reduce((acc, value) => acc + (value - avg) ** 2, 0) /
    Math.max(1, values.length - 1);
  return Math.sqrt(variance);
}

function getNextMonthlyDate(reference: Date, averageIntervalDays: number) {
  const next = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  next.setDate(next.getDate() + Math.max(25, Math.round(averageIntervalDays || 30)));
  return next;
}

function getNextYearlyDate(reference: Date) {
  return new Date(
    reference.getFullYear() + 1,
    reference.getMonth(),
    reference.getDate()
  );
}

function getLastTransactionDate(transactions: Transaction[]) {
  return transactions
    .map((transaction) => parseLocalDateValue(transaction.date))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())
    .at(-1) || null;
}

function getAverageDateIntervals(dates: Date[]) {
  if (dates.length < 2) return [];

  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const intervals: number[] = [];

  for (let index = 1; index < sorted.length; index += 1) {
    const diffMs = sorted[index].getTime() - sorted[index - 1].getTime();
    intervals.push(diffMs / (1000 * 60 * 60 * 24));
  }

  return intervals;
}

function getFrequencyFromIntervals(intervals: number[], amounts: number[]) {
  if (intervals.length === 0) {
    return {
      frequency: "monthly" as SubscriptionFrequency,
      confidence: 0,
      signals: ["Poucos dados para definir frequência"],
    };
  }

  const avgInterval = average(intervals);
  const intervalNoise = stdDev(intervals);
  const amountAverage = average(amounts);
  const amountNoise = amountAverage > 0 ? stdDev(amounts) / amountAverage : 0;

  const monthlyFit =
    avgInterval >= 20 && avgInterval <= 45 ? 0.68 : avgInterval >= 15 && avgInterval <= 60 ? 0.42 : 0;
  const yearlyFit =
    avgInterval >= 300 && avgInterval <= 390 ? 0.74 : avgInterval >= 250 && avgInterval <= 420 ? 0.46 : 0;

  const regularityBonus = intervalNoise <= 6 ? 0.12 : intervalNoise <= 10 ? 0.06 : 0;
  const amountBonus = amountNoise <= 0.08 ? 0.1 : amountNoise <= 0.15 ? 0.04 : 0;

  if (yearlyFit > monthlyFit) {
    return {
      frequency: "yearly" as SubscriptionFrequency,
      confidence: Math.min(0.98, yearlyFit + regularityBonus + amountBonus),
      signals: [
        `Intervalo médio de ${Math.round(avgInterval)} dias`,
        `Variação de valor de ${(amountNoise * 100).toFixed(0)}%`,
      ],
    };
  }

  return {
    frequency: "monthly" as SubscriptionFrequency,
    confidence: Math.min(0.98, monthlyFit + regularityBonus + amountBonus),
    signals: [
      `Intervalo médio de ${Math.round(avgInterval)} dias`,
      `Variação de valor de ${(amountNoise * 100).toFixed(0)}%`,
    ],
  };
}

function getCategoryName(category: string) {
  const normalized = normalizeText(category);
  if (!normalized) return "Assinaturas";

  return titleCase(normalized);
}

export function buildSubscriptionOverview(
  wallets: Wallet[],
  transactions: Transaction[],
  overrides: Record<string, SubscriptionOverride> = {}
): SubscriptionOverview {
  const candidates = transactions
    .filter((transaction) => transaction.type === "expense")
    .map((transaction) => {
      const parsedDate = parseLocalDateValue(transaction.date);
      if (!parsedDate) return null;

      const merchantText = getMerchantText(transaction);
      const brand = getBrandMatch(merchantText);
      const canonicalName = brand || buildFallbackCanonicalName(merchantText);
      const walletId = transaction.walletId || "";
      const walletName = getWalletName(wallets, walletId);
      const key = buildCandidateKey(canonicalName, walletId);

      return {
        key,
        canonicalName,
        displayName: transaction.description?.trim() || canonicalName,
        walletId,
        walletName,
        categoryName: getCategoryName(transaction.category),
        amounts: [Number(transaction.amount || 0)],
        dates: [parsedDate],
        transactions: [transaction],
        brandMatched: Boolean(brand),
        signals: brand ? [`Marca reconhecida: ${brand}`] : [],
      } satisfies SubscriptionCandidate;
    })
    .filter((candidate): candidate is SubscriptionCandidate => Boolean(candidate));

  const grouped = candidates.reduce<Record<string, SubscriptionCandidate>>(
    (acc, candidate) => {
      const existing = acc[candidate.key];

      if (!existing) {
        acc[candidate.key] = candidate;
        return acc;
      }

      existing.amounts.push(...candidate.amounts);
      existing.dates.push(...candidate.dates);
      existing.transactions.push(...candidate.transactions);
      existing.signals.push(...candidate.signals);
      existing.brandMatched = existing.brandMatched || candidate.brandMatched;

      if (!existing.displayName || existing.displayName.length < candidate.displayName.length) {
        existing.displayName = candidate.displayName;
      }

      if (!existing.categoryName && candidate.categoryName) {
        existing.categoryName = candidate.categoryName;
      }

      return acc;
    },
    {}
  );

  const items = Object.values(grouped)
    .map((candidate) => {
      const sortedTransactions = [...candidate.transactions].sort((a, b) => {
        const aTime = parseLocalDateValue(a.date)?.getTime() || 0;
        const bTime = parseLocalDateValue(b.date)?.getTime() || 0;
        return aTime - bTime;
      });

      const intervals = getAverageDateIntervals(candidate.dates);
      const frequencyFit = getFrequencyFromIntervals(intervals, candidate.amounts);
      const averageAmount = average(candidate.amounts);
      const latestAmount = Number(sortedTransactions.at(-1)?.amount || 0);
      const lastDate = getLastTransactionDate(candidate.transactions);

      const amountVariance =
        averageAmount > 0 ? Math.abs(latestAmount - averageAmount) / averageAmount : 0;

      const monthlyEvidence =
        frequencyFit.frequency === "monthly"
          ? 0.18
          : candidate.brandMatched
          ? 0.05
          : 0;

      const recurringCountBonus =
        candidate.transactions.length >= 5
          ? 0.18
          : candidate.transactions.length >= 3
          ? 0.1
          : 0.04;

      const amountConsistencyBonus =
        amountVariance <= 0.08
          ? 0.16
          : amountVariance <= 0.15
          ? 0.08
          : amountVariance <= 0.25
          ? 0.02
          : 0;

      const confidence = Math.min(
        0.98,
        frequencyFit.confidence + recurringCountBonus + monthlyEvidence + amountConsistencyBonus
      );

      const inferredFrequency =
        frequencyFit.frequency === "yearly"
          ? "yearly"
          : confidence >= 0.58
          ? "monthly"
          : null;

      if (!inferredFrequency) {
        return null;
      }

      const override = overrides[candidate.key];

      const frequency = override?.frequency || inferredFrequency;
      const displayName =
        override?.displayName?.trim() ||
        candidate.displayName ||
        candidate.canonicalName;
      const ignored = override?.status === "ignored";
      const monthlyEquivalent =
        frequency === "yearly" ? averageAmount / 12 : averageAmount;
      const annualCostEstimate =
        frequency === "yearly" ? averageAmount : averageAmount * 12;
      const nextChargeDate = lastDate
        ? formatLocalDateInputValue(
            frequency === "yearly"
              ? getNextYearlyDate(lastDate)
              : getNextMonthlyDate(lastDate, average(intervals) || 30)
          )
        : formatLocalDateInputValue();

      return {
        id: candidate.key,
        canonicalName: candidate.canonicalName,
        displayName,
        walletId: candidate.walletId,
        walletName: candidate.walletName,
        amount: averageAmount,
        frequency,
        lastChargeDate: formatLocalDateInputValue(lastDate || new Date()),
        nextChargeDate,
        annualCostEstimate,
        monthlyEquivalent,
        transactionCount: candidate.transactions.length,
        confidence,
        categoryName: candidate.categoryName,
        signals: [
          ...candidate.signals,
          frequency === "yearly"
            ? "Ciclo anual detectado"
            : "Ciclo mensal detectado",
          amountVariance <= 0.15
            ? "Valor consistente entre cobranças"
            : "Valor varia entre cobranças",
        ],
        transactions: sortedTransactions,
        ignored,
      } satisfies SubscriptionItem;
    })
    .filter((item): item is SubscriptionItem => Boolean(item))
    .sort((a, b) => a.nextChargeDate.localeCompare(b.nextChargeDate));

  const activeItems = items.filter((item) => !item.ignored);
  const entities: SubscriptionEntity[] = activeItems.map((item) => ({
    name: item.displayName,
    value: item.monthlyEquivalent,
    frequency: item.frequency,
    nextChargeDate: item.nextChargeDate,
    annualCost: item.annualCostEstimate,
    walletName: item.walletName,
    confidence: item.confidence,
  }));

  const monthlyTotal = activeItems.reduce(
    (acc, item) => acc + item.monthlyEquivalent,
    0
  );
  const annualTotal = activeItems.reduce(
    (acc, item) => acc + item.annualCostEstimate,
    0
  );

  const categoryTotals = activeItems.reduce<Record<string, number>>((acc, item) => {
    const categoryKey = item.categoryName || "Assinaturas";
    acc[categoryKey] = (acc[categoryKey] || 0) + item.monthlyEquivalent;
    return acc;
  }, {});

  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const insights: SubscriptionInsight[] = [];

  const duplicateGroups = activeItems.reduce<Record<string, SubscriptionItem[]>>((acc, item) => {
    acc[item.canonicalName] = acc[item.canonicalName] || [];
    acc[item.canonicalName].push(item);
    return acc;
  }, {});

  const duplicateEntry = Object.entries(duplicateGroups).find(([, group]) => group.length > 1);
  if (duplicateEntry) {
    const [name, group] = duplicateEntry;
    insights.push({
      tone: "warning",
      title: "Possível duplicidade",
      text: `${name} aparece em ${group.length} assinaturas diferentes. Vale conferir se não há cobrança em mais de uma carteira.`,
    });
  }

  const priceIncrease = [...activeItems]
    .sort((a, b) => b.transactions.length - a.transactions.length)
    .find((item) => {
      if (item.transactions.length < 2) return false;

      const sorted = [...item.transactions].sort((a, b) => {
        const aTime = parseLocalDateValue(a.date)?.getTime() || 0;
        const bTime = parseLocalDateValue(b.date)?.getTime() || 0;
        return aTime - bTime;
      });

      const latest = Number(sorted.at(-1)?.amount || 0);
      const previousAverage =
        sorted.slice(0, -1).reduce((acc, tx) => acc + Number(tx.amount || 0), 0) /
        Math.max(1, sorted.length - 1);

      return previousAverage > 0 && latest > previousAverage * 1.1;
    });

  if (priceIncrease) {
    const sorted = [...priceIncrease.transactions].sort((a, b) => {
      const aTime = parseLocalDateValue(a.date)?.getTime() || 0;
      const bTime = parseLocalDateValue(b.date)?.getTime() || 0;
      return aTime - bTime;
    });
    const latest = Number(sorted.at(-1)?.amount || 0);
    const previousAverage =
      sorted.slice(0, -1).reduce((acc, tx) => acc + Number(tx.amount || 0), 0) /
      Math.max(1, sorted.length - 1);

    insights.push({
      tone: "danger",
      title: "Aumento de preço detectado",
      text: `${priceIncrease.displayName} subiu de cerca de ${previousAverage.toFixed(
        2
      )} para ${latest.toFixed(2)} na cobrança mais recente.`,
    });
  }

  const dormantSubscription = activeItems.find((item) => {
    const last = parseLocalDateValue(item.lastChargeDate);
    if (!last) return false;

    const today = new Date();
    const diffDays =
      (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);

    return item.frequency === "monthly" ? diffDays > 45 : diffDays > 390;
  });

  if (dormantSubscription) {
    insights.push({
      tone: "warning",
      title: "Possível assinatura sem cobrança recente",
      text: `${dormantSubscription.displayName} não aparece há um tempo. Pode estar pausada ou sem uso aparente.`,
    });
  }

  if (categoryBreakdown[0]) {
    insights.push({
      tone: "success",
      title: "Maior peso por categoria",
      text: `${categoryBreakdown[0].name} concentra ${categoryBreakdown[0].value.toFixed(
        2
      )} por mês em assinaturas.`,
    });
  }

  if (activeItems.length === 0) {
    insights.push({
      tone: "success",
      title: "Nenhuma assinatura detectada ainda",
      text: "Registre algumas cobranças recorrentes e o módulo vai começar a sugerir assinaturas automaticamente.",
    });
  }

  return {
    monthlyTotal,
    annualTotal,
    items,
    entities,
    insights,
    categoryBreakdown,
  };
}
