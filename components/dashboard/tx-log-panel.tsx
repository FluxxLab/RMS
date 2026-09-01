"use client";

import { Badge, Card, CardHeader, type BadgeTone } from "@/components/fluent";
import { CheckmarkCircle, Dismiss, Info } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { Pulse } from "@/components/icons";
import { fmtDateTime } from "@/lib/format";
import { useTxLogStream, type StreamStatus, type TxLogEntry } from "./use-tx-log-stream";

/* Outcome is shown as icon, label and colour together — never colour alone. */
const KIND: Record<TxLogEntry["kind"], { label: string; tone: BadgeTone; icon: React.ReactNode }> = {
  ok: { label: "Accepted", tone: "success", icon: <CheckmarkCircle /> },
  info: { label: "Info", tone: "brand", icon: <Info /> },
  err: { label: "Refused", tone: "danger", icon: <Dismiss /> },
};

const STATUS: Record<StreamStatus, { label: string; dot: string; detail: string }> = {
  connecting: { label: "Connecting", dot: "bg-fg-4", detail: "opening the live feed" },
  live: { label: "Live", dot: "bg-success-fg", detail: "streaming as calls happen" },
  polling: { label: "Polling", dot: "bg-warning-fg", detail: "the stream is unavailable, so this refreshes periodically" },
  offline: { label: "Offline", dot: "bg-danger-fg", detail: "the log cannot be reached; reload to try again" },
};

interface TxLogPanelProps {
  /** The log as the server rendered it, so the panel has content immediately. */
  initial: TxLogEntry[];
}

/** Every booking-engine call, as it happens. */
export function TxLogPanel({ initial }: TxLogPanelProps) {
  const { entries, status } = useTxLogStream(initial);
  const meta = STATUS[status];

  return (
    <Card padding="none">
      <CardHeader
        title="Transaction log"
        description="Every call the booking engine has answered, newest first"
        className="px-4 pb-4 pt-5"
        action={
          <span className="flex items-center gap-2 text-[14px] leading-[17px] text-field-label" title={meta.detail}>
            <span className={`inline-block size-2 rounded-full ${meta.dot}`} aria-hidden="true" />
            <span className="sr-only">Live log status: </span>
            {meta.label}
          </span>
        }
      />

      {entries.length === 0 ? (
        <div className="border-t border-stroke-2 py-10">
          <EmptyState
            icon={<Pulse />}
            title="No engine calls yet"
            hint="Trigger a reservation and it appears here the moment the engine answers."
          />
        </div>
      ) : (
        <ul className="border-t border-stroke-2" aria-live="polite" aria-label="Engine calls">
          {entries.map((entry) => (
            <li
              key={`${entry.at}-${entry.message}`}
              className="flex flex-wrap items-center gap-3 border-b border-stroke-3 px-4 py-3 last:border-b-0"
            >
              <span className="w-44 shrink-0 tabular-nums text-[14px] leading-[20px] text-field-label">
                {fmtDateTime(entry.at)}
              </span>
              <Badge tone={KIND[entry.kind].tone} size="sm" icon={KIND[entry.kind].icon}>
                {KIND[entry.kind].label}
              </Badge>
              <span className="min-w-0 flex-1 text-[14px] leading-[20px] text-fg-1">{entry.message}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
