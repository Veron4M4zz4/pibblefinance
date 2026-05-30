import { motion } from "motion/react";
import { useTheme } from "../context/ThemeProvider";
import {
  DEFAULT_WALLET_COLOR_INDEX,
  getWalletColorPreset,
  WALLET_COLOR_PRESETS,
} from "../utils/walletColors";

interface WalletColorPickerProps {
  value: number;
  onChange: (index: number) => void;
  label?: string;
  size?: "sm" | "lg";
  showNames?: boolean;
  "data-testid"?: string;
}

export default function WalletColorPicker({
  value,
  onChange,
  label = "Tema & Aparência",
  size = "sm",
  showNames = false,
  "data-testid": testId,
}: WalletColorPickerProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const selectedPreset = getWalletColorPreset(
    value ?? DEFAULT_WALLET_COLOR_INDEX
  );

  const buttonSize = size === "lg" ? "h-9 w-9" : "h-7 w-7";

  return (
    <div data-testid={testId}>
      <label className="mb-2 block text-ui-label">{label}</label>

      <div className="flex flex-wrap gap-2.5">
        {WALLET_COLOR_PRESETS.map((color, index) => (
          <motion.button
            key={color.name}
            type="button"
            onClick={() => onChange(index)}
            whileTap={{ scale: 0.96 }}
            whileHover={{ y: -1 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className={`relative flex ${buttonSize} items-center justify-center rounded-full border-2 ${color.bgClass} ${color.hoverClass} transition-all duration-200 ${
              value === index
                ? `ring-2 ${
                    isLight ? "ring-slate-900" : "ring-slate-100"
                  } ring-offset-2 ${
                    isLight ? "ring-offset-white" : "ring-offset-slate-950/10"
                  }`
                : ""
            }`}
            title={color.name}
            aria-label={color.name}
            aria-pressed={value === index}
          >
            {value === index && (
              <span
                className={`block h-1.5 w-1.5 rounded-full ${
                  index === 4 ? "bg-slate-950" : "bg-white"
                }`}
              />
            )}
          </motion.button>
        ))}
      </div>

      {showNames && (
        <p className={`mt-2 text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
          Selecionado:{" "}
          <strong className={isLight ? "text-slate-900" : "text-slate-100"}>
            {selectedPreset.name}
          </strong>
        </p>
      )}
    </div>
  );
}
