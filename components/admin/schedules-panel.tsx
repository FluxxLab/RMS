"use client";

import { useMemo, useState } from "react";
import { cancelSession } from "@/app/(admin)/admin/actions";
import { Badge, Button, Card, CardHeader, DataTable, Dialog, FilterBar, type BadgeTone, type DataColumn } from "@/components/fluent";
import { fmtDate, fmtRange } from "@/lib/format";
import type { SlotRow } from "@/lib/slots";
import type { ScheduleStatus } from "@/lib/types";
import { AdminNotice } from "./admin-notice";
import { useAdminAction } from "./use-admin-action";

const STATUS: Record<ScheduleStatus, { label: string; tone: BadgeTone }> = {
  available: { label: "Available", tone: "success" },
  full: { label: "Full", tone: "brand" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const ALL = "all";

interface SchedulesPanelProps {
  slots: SlotRow[];
  /** The lab's clock at render, so "upcoming" means the same on both sides. */
  now: string;
}

export function SchedulesPanel({ slots, now }: SchedulesPanelProps) {
  const { notice, dismiss, pending, run } = useAdminAction();
  const [confirming, setConfirming] = useState<SlotRow | null>(null);
  const [study, setStudy] = useState(ALL);
  const [status, setStatus] = useState(ALL);

  const studies = useMemo(
    () =>
      [...new Map(slots.map((s) => [s.irbCode, s.title]))]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [slots],
  );

  const filtered = useMemo(
    () => slots.filter((s) => (study === ALL || s.irbCode === study) && (status === ALL || s.status === status)),
    [slots, study, status],
  );

  const columns: DataColumn<SlotRow>[] = [
    { id: "date", header: "Date", width: "120px", sortValue: (s) => s.start, cell: (s) => fmtDate(s.start) },
    {
      id: "time",
      header: "Time",
      width: "130px",
      sortValue: (s) => s.start,
      cell: (s) => <span className="tabular-nums">{fmtRange(s.start, s.end)}</span>,
    },
    { id: "study", header: "Study", sortValue: (s) => s.title, cell: (s) => s.title },
    { id: "room", header: "Room", width: "110px", hideBelow: "lg", sortValue: (s) => s.location, cell: (s) => s.location },
    {
      id: "occupancy",
      header: "Booked",
      width: "120px",
      numeric: true,
      sortValue: (s) => s.taken / Math.max(1, s.maxCapacity),
      cell: (s) => `${s.taken}/${s.maxCapacity}`,
    },
    {
      id: "status",
      header: "Status",
      width: "130px",
      sortValue: (s) => s.status,
      cell: (s) => (
        <Badge tone={STATUS[s.status].tone} size="sm">
          {STATUS[s.status].label}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Cancel",
      width: "110px",
      actions: true,
      cell: (s) =>
        // A session that has run, or is already cancelled, has nothing to release.
        s.status === "cancelled" || s.end <= now ? (
          <span className="text-fg-4">—</span>
        ) : (
          <Button variant="subtle" size="sm" onClick={() => setConfirming(s)}>
            Cancel
          </Button>
        ),
    },
  ];

  return (
    <>
      <AdminNotice notice={notice} onDismiss={dismiss} />

      <Dialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title="Cancel this session?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirming(null)} disabled={pending}>
              Keep it
            </Button>
            <Button
              variant="primary"
              loading={pending}
              onClick={() =>
                confirming &&
                run(
                  () => cancelSession(confirming.id),
                  () => setConfirming(null),
                )
              }
            >
              Cancel session
            </Button>
          </>
        }
      >
        {confirming
          ? `${confirming.taken} booking${confirming.taken === 1 ? "" : "s"} on this session will be cancelled and every place released. Participants keep the entry in their history with the reason.`
          : ""}
      </Dialog>

      <Card padding="none">
        <CardHeader title="Sessions" description="Cancelling releases every place on the session" className="px-4 pb-4 pt-5" />
        <DataTable
          label="Sessions"
          columns={columns}
          rows={filtered}
          rowId={(s) => s.id}
          searchText={(s) => `${s.title} ${s.irbCode} ${s.location}`}
          searchPlaceholder="Search by study or room"
          toolbar={
            <FilterBar
              onReset={() => {
                setStudy(ALL);
                setStatus(ALL);
              }}
              filters={[
                { id: "study", label: "Study", value: study, allValue: ALL, options: studies, onChange: setStudy },
                {
                  id: "status",
                  label: "Status",
                  value: status,
                  allValue: ALL,
                  options: Object.entries(STATUS).map(([value, meta]) => ({ value, label: meta.label })),
                  onChange: setStatus,
                },
              ]}
            />
          }
          summary={`${filtered.length} of ${slots.length}`}
          initialSort={{ id: "date", dir: "asc" }}
          rowClassName={(s) => (s.status === "cancelled" ? "[&>td]:text-fg-3" : "")}
          emptyTitle="No sessions yet"
          emptyHint="Create sessions above and they appear here."
        />
      </Card>
    </>
  );
}
