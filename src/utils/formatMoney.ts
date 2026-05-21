export function formatMoney(
  value: number,
  currency: "BRL" | "USD" | "EUR" = "BRL"
) {
  const safeCurrency = currency || "BRL";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: safeCurrency,
  }).format(value || 0);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}