import type { ReactNode } from "react";
import { ChevronDown } from "@/components/icons";

/*
 * Split button (Figma "New Email Button"): 146×32, two halves with a 1px gap.
 *   Half Button      — padding 5px 12px 6px 9px · gap 10 · radius 4 0 0 4 · icon 20 · label 14/20 regular
 *   Dropdown Button  — padding 8px 6px · 28×32 · radius 0 4 4 0 · chevron 16
 */

interface SplitButtonProps {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  /** Opens the menu half. */
  onMenu?: () => void;
  menuLabel?: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

const HALF = {
  primary: "bg-brand text-white hover:bg-brand-hover active:bg-brand-pressed disabled:bg-bg-4 disabled:text-fg-disabled",
  secondary:
    "border border-stroke-1 bg-bg-1 text-fg-1 hover:bg-bg-3 active:bg-bg-5 disabled:border-stroke-2 disabled:bg-bg-4 disabled:text-fg-disabled",
} as const;

export function SplitButton({
  label,
  icon,
  onClick,
  onMenu,
  menuLabel = `More ${label.toLowerCase()} options`,
  variant = "primary",
  disabled = false,
}: SplitButtonProps) {
  const half = `${HALF[variant]} h-8 transition-colors duration-150 focus-ring disabled:pointer-events-none`;
  return (
    <div className="inline-flex gap-px">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`${half} flex items-center gap-2.5 rounded-l-sm pb-[6px] pl-[9px] pr-3 pt-[5px] type-body [&>svg]:size-5 [&>svg]:shrink-0`}
      >
        {icon}
        {label}
      </button>
      <button
        type="button"
        onClick={onMenu}
        disabled={disabled}
        aria-haspopup="menu"
        aria-label={menuLabel}
        className={`${half} flex w-7 items-center justify-center rounded-r-sm px-1.5`}
      >
        <ChevronDown size={16} />
      </button>
    </div>
  );
}
