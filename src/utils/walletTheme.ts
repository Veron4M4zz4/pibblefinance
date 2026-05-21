const DEFAULT_THEME_KEY = "indigo";

const THEME_CLASS_MAP: Record<string, string> = {
  indigo: "bg-gradient-to-br from-indigo-600 via-violet-700 to-slate-950 text-white border-indigo-300/30",
  emerald: "bg-gradient-to-br from-emerald-500 via-teal-600 to-slate-950 text-white border-emerald-300/30",
  rose: "bg-gradient-to-br from-rose-500 via-pink-600 to-slate-950 text-white border-rose-300/30",
  amber: "bg-gradient-to-br from-amber-400 via-orange-500 to-slate-950 text-slate-950 border-amber-200/40",
  sky: "bg-gradient-to-br from-sky-500 via-blue-600 to-slate-950 text-white border-sky-300/30",
  slate: "bg-gradient-to-br from-slate-700 via-slate-900 to-slate-950 text-white border-slate-400/20",
};

const ACCENT_CLASS_MAP: Record<string, string> = {
  indigo: "bg-indigo-500/30",
  emerald: "bg-emerald-500/30",
  rose: "bg-rose-500/30",
  amber: "bg-amber-500/30",
  sky: "bg-sky-500/30",
  slate: "bg-slate-400/20",
};

function inferThemeKeyFromText(value: string) {
  const lower = value.toLowerCase();

  if (lower.includes("emerald") || lower.includes("teal") || lower.includes("green")) {
    return "emerald";
  }

  if (lower.includes("rose") || lower.includes("pink") || lower.includes("red")) {
    return "rose";
  }

  if (lower.includes("amber") || lower.includes("orange") || lower.includes("yellow")) {
    return "amber";
  }

  if (lower.includes("sky") || lower.includes("blue") || lower.includes("cyan")) {
    return "sky";
  }

  if (lower.includes("slate") || lower.includes("gray") || lower.includes("grey")) {
    return "slate";
  }

  return DEFAULT_THEME_KEY;
}

export function resolveWalletThemeClass(theme?: string, walletType?: string) {
  const raw = String(theme || "").trim();
  const normalizedType = String(walletType || "").toLowerCase();

  if (!raw) {
    return THEME_CLASS_MAP[normalizedType] || THEME_CLASS_MAP[DEFAULT_THEME_KEY];
  }

  const lower = raw.toLowerCase();

  if (THEME_CLASS_MAP[lower]) {
    return THEME_CLASS_MAP[lower];
  }

  if (lower.includes("bg-gradient") || lower.includes("from-") || lower.includes("to-")) {
    return lower.includes("bg-gradient-to-br") ? raw : `bg-gradient-to-br ${raw}`;
  }

  if (lower.includes("bg-")) {
    return THEME_CLASS_MAP[inferThemeKeyFromText(lower)] || THEME_CLASS_MAP[DEFAULT_THEME_KEY];
  }

  return THEME_CLASS_MAP[inferThemeKeyFromText(lower)] || THEME_CLASS_MAP[DEFAULT_THEME_KEY];
}

export function resolveWalletAccentClass(theme?: string, walletType?: string) {
  const raw = String(theme || "").trim().toLowerCase();
  const key =
    THEME_CLASS_MAP[raw]
      ? raw
      : inferThemeKeyFromText(`${raw} ${String(walletType || "").toLowerCase()}`);

  return ACCENT_CLASS_MAP[key] || ACCENT_CLASS_MAP[DEFAULT_THEME_KEY];
}
