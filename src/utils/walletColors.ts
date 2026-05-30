export type WalletColorPreset = {
  key: "slate" | "indigo" | "emerald" | "rose" | "amber" | "sky";
  name: string;
  className: string;
  bgClass: string;
  hoverClass: string;
};

export const WALLET_COLOR_PRESETS: WalletColorPreset[] = [
  {
    key: "slate",
    name: "Charcoal",
    className: "from-slate-800 to-slate-950 text-white border-slate-700",
    bgClass: "bg-slate-900",
    hoverClass: "hover:border-slate-500",
  },
  {
    key: "indigo",
    name: "Indigo Aura",
    className: "from-indigo-600 to-violet-800 text-white border-indigo-500",
    bgClass: "bg-indigo-600",
    hoverClass: "hover:border-indigo-400",
  },
  {
    key: "emerald",
    name: "Forest Emerald",
    className: "from-emerald-500 to-teal-700 text-white border-emerald-400",
    bgClass: "bg-emerald-600",
    hoverClass: "hover:border-emerald-400",
  },
  {
    key: "rose",
    name: "Fierce Rose",
    className: "from-rose-500 to-pink-700 text-white border-rose-400",
    bgClass: "bg-rose-500",
    hoverClass: "hover:border-rose-400",
  },
  {
    key: "amber",
    name: "Solar Orange",
    className: "from-amber-400 to-orange-600 text-slate-900 border-amber-300",
    bgClass: "bg-amber-500",
    hoverClass: "hover:border-amber-400",
  },
  {
    key: "sky",
    name: "Ocean Sky",
    className: "from-sky-500 to-blue-700 text-white border-sky-400",
    bgClass: "bg-sky-500",
    hoverClass: "hover:border-sky-400",
  },
];

export const DEFAULT_WALLET_COLOR_INDEX = 1;

function inferThemeKey(value: string) {
  const lower = value.toLowerCase();

  if (
    lower.includes("emerald") ||
    lower.includes("teal") ||
    lower.includes("green")
  ) {
    return "emerald";
  }

  if (lower.includes("rose") || lower.includes("pink") || lower.includes("red")) {
    return "rose";
  }

  if (
    lower.includes("amber") ||
    lower.includes("orange") ||
    lower.includes("yellow")
  ) {
    return "amber";
  }

  if (lower.includes("sky") || lower.includes("blue") || lower.includes("cyan")) {
    return "sky";
  }

  if (lower.includes("slate") || lower.includes("gray") || lower.includes("grey")) {
    return "slate";
  }

  return "indigo";
}

export function getWalletColorPreset(index: number) {
  return WALLET_COLOR_PRESETS[
    Math.min(
      WALLET_COLOR_PRESETS.length - 1,
      Math.max(0, index)
    )
  ] || WALLET_COLOR_PRESETS[DEFAULT_WALLET_COLOR_INDEX];
}

export function getWalletColorIndex(theme?: string, walletType?: string) {
  const raw = String(theme || "").trim().toLowerCase();

  if (!raw) {
    return DEFAULT_WALLET_COLOR_INDEX;
  }

  const directMatch = WALLET_COLOR_PRESETS.findIndex(
    (preset) => raw.includes(preset.key) || raw.includes(preset.name.toLowerCase())
  );

  if (directMatch >= 0) {
    return directMatch;
  }

  const inferredKey = inferThemeKey(raw);
  const inferredIndex = WALLET_COLOR_PRESETS.findIndex(
    (preset) => preset.key === inferredKey
  );

  if (inferredIndex >= 0) {
    return inferredIndex;
  }

  const typeKey = inferThemeKey(String(walletType || ""));
  const typeIndex = WALLET_COLOR_PRESETS.findIndex(
    (preset) => preset.key === typeKey
  );

  return typeIndex >= 0 ? typeIndex : DEFAULT_WALLET_COLOR_INDEX;
}
