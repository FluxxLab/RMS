"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

export interface RailItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** Resting colour. Defaults to #616161; the second group may carry brand hues. */
  color?: string;
}

interface AppRailProps {
  /** Frame 3998 — the four primary destinations. */
  primary: RailItem[];
  /** Frame 3999 — secondary surfaces (optional). */
  secondary?: RailItem[];
  /** Frame 3995 — the 24px App Folder slot at the end. */
  bottom?: RailItem;
  /** Treat this href as active for exact-match roots like "/". */
  exact?: string[];
  /** Rail width in px. The Outlook frame is 49; widen here and everything re-centres. */
  width?: number;
  /** Show the label under each icon (for wide rails, ≥ 72px). */
  labels?: boolean;
}

/*
 * Apps Section (Figma): column · padding 7px 0 0 · gap 17px · 49px · #F0F0F0
 *   Active row 49×32 with a 2×32 brand bar at x=2; other rows 49×28, gap 18
 *   Secondary rows 49×28, gap 18 · 14px · App Folder 49×32 with a 24px icon
 * With `labels`, rows grow to 52px and carry a 12px caption under the icon.
 */

function RailLink({ item, active, labels }: { item: RailItem; active: boolean; labels: boolean }) {
  const rowHeight = labels ? "h-[52px]" : active ? "h-8" : "h-7";
  return (
    // Figma follows the 32px active row with a 15px gap (18px elsewhere): -3px keeps that rhythm.
    <li className={`${rowHeight} ${active && !labels ? "-mb-[3px]" : ""}`}>
      <Link
        href={item.href}
        aria-label={item.label}
        title={item.label}
        aria-current={active ? "page" : undefined}
        style={active ? undefined : { color: item.color }}
        className={`relative flex w-(--rail-w) flex-col items-center justify-center gap-1 rounded-sm transition-colors focus-ring [&>svg]:size-5 ${rowHeight} ${
          active ? "text-brand" : "text-icon hover:text-ink"
        } ${labels ? "hover:bg-black/5" : ""}`}
      >
        {active && (
          <span
            className={`absolute left-0.5 top-0 w-0.5 rounded-[2px] bg-brand ${labels ? "h-[52px]" : "h-8"}`}
            aria-hidden="true"
          />
        )}
        {item.icon}
        {labels && (
          <span className={`max-w-full truncate px-1 text-[11px] leading-[14px] ${active ? "font-medium" : "font-normal"}`}>
            {item.label}
          </span>
        )}
      </Link>
    </li>
  );
}

export function AppRail({ primary, secondary = [], bottom, exact = [], width = 49, labels = false }: AppRailProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    exact.includes(href) ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const groupGap = labels ? "gap-1" : "gap-[18px]";

  return (
    <nav
      aria-label="Sections"
      style={{ width, "--rail-w": `${width}px` } as CSSProperties}
      className="flex shrink-0 flex-col items-start gap-[17px] self-stretch bg-rail pt-[7px]"
    >
      <ul className={`flex flex-col ${groupGap}`}>
        {primary.map((item) => (
          <RailLink key={item.href} item={item} active={isActive(item.href)} labels={labels} />
        ))}
      </ul>

      {(secondary.length > 0 || bottom) && (
        <div className="flex flex-col gap-3.5">
          {secondary.length > 0 && (
            <ul className={`flex flex-col ${groupGap}`}>
              {secondary.map((item) => (
                <RailLink key={item.href} item={item} active={isActive(item.href)} labels={labels} />
              ))}
            </ul>
          )}
          {bottom && (
            <Link
              href={bottom.href}
              aria-label={bottom.label}
              title={bottom.label}
              className={`flex w-(--rail-w) flex-col items-center justify-center gap-1 rounded-sm py-1 text-icon hover:text-ink focus-ring [&>svg]:size-6 ${labels ? "h-[52px] hover:bg-black/5" : "h-8"}`}
            >
              {bottom.icon}
              {labels && <span className="max-w-full truncate px-1 text-[11px] leading-[14px]">{bottom.label}</span>}
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
