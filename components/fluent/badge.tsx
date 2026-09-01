import type { ReactNode } from "react";

export type BadgeTone = "brand" | "success" | "danger" | "warning" | "neutral" | "informative";
type Appearance = "tint" | "filled" | "outline";

/* "Order List" frame: the label sits on a 20% wash of its own colour, 4.5px
 * radius, 12/16. The frame's 700 weight becomes 500, the app-wide ceiling. */
const TINT: Record<BadgeTone, string> = {
  brand: "bg-brand/20 text-brand",
  success: "bg-success-bg text-success-fg",
  danger: "bg-danger-bg text-danger-fg",
  warning: "bg-warning-bg text-warning-fg",
  neutral: "bg-fg-3/20 text-fg-2",
  informative: "bg-brand/12 text-brand-ink",
};

const FILLED: Record<BadgeTone, string> = {
  brand: "bg-brand text-white",
  success: "bg-success-fg text-white",
  danger: "bg-danger-fg text-white",
  warning: "bg-warning-fg text-white",
  neutral: "bg-fg-3 text-white",
  informative: "bg-brand-hover text-white",
};

const OUTLINE: Record<BadgeTone, string> = {
  brand: "border-brand text-brand-ink",
  success: "border-success-fg text-success-fg",
  danger: "border-danger-fg text-danger-fg",
  warning: "border-warning-fg text-warning-fg",
  neutral: "border-stroke-1 text-fg-2",
  informative: "border-brand-hover text-brand-ink",
};

interface BadgeProps {
  tone?: BadgeTone;
  appearance?: Appearance;
  size?: "sm" | "md";
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Fluent pill badge. Status badges always pair an icon or text with the colour. */
export function Badge({
  tone = "neutral",
  appearance = "tint",
  size = "md",
  icon,
  className = "",
  children,
}: BadgeProps) {
  const look =
    appearance === "filled"
      ? FILLED[tone]
      : appearance === "outline"
        ? `border bg-transparent ${OUTLINE[tone]}`
        : `border border-transparent ${TINT[tone]}`;
  const dims = size === "sm" ? "h-6 px-3 type-caption-strong [&>svg]:size-3" : "h-7 px-4 type-caption-strong [&>svg]:size-3.5";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-[4.5px] ${dims} ${look} ${className}`}>
      {icon}
      {children}
    </span>
  );
}
