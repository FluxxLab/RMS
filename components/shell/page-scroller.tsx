"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

interface PageScrollerProps {
  className?: string;
  children: ReactNode;
}

/**
 * The view, and the thing that scrolls it.
 *
 * The console is a fixed-height column — brand bar, view, footer — so `<body>`
 * does not scroll and this does. That costs one piece of browser behaviour
 * which has to be handed back deliberately: the keyboard.
 *
 * A browser sends Arrow, Page Up/Down, Home and End to the nearest scrollable
 * ancestor of whatever has focus. On arrival that is `<body>`, whose overflow
 * is hidden, so every one of those keys does nothing at all — the page simply
 * refuses to move until the reader happens to click on it first. Taking focus
 * here on arrival is what makes the keyboard work without that click.
 */
export function PageScroller({ className, children }: PageScrollerProps) {
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const arrived = useRef(false);

  useEffect(() => {
    const main = ref.current;
    if (!main) return;

    const firstRender = !arrived.current;
    arrived.current = true;

    const active = document.activeElement as HTMLElement | null;

    if (active && active !== document.body && active !== main) {
      /*
       * Two things outrank the scroll container, always. Someone typing is
       * mid-thought — the console's search box navigates as you type, and
       * pulling focus out of it would eat the next keystroke. A dialog has
       * moved focus inside itself on purpose, and taking it back would let the
       * keyboard escape a modal.
       */
      if (active.closest("dialog")) return;
      if (active.isContentEditable) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) return;

      /*
       * On the very first render anything already focused was focused
       * deliberately — an autofocused field, a restored position — so it is
       * left alone. A later run means a navigation happened, and then the
       * thing still holding focus is usually the link that caused it: it
       * belongs to the page being left, not the one arriving. Leaving focus
       * there is what makes Page Down draw a ring around a nav link and scroll
       * nothing, because a link's nearest scrollable ancestor is not the view.
       */
      if (firstRender) return;
    }

    // preventScroll because focus() would otherwise jump the container itself.
    main.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <main ref={ref} tabIndex={0} className={className}>
      {children}
    </main>
  );
}
