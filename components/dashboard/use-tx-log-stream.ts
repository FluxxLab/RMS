"use client";

import { useEffect, useRef, useState } from "react";

// The shape is the API's, so it is described once — in the schema that
// validates it. Only the type crosses over; no zod reaches the browser.
import type { TxLogEntry } from "@/lib/api/schemas";

export type { TxLogEntry };

export type StreamStatus = "connecting" | "live" | "polling" | "offline";

/** How often to ask when the stream is not available. */
const POLL_INTERVAL_MS = 15_000;

/** The most entries to hold. The log is a running view, not an archive. */
const MAX_ENTRIES = 100;

function isEntry(value: unknown): value is TxLogEntry {
  if (value === null || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  return (
    (e.kind === "ok" || e.kind === "info" || e.kind === "err") &&
    typeof e.message === "string" &&
    typeof e.at === "string"
  );
}

/** Newest first, and never two records of the same call. */
function merge(existing: TxLogEntry[], incoming: TxLogEntry[]): TxLogEntry[] {
  const seen = new Set(existing.map((e) => `${e.at}|${e.message}`));
  const fresh = incoming.filter((e) => !seen.has(`${e.at}|${e.message}`));
  if (fresh.length === 0) return existing;
  return [...fresh, ...existing].sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX_ENTRIES);
}

/**
 * The live transaction log.
 *
 * One subscription, owned here and torn down on unmount. It prefers the
 * event stream and falls back to polling when that cannot be opened or drops,
 * so the console keeps reporting either way rather than going quiet (TR-012).
 *
 * `initial` is the server-rendered log, so the view has content before the
 * subscription says anything.
 */
export function useTxLogStream(initial: TxLogEntry[]): { entries: TxLogEntry[]; status: StreamStatus } {
  const [entries, setEntries] = useState<TxLogEntry[]>(initial);
  const [status, setStatus] = useState<StreamStatus>("connecting");

  // Held in a ref so the effect can stop them without being re-run by them.
  const source = useRef<EventSource | null>(null);
  const poller = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let live = true;

    const stopPolling = () => {
      if (poller.current !== null) {
        clearInterval(poller.current);
        poller.current = null;
      }
    };

    const poll = async () => {
      try {
        const response = await fetch("/api/tx-log", { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const body: unknown = await response.json();
        const incoming = (body as { entries?: unknown }).entries;
        if (!live) return;
        if (Array.isArray(incoming)) {
          setEntries((prev) => merge(prev, incoming.filter(isEntry)));
          setStatus("polling");
        }
      } catch {
        if (live) setStatus("offline");
      }
    };

    const startPolling = () => {
      if (poller.current !== null) return;
      void poll();
      poller.current = setInterval(poll, POLL_INTERVAL_MS);
    };

    // EventSource is absent in some environments; polling covers those too.
    if (typeof EventSource === "undefined") {
      startPolling();
      return () => {
        live = false;
        stopPolling();
      };
    }

    const stream = new EventSource("/api/tx-log/stream");
    source.current = stream;

    stream.onopen = () => {
      if (!live) return;
      stopPolling();
      setStatus("live");
    };

    stream.onmessage = (event) => {
      if (!live) return;
      try {
        const payload: unknown = JSON.parse(event.data);
        const incoming = Array.isArray(payload) ? payload : [payload];
        setEntries((prev) => merge(prev, incoming.filter(isEntry)));
        setStatus("live");
      } catch {
        // A frame this app cannot read is not a reason to drop the stream.
      }
    };

    stream.onerror = () => {
      if (!live) return;
      // The browser retries on its own; polling keeps the view current meanwhile.
      startPolling();
    };

    return () => {
      live = false;
      stream.close();
      source.current = null;
      stopPolling();
    };
  }, []);

  return { entries, status };
}
