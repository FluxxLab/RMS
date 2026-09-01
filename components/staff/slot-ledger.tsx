"use client";

import { useMemo, useState, useTransition } from "react";
import { stressTestSlot, type StressTestOutcome } from "@/app/(staff)/staff/actions";
import {
  Badge,
  type BadgeTone,
  Breadcrumb,
  Button,
  Card,
  CardHeader,
  type DataColumn,
  DataTable,
  Dialog,
  FilterBar,
  MessageBar,
  PageHeader,
} from "@/components/fluent";
import { Calendar, CheckmarkCircle, Clock, Timer } from "@/components/icons";
import { StatRow, StatTile } from "@/components/ui/stat-tile";
import { fmtDate, fmtRange, isSameDay } from "@/lib/format";
import { freePlaces, type SlotRow } from "@/lib/slots";
import type { ScheduleStatus } from "@/lib/types";

const STATUS: Record<ScheduleStatus, { label: string; tone: BadgeTone }> = {
  available: { label: "Available", tone: "success" },
  full: { label: "Full", tone: "brand" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const ALL = "all";

const WHEN = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

const PLACES = [
  { value: "free", label: "With free places" },
  { value: "none", label: "Nothing left" },
];

interface SlotLedgerProps {
  slots: SlotRow[];
  now: string;
}

export function SlotLedger({ slots, now }: SlotLedgerProps) {
  const [testing, setTesting] = useState<SlotRow | null>(null);
  const [outcome, setOutcome] = useState<StressTestOutcome | null>(null);
  const [pending, startTransition] = useTransition();
  const [when, setWhen] = useState(ALL);
  const [study, setStudy] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [places, setPlaces] = useState(ALL);

  const studyOptions = useMemo(
    () =>
      [...new Map(slots.map((s) => [s.irbCode, s.title]))]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [slots],
  );

  const filtered = useMemo(
    () =>
      slots.filter((s) => {
        if (study !== ALL && s.irbCode !== study) return false;
        if (status !== ALL && s.status !== status) return false;
        if (places === "free" && s.taken >= s.maxCapacity) return false;
        if (places === "none" && s.taken < s.maxCapacity) return false;
        if (when === "today") return isSameDay(s.start, now);
        if (when === "upcoming") return s.start > now;
        if (when === "past") return s.end <= now;
        return true;
      }),
    [slots, when, study, status, places, now],
  );

  const reset = () => {
    setWhen(ALL);
    setStudy(ALL);
    setStatus(ALL);
    setPlaces(ALL);
  };

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
    { id: "irb", header: "IRB code", width: "130px", hideBelow: "2xl", sortValue: (s) => s.irbCode, cell: (s) => s.irbCode },
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
      id: "free",
      header: "Free",
      width: "90px",
      numeric: true,
      hideBelow: "xl",
      sortValue: (s) => s.maxCapacity - s.taken,
      cell: (s) => String(Math.max(0, s.maxCapacity - s.taken)),
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
      header: "Capacity",
      width: "130px",
      actions: true,
      cell: (s) =>
        // A cancelled or elapsed session has no capacity left to prove anything about.
        s.status === "cancelled" || s.end <= now ? (
          <span className="text-fg-4">—</span>
        ) : (
          <Button variant="subtle" size="sm" onClick={() => setTesting(s)}>
            Stress test
          </Button>
        ),
    },
  ];

  const upcoming = slots.filter((s) => s.start > now && s.status !== "cancelled").length;
  const free = slots.reduce((sum, s) => sum + freePlaces(s), 0);
  const cancelledCount = slots.filter((s) => s.status === "cancelled").length;

  const runTest = () => {
    if (!testing) return;
    const scheduleId = testing.id;
    startTransition(async () => {
      setOutcome(await stressTestSlot(scheduleId));
    });
  };

  const report = outcome?.ok === true ? outcome.result : null;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6 p-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/staff/dashboard" }, { label: "Slot ledger" }]} />

      {outcome !== null && !outcome.ok && (
        <MessageBar intent="error" title="The stress test could not run" live>
          {outcome.message}
        </MessageBar>
      )}

      {report !== null && (
        <MessageBar
          intent={report.overbooked ? "error" : "success"}
          title={report.overbooked ? "Overbooking detected" : "Capacity held"}
          live
          actions={
            <Button variant="secondary" size="sm" onClick={() => setOutcome(null)}>
              Dismiss
            </Button>
          }
        >
          <p>{report.summary}</p>
          {Object.keys(report.rejectionsByReason).length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {Object.entries(report.rejectionsByReason).map(([code, count]) => (
                <li key={code}>
                  {count} refused as <span className="font-mono text-[13px]">{code}</span>
                </li>
              ))}
            </ul>
          )}
        </MessageBar>
      )}

      <Dialog
        open={testing !== null}
        onClose={() => setTesting(null)}
        title="Run a stress test on this session?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setTesting(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={pending}
              onClick={() => {
                runTest();
                setTesting(null);
              }}
            >
              Run test
            </Button>
          </>
        }
      >
        {testing && (
          <p>
            Six reservations will be fired at{" "}
            <span className="font-medium text-fg-1">
              {fmtDate(testing.start)}, {fmtRange(testing.start, testing.end)}
            </span>{" "}
            at once, to prove the engine cannot overbook it. Anything booked is released again, so the session is left as it
            is — but every attempt is written to the audit log.
          </p>
        )}
      </Dialog>

      <PageHeader
        title="Slot ledger"
        actions={<p className="text-[14px] leading-[17px] text-field-label">{slots.length} schedules</p>}
      />

      <StatRow>
        <StatTile icon={<Timer />} label="Sessions" value={String(slots.length)} detail="across every study" />
        <StatTile icon={<Calendar />} label="Upcoming" value={String(upcoming)} detail="still to run" />
        <StatTile icon={<CheckmarkCircle />} label="Free places" value={String(free)} detail="unfilled across live sessions" />
        <StatTile icon={<Clock />} label="Cancelled" value={String(cancelledCount)} detail="sessions no longer running" />
      </StatRow>

      <Card padding="none">
        <CardHeader
          title="Schedules"
          description={`${upcoming} upcoming · occupancy against capacity`}
          className="px-4 pb-4 pt-5"
        />
        <DataTable
          label="Slot ledger"
          columns={columns}
          rows={filtered}
          rowId={(s) => s.id}
          searchText={(s) => [s.title, s.irbCode, s.location, STATUS[s.status].label].join(" ")}
          searchPlaceholder="Search by study or room"
          toolbar={
            <FilterBar
              onReset={reset}
              filters={[
                { id: "when", label: "Date", value: when, allValue: ALL, options: WHEN, onChange: setWhen },
                { id: "study", label: "Study", value: study, allValue: ALL, options: studyOptions, onChange: setStudy },
                {
                  id: "status",
                  label: "Status",
                  value: status,
                  allValue: ALL,
                  options: Object.entries(STATUS).map(([value, meta]) => ({ value, label: meta.label })),
                  onChange: setStatus,
                },
                { id: "places", label: "Places", value: places, allValue: ALL, options: PLACES, onChange: setPlaces },
              ]}
            />
          }
          summary={`${filtered.length} of ${slots.length}`}
          rowClassName={(s) => (s.status === "cancelled" ? "[&>td]:text-fg-3" : "")}
          initialSort={{ id: "date", dir: "asc" }}
          emptyTitle="No schedules yet"
          emptyHint="Generate a schedule in Superadmin control and its slots appear here."
        />
      </Card>
    </section>
  );
}
