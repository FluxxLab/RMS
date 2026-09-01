import Link from "next/link";
import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { ChevronRight } from "@/components/icons";

/* ---------- Page header ---------- */

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, actions, className = "" }: PageHeaderProps) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 type-caption-strong uppercase tracking-wide text-fg-3">{eyebrow}</p>}
        <h1 className="type-title-2 text-fg-1">{title}</h1>
        {description && <p className="mt-1 max-w-2xl type-body-lg text-fg-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ---------- Breadcrumb ---------- */

interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 type-caption text-fg-3">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            {item.href ? (
              <Link href={item.href} className="rounded-xs hover:text-fg-1 hover:underline focus-ring">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-fg-1">
                {item.label}
              </span>
            )}
            {i < items.length - 1 && <ChevronRight size={12} aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ---------- Meter ---------- */

interface MeterProps {
  value: number; // 0–100
  label: string;
  tone?: "brand" | "success" | "warning" | "danger";
  className?: string;
}

const METER_FILL = {
  brand: "bg-brand",
  success: "bg-success-fg",
  warning: "bg-warning-fg",
  danger: "bg-danger-fg",
} as const;

/** Thin Fluent progress track; fill and track share a ramp so state reads along the whole bar. */
export function Meter({ value, label, tone = "brand", className = "" }: MeterProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={`h-1 w-full overflow-hidden rounded-full bg-brand-tint ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ease-[var(--ease-fluent-decel)] ${METER_FILL[tone]}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/* ---------- Table ---------- */

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse text-left text-[14px] leading-[19px]">{children}</table>
    </div>
  );
}

interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export function Th({ numeric = false, className = "", children, ...rest }: ThProps) {
  return (
    <th
      scope="col"
      className={`border-b-[0.6px] border-[#d5d5d5] bg-[#fcfdfd] px-4 font-normal uppercase text-[#202224]/90 ${numeric ? "text-right" : ""} ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
  muted?: boolean;
}

export function Td({ numeric = false, muted = false, className = "", children, ...rest }: TdProps) {
  return (
    <td
      className={`border-b-[0.4px] border-[#979797]/60 px-4 ${numeric ? "text-right tabular-nums" : ""} ${muted ? "text-fg-3" : "text-[#202224]/90"} ${className}`}
      {...rest}
    >
      {children}
    </td>
  );
}
