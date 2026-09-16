"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/*
 * A bar across the top of every navigation.
 *
 * `loading.tsx` is the right mechanism but the wrong instrument here: it only
 * renders while a navigation is actually suspended, and Next prefetches links,
 * so a warm route on a local server resolves in tens of milliseconds and shows
 * nothing at all. The result is an app that feels unresponsive precisely
 * because it is fast — the click appears to do nothing until the page swaps.
 *
 * So this starts on the click rather than on the suspension, and stays for a
 * minimum beat afterwards. A flash of progress that is over before it is seen
 * is the same as no progress; holding it briefly is what makes the click feel
 * answered.
 */

/** Long enough to register as a response, short enough not to feel like a wait. */
const MINIMUM_VISIBLE_MS = 420;

export function RouteProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const startedAt = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Start on any click that will navigate within the app.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // A modified click opens a tab; this one stays put, so nothing loads here.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = (event.target as HTMLElement | null)?.closest?.("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || link.target === "_blank") return;

      // Same-page links and downloads are not navigations.
      if (href === pathname || link.hasAttribute("download")) return;
      if (/^https?:\/\//i.test(href) && !href.startsWith(window.location.origin)) return;

      startedAt.current = Date.now();
      setActive(true);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  // Arriving ends it, but never before the minimum beat has passed.
  useEffect(() => {
    if (!active) return;

    const elapsed = Date.now() - startedAt.current;
    const remaining = Math.max(0, MINIMUM_VISIBLE_MS - elapsed);

    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setActive(false), remaining);

    return () => clearTimeout(hideTimer.current);
    // `pathname` is the signal that the navigation landed.
  }, [pathname, active]);

  /*
   * A failed or cancelled navigation would otherwise leave the bar running for
   * ever, which reads as a hung app. It gives up on its own.
   */
  useEffect(() => {
    if (!active) return;
    const giveUp = setTimeout(() => setActive(false), 10_000);
    return () => clearTimeout(giveUp);
  }, [active]);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading the next page"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] bg-brand-tint"
    >
      <div className="h-full w-1/3 rounded-r-full bg-brand motion-safe:animate-loader-sweep" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
