"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { cancelBooking } from "@/app/(portal)/actions";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  DataTable,
  Dialog,
  FilterBar,
  MessageBar,
  type BadgeTone,
  type DataColumn,
} from "@/components/fluent";
import { Calendar, CheckmarkCircle, Clock, PersonProhibited } from "@/components/icons";
import { StatRow, StatTile } from "@/components/ui/stat-tile";
import { dayLabel, fmtDate, fmtRange } from "@/lib/format";
import type { BookingStatus } from "@/lib/types";

const STATUS: Record<BookingStatus, { label: string; tone: BadgeTone }> = {
  booked: { label: "Booked", tone: "brand" },
  attended: { label: "Attended", tone: "success" },
  no_show: { label: "Missed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const ALL = "all";

const WHEN = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

const STATUS_OPTIONS = Object.entries(STATUS).map(([value, meta]) => ({ value, label: meta.label }));

/** A participant's own booking, as the API reports it back to them. */
export interface MyBookingRow {
  id: string;
  status: BookingStatus;
  start: string;
  end: string;
  location: string;
  /** The study, already written as "IRB code — title" by the API. */
  title: string;
  compensation: string;
  studyId: string;
  irbCode: string;
}

interface BookingListProps {
  rows: MyBookingRow[];
  now: string;
}

function isUpcoming(row: MyBookingRow, now: string) {
  return row.status === "booked" && row.end > now;
}

/** "Today" / "Tomorrow" when imminent, otherwise the short date. */
function sessionDay(row: MyBookingRow, now: string) {
  const label = dayLabel(row.start, now);
  return label === "Today" || label === "Tomorrow" ? label : fmtDate(row.start);
}

export function BookingList({ rows, now }: BookingListProps) {
  const [when, setWhen] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [confirming, setConfirming] = useState<MyBookingRow | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const upcoming = rows.filter((r) => isUpcoming(r, now));
  const attended = rows.filter((r) => r.status === "attended").length;
  const missed = rows.filter((r) => r.status === "no_show").length;
  const cancelledCount = rows.filter((r) => r.status === "cancelled").length;
  const next = [...upcoming].sort((a, b) => a.start.localeCompare(b.start))[0];

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (status !== ALL && r.status !== status) return false;
        if (when === "upcoming") return isUpcoming(r, now);
        if (when === "past") return !isUpcoming(r, now);
        return true;
      }),
    [rows, when, status, now],
  );

  const confirmCancel = () => {
    if (!confirming) return;
    const id = confirming.id;
    startTransition(async () => {
      const result = await cancelBooking(id);
      setNotice({ ok: result.ok, message: result.message });
      setConfirming(null);
    });
  };

  const columns: DataColumn<MyBookingRow>[] = [
    { id: "date", header: "Date", width: "120px", sortValue: (r) => r.start, cell: (r) => sessionDay(r, now) },
    {
      id: "time",
      header: "Time",
      width: "120px",
      sortValue: (r) => r.start,
      cell: (r) => <span className="tabular-nums">{fmtRange(r.start, r.end)}</span>,
    },
    {
      id: "study",
      header: "Study",
      sortValue: (r) => r.title,
      cell: (r) => (
        <Link href={`/studies/${r.studyId}`} title={r.title} className="rounded-xs hover:underline focus-ring">
          {r.title}
        </Link>
      ),
    },
    { id: "room", header: "Room", width: "110px", hideBelow: "md", sortValue: (r) => r.location, cell: (r) => r.location },
    {
      id: "compensation",
      header: "Compensation",
      width: "140px",
      hideBelow: "xl",
      sortValue: (r) => r.compensation,
      cell: (r) => r.compensation,
    },
    {
      id: "status",
      header: "Status",
      width: "120px",
      sortValue: (r) => STATUS[r.status].label,
      cell: (r) => (
        <Badge tone={STATUS[r.status].tone} size="sm">
          {STATUS[r.status].label}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      width: "180px",
      actions: true,
      cell: (r) =>
        isUpcoming(r, now) ? (
          <span className="flex items-center gap-1">
            {/* Moving happens on the study page, beside the times to move to. */}
            <ButtonLink href={`/studies/${r.studyId}#book`} variant="subtle" size="sm">
              Move
            </ButtonLink>
            <Button variant="secondary" size="sm" onClick={() => setConfirming(r)}>
              Cancel
            </Button>
          </span>
        ) : (
          <span className="text-fg-4">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <MessageBar intent={notice.ok ? "success" : "error"} live>
          {notice.message}
        </MessageBar>
      )}

      <StatRow>
        <StatTile icon={<Calendar />} label="Upcoming" value={String(upcoming.length)} detail="sessions still to come" />
        <StatTile icon={<CheckmarkCircle />} label="Attended" value={String(attended)} detail="sessions you took part in" />
        <StatTile icon={<PersonProhibited />} label="Missed" value={String(missed)} detail="booked but not attended" />
        <StatTile icon={<Clock />} label="Cancelled" value={String(cancelledCount)} detail="places you released" />
      </StatRow>

      <Card padding="none">
        <CardHeader
          title="Bookings"
          description={
            next
              ? `${upcoming.length} upcoming · next on ${fmtDate(next.start)} at ${fmtRange(next.start, next.end)}`
              : "Nothing upcoming"
          }
          action={
            upcoming.length === 0 ? (
              <ButtonLink href="/" variant="primary" size="sm">
                Browse studies
              </ButtonLink>
            ) : undefined
          }
          className="px-4 pb-3 pt-4"
        />
        <DataTable
          label="My bookings"
          columns={columns}
          rows={filtered}
          rowId={(r) => r.id}
          searchText={(r) => [r.title, r.irbCode, r.location, STATUS[r.status].label].join(" ")}
          searchPlaceholder="Search bookings"
          toolbar={
            <FilterBar
              onReset={() => {
                setWhen(ALL);
                setStatus(ALL);
              }}
              filters={[
                { id: "when", label: "When", value: when, allValue: ALL, options: WHEN, onChange: setWhen },
                { id: "status", label: "Status", value: status, allValue: ALL, options: STATUS_OPTIONS, onChange: setStatus },
              ]}
            />
          }
          summary={`${filtered.length} of ${rows.length}`}
          initialSort={{ id: "date", dir: "asc" }}
          rowClassName={(r) => (isUpcoming(r, now) ? "" : "[&>td]:text-fg-3")}
          emptyTitle="You have no bookings yet"
          emptyHint="Every study shows who it is for before you book."
        />
      </Card>

      <Dialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title="Cancel this booking?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirming(null)} disabled={pending}>
              Keep booking
            </Button>
            <Button variant="danger" onClick={confirmCancel} loading={pending}>
              Cancel booking
            </Button>
          </>
        }
      >
        {confirming && (
          <p>
            Your place on <span className="font-medium text-fg-1">{confirming.title}</span> on {fmtDate(confirming.start)} at{" "}
            {fmtRange(confirming.start, confirming.end)} will be released immediately so another participant can take it. You can
            book again later if a slot is free.
          </p>
        )}
      </Dialog>
    </div>
  );
}
