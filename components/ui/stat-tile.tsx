import type { ReactNode } from "react";

/*
 * "Total Users" frame: card 14px radius · shadow 6px 6px 54px rgba(0,0,0,.05)
 * · label 16/22 #202224 at 70% · value 28/38 with 1px tracking · a 23px-radius
 * icon tile in a tint of its own colour.
 *
 * The frame's #8280FF becomes the brand indigo, this app's one accent. The
 * frame also carries a green "up from yesterday" line; this app stores no
 * day-over-day figures, so the detail line says what the number counts instead
 * of claiming a movement it cannot measure.
 */

/**
 * The KPI row: equal columns that always fit the width. auto-cols-fr divides
 * the row by however many cards it is given, so the row never scrolls and never
 * stacks — the cards narrow instead.
 */
export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid shrink-0 auto-cols-fr grid-flow-col gap-5 py-1">{children}</div>;
}

interface StatTileProps {
  /** Sentence case, no trailing colon. */
  label: string;
  value: string;
  detail: string;
  /** Sits in the tinted tile, telling the cards apart at a glance. */
  icon?: ReactNode;
  /** Optional meter or sparkline rendered between value and detail. */
  children?: ReactNode;
}

export function StatTile({ label, value, detail, icon, children }: StatTileProps) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl bg-bg-1 p-5 shadow-[6px_6px_54px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[16px] leading-[22px] text-[#202224] opacity-70">{label}</p>
          <p className="mt-2 text-[28px] font-semibold leading-[38px] tracking-[1px] tabular-nums text-[#202224]">{value}</p>
        </div>
        {icon && (
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-[18px] bg-brand/15 text-brand [&>svg]:size-5"
          >
            {icon}
          </span>
        )}
      </div>
      {children}
      <p className="mt-4 text-[16px] leading-[22px] text-[#202224] opacity-70">{detail}</p>
    </div>
  );
}
