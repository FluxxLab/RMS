import type { ReactNode } from "react";

interface AppFooterProps {
  /** The line this interface's audience needs to see on every screen. */
  note: ReactNode;
}

/**
 * The frame's foot. It is a sibling of the scrolling view rather than a
 * `position: fixed` bar, so it is always on screen without floating over the
 * content or needing the pages to reserve space for it.
 */
export function AppFooter({ note }: AppFooterProps) {
  return (
    <footer className="shrink-0 border-t border-stroke-2 bg-bg-1">
      <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-x-8 gap-y-1 px-6 py-3 text-[12px] leading-[16px] text-field-label">
        <p>Behavioural Insights Lab · Research Management System</p>
        <p>{note}</p>
      </div>
    </footer>
  );
}
