// Dates in the app are stored and compared as local calendar days.
// That avoids shifting "YYYY-MM-DD" values through UTC.
const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export function formatLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function normalizeLocalDateValue(value?: string | null) {
  if (!value) return "";

  const trimmed = String(value).trim();
  const match = trimmed.match(LOCAL_DATE_PATTERN);

  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) return "";

  return formatLocalDateInputValue(parsed);
}

export function parseLocalDateValue(value?: string | null) {
  const normalized = normalizeLocalDateValue(value);

  if (!normalized) return null;

  const [year, month, day] = normalized.split("-").map(Number);

  return new Date(year, month - 1, day);
}

export function formatLocalDateLabel(value?: string | null) {
  const parsedDate = parseLocalDateValue(value);

  if (!parsedDate) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}
