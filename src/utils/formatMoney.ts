import { formatLocalDateLabel } from "./date";

export function formatMoney(
  value: number,
  currency: "BRL" | "USD" | "EUR" = "BRL"
) {
  const safeCurrency =
    currency === "BRL" || currency === "USD" || currency === "EUR"
      ? currency
      : "BRL";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: safeCurrency,
  }).format(value || 0);
}

export function formatDate(date: string) {
  return formatLocalDateLabel(date);
}
