"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { findTarget } from "@/lib/testing/find-target";
import { guideFor, type GuideEntry } from "@/lib/testing/guide-content";

/*
 * A guided tour for testers: one card at a time, pinned to the control the
 * step is about, with the rest of the page dimmed.
 *
 * It runs only when NEXT_PUBLIC-free TESTER_GUIDE_ENABLED is on, reads the
 * route and nothing else, and never touches the API. Steps are matched to
 * elements by role and accessible name — the same way the e2e suite finds
 * them — so no component needed a test id adding to it.
 *
 * The tour starts itself once per route per browser. After that the floating
 * button replays it, because a tester who has seen it once should not have to
 * dismiss it on every visit.
 */

const SEEN_KEY = "bil-rms.tour.seen";

/* ---------- state, held outside React ----------
 * The tour has to react to scrolling, resizing and the target element
 * appearing late, all of which happen outside a render. Keeping the state in
 * a small store subscribed to with useSyncExternalStore keeps the first
 * client render identical to the server's and avoids setState-in-effect.
 */

interface TourState {
  route: string | null;
  index: number;
  /** Where the spotlight sits, or null when this step has nothing to point at. */
  rect: { top: number; left: number; width: number; height: number } | null;
}

let state: TourState = { route: null, index: 0, rect: null };
let listeners: Array<() => void> = [];

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  return () => {
    listeners = listeners.filter((l) => l !== onChange);
  };
}

const getSnapshot = () => state;

/* One frozen object, not a fresh one per call: React compares snapshots by
   identity, and a new object every time is an infinite render loop. */
const SERVER_SNAPSHOT: TourState = { route: null, index: 0, rect: null };
const getServerSnapshot = () => SERVER_SNAPSHOT;

function seenRoutes(): string[] {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function markSeen(route: string) {
  try {
    const next = Array.from(new Set([...seenRoutes(), route]));
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(next));
  } catch {
    /* Private windows throw. The tour simply offers itself again. */
  }
}

function start(route: string) {
  state = { route, index: 0, rect: null };
  emit();
}

function stop(route: string | null) {
  if (route) markSeen(route);
  state = { route: null, index: 0, rect: null };
  emit();
}

function go(index: number) {
  state = { ...state, index, rect: null };
  emit();
}

/** Measure the current step's target, scrolling it into view if needed. */
function measure(entry: GuideEntry) {
  const step = entry.steps[state.index];
  const el = step?.target ? findTarget(step.target) : null;

  if (!el) {
    if (state.rect !== null) {
      state = { ...state, rect: null };
      emit();
    }
    return;
  }

  const r = el.getBoundingClientRect();
  const next = { top: r.top, left: r.left, width: r.width, height: r.height };
  const current = state.rect;
  const same =
    current &&
    Math.abs(current.top - next.top) < 1 &&
    Math.abs(current.left - next.left) < 1 &&
    Math.abs(current.width - next.width) < 1 &&
    Math.abs(current.height - next.height) < 1;

  if (!same) {
    state = { ...state, rect: next };
    emit();
  }
}

/* ---------- component ---------- */

const PAD = 6;
const CARD_W = 360;

export function TesterGuide() {
  const pathname = usePathname() ?? "/";
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const entry = guideFor(pathname);
  const running = entry !== null && snap.route === pathname;

  // Offer the tour the first time a route is seen. A store action, not a
  // setState, so the render loop is untouched.
  useEffect(() => {
    if (entry === null) return;
    if (seenRoutes().includes(pathname)) return;
    const timer = window.setTimeout(() => start(pathname), 600);
    return () => window.clearTimeout(timer);
  }, [pathname, entry]);

  // A step's target can arrive late, move while scrolling, or never exist.
  // Re-measuring on a frame loop covers all three without special-casing any.
  useEffect(() => {
    if (!running || entry === null) return;
    let frame = 0;
    const tick = () => {
      measure(entry);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [running, entry, snap.index]);

  const total = entry?.steps.length ?? 0;
  const next = useCallback(() => {
    if (snap.index + 1 < total) go(snap.index + 1);
    else go(total); // the closing card
  }, [snap.index, total]);

  const back = useCallback(() => go(Math.max(0, snap.index - 1)), [snap.index]);
  const end = useCallback(() => stop(pathname), [pathname]);

  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") end();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, next, back, end]);

  if (entry === null) return null;

  if (!running) {
    return (
      <button
        type="button"
        onClick={() => start(pathname)}
        className="fixed right-4 bottom-4 z-[60] flex items-center gap-2 rounded-full bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,0.22)] hover:bg-[var(--color-brand-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] sm:right-6 sm:bottom-6"
      >
        <span aria-hidden="true">?</span> Guide me
      </button>
    );
  }

  const closing = snap.index >= total;
  const step = closing ? null : entry.steps[snap.index];
  const rect = closing ? null : snap.rect;

  /* Below the target if there is room, otherwise above it; horizontally
     clamped so the card never hangs off the edge on a laptop screen. */
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const vw = typeof window === "undefined" ? 1280 : window.innerWidth;
  const below = rect ? rect.top + rect.height + 12 : 0;
  const placeAbove = rect ? below > vh - 220 : false;
  /* Anchored below, anchored above, or — when the step points at nothing —
     centred. The centred case is the tall closing card, so it is centred by
     transform rather than by a top offset, which would push it off-screen. */
  const cardTop = rect ? (placeAbove ? Math.max(12, rect.top - 12) : below) : vh / 2;
  const centred = rect === null;
  const cardLeft = rect
    ? Math.min(Math.max(12, rect.left + rect.width / 2 - CARD_W / 2), vw - CARD_W - 12)
    : Math.max(12, vw / 2 - CARD_W / 2);

  return (
    <>
      {/* The dim. A ring-shaped shadow makes the cutout, so the control stays
          readable and clickable while everything else recedes. */}
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[55] rounded-md transition-all duration-200"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(15, 19, 51, 0.55)",
            outline: "2px solid var(--color-brand)",
          }}
        />
      ) : (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[55] bg-[rgba(15,19,51,0.55)]" />
      )}

      <section
        role="dialog"
        aria-live="polite"
        aria-label={`Tester guide: ${entry.title}`}
        className="fixed z-[60] flex w-[min(22.5rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg bg-[var(--color-surface)] shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
        style={{
          top: cardTop,
          left: cardLeft,
          // Never taller than the screen; the body scrolls inside instead.
          maxHeight: "calc(100vh - 1.5rem)",
          transform: centred ? "translateY(-50%)" : placeAbove ? "translateY(-100%)" : undefined,
        }}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 bg-[var(--color-brand)] px-4 py-2.5 text-white">
          <p className="text-[11px] font-semibold tracking-wide uppercase opacity-85">
            {entry.title} · {closing ? "Finish" : `Step ${snap.index + 1} of ${total}`}
          </p>
          <button
            type="button"
            onClick={end}
            aria-label="End the guide"
            className="-mr-1 rounded px-2 py-0.5 text-lg leading-none text-white/80 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            &times;
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-[13px] leading-relaxed text-[var(--color-ink)]">
          {closing ? (
            <>
              <p className="font-semibold">Before you write anything up</p>
              <p className="mt-1 text-[12px] text-[var(--color-icon)]">{entry.goal}</p>

              <h3 className="mt-3 text-[11px] font-semibold tracking-wide uppercase text-[var(--color-success-fg)]">
                Correct — do not report
              </h3>
              <ul className="mt-1.5 space-y-1.5 rounded border border-[var(--color-success-stroke)] bg-[var(--color-success-bg)] px-3 py-2">
                {entry.accept.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <h3 className="mt-3 text-[11px] font-semibold tracking-wide uppercase text-[var(--color-danger-fg)]">
                Raise this if you see it
              </h3>
              <ul className="mt-1.5 space-y-1.5 rounded border border-[var(--color-danger-stroke)] bg-[var(--color-danger-bg)] px-3 py-2">
                {entry.report.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className="font-semibold">{step?.action}</p>
              <p className="mt-1.5">
                <span className="font-semibold text-[var(--color-brand)]">Expect: </span>
                <span className="text-[var(--color-icon)]">{step?.expect}</span>
              </p>
              {step?.target && rect === null ? (
                <p className="mt-2 text-[12px] text-[var(--color-warning-fg)]">
                  The control for this step is not on screen — it may need a different page or a sign-in first.
                </p>
              ) : null}
            </>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--color-divider)] px-4 py-2.5">
          <button
            type="button"
            onClick={end}
            className="rounded px-2 py-1 text-[12px] text-[var(--color-icon)] hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {snap.index > 0 ? (
              <button
                type="button"
                onClick={back}
                className="rounded border border-[var(--color-divider)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-ink)] hover:bg-[var(--color-rail)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={closing ? end : next}
              className="rounded bg-[var(--color-brand)] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--color-brand-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
            >
              {closing ? "Done" : "Next"}
            </button>
          </div>
        </footer>
      </section>
    </>
  );
}
