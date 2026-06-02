export function parseLocalNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  if (value === null || value === undefined) return NaN;

  const raw = String(value).trim();
  if (!raw) return NaN;

  const normalized = raw
    .replace(/[R$\s€$£]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");

  if (!normalized || normalized === "-" || normalized === ".") {
    return NaN;
  }

  return Number(normalized);
}

export function normalizeMoneyNumber(
  value: string | number | null | undefined,
  fallback = 0
) {
  const parsed = parseLocalNumber(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
