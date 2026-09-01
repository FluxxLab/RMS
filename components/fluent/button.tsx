import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "subtle" | "outline" | "brandOutline" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

/*
 * Button (Figma): 32px tall · radius 4 · label 14/20 regular · icon 20px
 *   with icon: padding 5px 12px 6px 9px, gap 10  ·  without: padding 0 12px
 */
const BASE =
  "inline-flex shrink-0 cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-sm transition-[background-color,box-shadow,color,border-color] duration-150 ease-[var(--ease-fluent)] focus-ring disabled:pointer-events-none [&>svg]:shrink-0";

// Fluent disabled state is neutral (#F0F0F0 surface, #BDBDBD text), never a faded brand colour.
const DISABLED = "disabled:border-stroke-2 disabled:bg-bg-4 disabled:text-fg-disabled disabled:shadow-none";
const DISABLED_SUBTLE = "disabled:bg-transparent disabled:text-fg-disabled";

const VARIANT: Record<ButtonVariant, string> = {
  primary: `bg-brand text-white hover:bg-brand-hover active:bg-brand-pressed ${DISABLED}`,
  secondary: `border-2 border-brand bg-transparent text-brand hover:bg-brand-tint-2 active:bg-brand-tint ${DISABLED}`,
  subtle: `bg-transparent text-fg-2 hover:bg-bg-3 hover:text-fg-1 active:bg-bg-5 ${DISABLED_SUBTLE}`,
  outline: `border border-stroke-1 bg-transparent text-fg-1 hover:bg-bg-3 active:bg-bg-5 ${DISABLED}`,
  brandOutline: `border-2 border-brand bg-transparent text-brand hover:bg-brand-tint-2 active:bg-brand-tint ${DISABLED}`,
  danger: `bg-danger-fg text-white hover:bg-danger-hover active:bg-[#960b18] ${DISABLED}`,
};

/** The spec's asymmetric padding: 9px on the icon side, 12px on the label side. */
const SIZE: Record<ButtonSize, { plain: string; leading: string; trailing: string }> = {
  sm: {
    plain: "h-9 gap-2 rounded-lg px-3 type-body [&>svg]:size-4",
    leading: "h-9 gap-2 rounded-lg pl-2.5 pr-3 type-body [&>svg]:size-4",
    trailing: "h-9 gap-2 rounded-lg pl-3 pr-2.5 type-body [&>svg]:size-4",
  },
  md: {
    plain: "h-11 gap-2.5 rounded-xl px-4 text-[16px] leading-[19px] [&>svg]:size-5",
    leading: "h-11 gap-2.5 rounded-xl pl-3.5 pr-4 text-[16px] leading-[19px] [&>svg]:size-5",
    trailing: "h-11 gap-2.5 rounded-xl pl-4 pr-3.5 text-[16px] leading-[19px] [&>svg]:size-5",
  },
  lg: {
    plain: "h-[52px] gap-2.5 rounded-xl px-4 text-[18px] leading-[22px] [&>svg]:size-5",
    leading: "h-[52px] gap-2.5 rounded-xl pl-3.5 pr-4 text-[18px] leading-[22px] [&>svg]:size-5",
    trailing: "h-[52px] gap-2.5 rounded-xl pl-4 pr-3.5 text-[18px] leading-[22px] [&>svg]:size-5",
  },
  // Account-setup frame: 180x58, radius 12, label 20/24.
  xl: {
    plain: "h-[58px] min-w-[180px] gap-2.5 rounded-xl px-4 text-[20px] leading-6 [&>svg]:size-6",
    leading: "h-[58px] min-w-[180px] gap-2.5 rounded-xl px-4 text-[20px] leading-6 [&>svg]:size-6",
    trailing: "h-[58px] min-w-[180px] gap-2.5 rounded-xl px-4 text-[20px] leading-6 [&>svg]:size-6",
  },
};

type IconSide = "none" | "leading" | "trailing";

export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", side: IconSide = "none", extra = "") {
  const dims = side === "none" ? SIZE[size].plain : SIZE[size][side];
  return `${BASE} ${VARIANT[variant]} ${dims} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconAfter?: ReactNode;
  /** Shows a spinner and disables the control while an async action runs. */
  loading?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconAfter,
  loading = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, icon || loading ? "leading" : iconAfter ? "trailing" : "none", className)}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
      {!loading && iconAfter}
    </button>
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconAfter?: ReactNode;
}

export function ButtonLink({ variant = "secondary", size = "md", icon, iconAfter, className = "", children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, icon ? "leading" : iconAfter ? "trailing" : "none", className)} {...rest}>
      {icon}
      {children}
      {iconAfter}
    </Link>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`size-4 animate-spin ${className}`} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx={10} cy={10} r={7} stroke="currentColor" strokeOpacity={0.25} strokeWidth={2} />
      <path d="M17 10a7 7 0 0 0-7-7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
