"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface TopNavLink {
  href: string;
  label: string;
}

interface TopNavProps {
  links: TopNavLink[];
  /** Treat these hrefs as active only on an exact match, for roots like "/". */
  exact?: string[];
}

/**
 * Console sections, carried inside the brand bar. Each section runs the full
 * height of the bar, so the current one's 2px rule sits on the bar's bottom
 * edge rather than floating under the label. `aria-current` marks it too, so it
 * is announced to a screen reader and never signalled by colour alone. Sections too wide for the bar scroll rather
 * than wrap, which would change the bar's height.
 */
export function TopNav({ links, exact = [] }: TopNavProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    exact.includes(href) ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Console sections" className="h-full min-w-0">
      <ul className="scroll-thin flex h-full items-stretch gap-1 overflow-x-auto">
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full items-center whitespace-nowrap border-b-2 px-3 text-[16px] leading-[19px] transition-colors duration-150 focus-ring-inverse ${
                  active ? "border-white text-white" : "border-transparent text-white/80 hover:border-white/40 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
