"use client";

import { useCallback, useEffect, useId, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { guideFor } from "@/lib/testing/guide-content";

/*
 * A floating, per-page crib sheet for testers.
 *
 * It is mounted only when NEXT_PUBLIC_TESTER_GUIDE is set, so it cannot reach
 * a real participant. Everything it says is advisory: it reads the route and
 * nothing else, holds no state the app depends on, and never touches the API.
 *
 * The panel is deliberately not a modal. A tester needs to read the step and
 * then click the thing the step describes, so focus stays where they put it
 * and the page underneath keeps working.
 */

const STORAGE_KEY = "bil-rms.tester-guide.open";

function readStoredOpen(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private windows and blocked site data both throw here. Closed is a safe
    // default: the button is still there.
    return false;
  }
}

function storeOpen(open: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  } catch {
    /* Not worth surfacing — the panel simply forgets between pages. */
  }
}

/*
 * Open/closed is browser state the component subscribes to rather than owns,
 * which keeps the first client render identical to the server's (closed) and
 * lets the stored preference arrive without a setState in an effect.
 */
let listeners: Array<() => void> = [];
let openState: boolean | null = null;

function subscribe(onChange: () => void): () => void {
  listeners.push(onChange);
  return () => {
    listeners = listeners.filter((listener) => listener !== onChange);
  };
}

function getSnapshot(): boolean {
  if (openState === null) openState = readStoredOpen();
  return openState;
}

/** Always closed on the server: there is no storage to read there. */
function getServerSnapshot(): boolean {
  return false;
}

function setOpenState(next: boolean): void {
  openState = next;
  storeOpen(next);
  for (const listener of listeners) listener();
}

export function TesterGuide() {
  const pathname = usePathname();
  const open = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const panelId = useId();

  const toggle = useCallback(() => setOpenState(!getSnapshot()), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenState(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const entry = guideFor(pathname ?? "/");
  if (entry === null) return null;

  return (
    <div className="pointer-events-none fixed inset-y-0 right-0 z-50 flex max-w-full flex-col items-end justify-end gap-3 p-4 sm:p-6">
      {open ? (
        <section
          id={panelId}
          aria-labelledby={`${panelId}-title`}
          className="pointer-events-auto flex max-h-[min(34rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg bg-[var(--color-surface)] shadow-[0_8px_32px_rgba(0,0,0,0.18)] ring-1 ring-[var(--color-divider)]"
        >
          <header className="flex items-start gap-3 bg-[var(--color-brand)] px-4 py-3 text-white">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold tracking-wide uppercase opacity-80">Tester guide</p>
              <h2 id={`${panelId}-title`} className="truncate text-sm font-semibold">
                {entry.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={toggle}
              aria-label="Close tester guide"
              className="-mr-1 shrink-0 rounded px-2 py-1 text-lg leading-none text-white/80 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              &times;
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-3 text-[13px] leading-relaxed text-[var(--color-ink)]">
            <p className="text-[var(--color-icon)]">{entry.goal}</p>

            <h3 className="mt-4 text-[11px] font-semibold tracking-wide uppercase text-[var(--color-icon)]">
              Do this, in order
            </h3>
            <ol className="mt-1.5 list-decimal space-y-3 pl-4 marker:font-semibold marker:text-[var(--color-brand)]">
              {entry.steps.map((step) => (
                <li key={step.action}>
                  <span className="font-semibold text-[var(--color-ink)]">{step.action}</span>
                  {/* The expected result is the test. Without it a step only
                      proves that something happened. */}
                  <span className="mt-0.5 block text-[var(--color-icon)]">
                    <span className="font-semibold text-[var(--color-brand)]">Expect: </span>
                    {step.expect}
                  </span>
                </li>
              ))}
            </ol>

            <h3 className="mt-4 text-[11px] font-semibold tracking-wide uppercase text-[var(--color-success-fg)]">
              Correct — do not report
            </h3>
            <ul className="mt-1.5 space-y-1.5 rounded border border-[var(--color-success-stroke)] bg-[var(--color-success-bg)] px-3 py-2">
              {entry.accept.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h3 className="mt-4 text-[11px] font-semibold tracking-wide uppercase text-[var(--color-danger-fg)]">
              Raise this if you see it
            </h3>
            <ul className="mt-1.5 space-y-1.5 rounded border border-[var(--color-danger-stroke)] bg-[var(--color-danger-bg)] px-3 py-2">
              {entry.report.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <p className="mt-4 border-t border-[var(--color-divider)] pt-3 text-[12px] text-[var(--color-icon)]">
              Unsure whether something is a defect? Ask before writing it up.
            </p>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,0.22)] hover:bg-[var(--color-brand-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:bg-[var(--color-brand-pressed)]"
      >
        <span aria-hidden="true" className="text-base leading-none">
          ?
        </span>
        {open ? "Hide guide" : "Testing guide"}
      </button>
    </div>
  );
}
