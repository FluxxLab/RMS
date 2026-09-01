import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Raises on hover — for cards that are, or contain, a primary link. */
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const PAD = { none: "", sm: "p-4", md: "p-5", lg: "p-6" } as const;

/**
 * Panel surface, matching the account-setup form: white, a 1px #DDE2E6 outline
 * and a 20px corner. Flat by default — depth is reserved for things that lift,
 * so an `interactive` panel is the only one that carries a shadow.
 */
export function Card({ interactive = false, padding = "md", className = "", ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-panel-border bg-bg-1 ${PAD[padding]} ${
        interactive
          ? "transition-[box-shadow,transform] duration-200 ease-[var(--ease-fluent-decel)] hover:shadow-8 focus-within:shadow-8"
          : ""
      } ${className}`}
      {...rest}
    />
  );
}

/**
 * `panel` is the form's heading tier (24/29) for a surface that owns a whole
 * task; `section` is the compact tier for dense staff views. The description
 * sits on the form's label tier so it reads as a caption to the heading rather
 * than as another piece of body text.
 */
type CardHeaderSize = "section" | "panel";

const TITLE: Record<CardHeaderSize, string> = {
  section: "type-subtitle-2 text-fg-1",
  panel: "type-title-3 text-heading-ink",
};

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  size?: CardHeaderSize;
  as?: "h1" | "h2" | "h3";
  className?: string;
}

export function CardHeader({ title, description, action, size = "section", as: Heading = "h2", className = "" }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <Heading className={TITLE[size]}>{title}</Heading>
        {description && <p className="mt-1 text-[14px] leading-[17px] text-field-label">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
