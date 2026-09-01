import type { ButtonHTMLAttributes, ReactNode } from "react";

interface TagToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onToggle"> {
  selected: boolean;
  label: string;
  /** Leading icon, 16px. */
  icon?: ReactNode;
}

/**
 * Fluent InteractionTag: 4px corners, leading icon, neutral at rest; brand
 * tint with a brand icon when selected. `aria-pressed` carries the state.
 */
export function TagToggle({ selected, label, icon, className = "", ...rest }: TagToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`inline-flex h-8 items-center gap-1.5 rounded-sm border pl-2.5 pr-3 type-body transition-colors duration-150 focus-ring [&>svg]:size-4 [&>svg]:shrink-0 ${
        selected
          ? "border-brand-tint bg-brand-tint text-brand-ink hover:bg-brand-tint [&>svg]:text-brand"
          : "border-stroke-1 bg-bg-1 text-fg-1 hover:bg-bg-3 [&>svg]:text-fg-3"
      } ${className}`}
      {...rest}
    >
      {icon}
      {label}
    </button>
  );
}
