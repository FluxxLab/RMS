"use client";

import { useMemo, useState } from "react";
import { Badge, type BadgeTone, Breadcrumb, Card, CardHeader, type DataColumn, DataTable, FilterBar, Menu, PageHeader } from "@/components/fluent";
import { setBookingStatus } from "@/app/(admin)/admin/actions";
import { More } from "@/components/icons";
import { AdminNotice } from "@/components/admin/admin-notice";
import { useAdminAction } from "@/components/admin/use-admin-action";
import { Calendar, CheckmarkCircle, PersonProhibited, Shield } from "@/components/icons";
import { StatRow, StatTile } from "@/components/ui/stat-tile";
import { VaultNotice } from "@/components/ui/vault-notice";
import { fmtDate, fmtDateTime, fmtRange, isSameDay } from "@/lib/format";
import type { BookingStatus } from "@/lib/types";

const STATUS: Record<BookingStatus, { label: string; tone: BadgeTone }> = {
  booked: { label: "Booked", tone: "brand" },
  attended: { label: "Attended", tone: "success" },
  no_show: { label: "No-show", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const ALL = "all";

/* What a booking can be corrected to from where it is. Reinstating is offered
 * everywhere it makes sense; the engine still refuses it when the session is
 * full, so the menu is a shortcut, never the decision. */
const OVERRIDES: Record<BookingStatus, BookingStatus[]> = {
  booked: ["attended", "no_show", "cancelled"],
  attended: ["no_show", "booked"],
  no_show: ["attended", "booked"],
  cancelled: ["booked"],
};

const WHEN = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

/**
 * A reservation with its session joined in. The session fields are optional
 * because a booking can outlive the schedule it was made against; such a row
 * still belongs in the ledger, it simply cannot be placed on a date.
 */
export interface BookingLedgerRow {
  id: string;
  pid: string;
  status: BookingStatus;
  studyId: string;
  createdAt: string;
  irbCode?: string;
  title?: string;
  start?: string;
  end?: string;
  location?: string;
}

interface BookingsLedgerProps {
  rows: BookingLedgerRow[];
  now: string;
}

const NONE = "—";

/** Every reservation the engine has recorded, keyed by pseudonym (never a name). */
export function BookingsLedger({ rows, now }: BookingsLedgerProps) {
  const { notice, dismiss, run } = useAdminAction();
  const [when, setWhen] = useState(ALL);
  const [study, setStudy] = useState(ALL);
  const [status, setStatus] = useState(ALL);

  const studies = useMemo(() => {
    const byId = new Map(rows.flatMap((r) => (r.title ? [[r.studyId, r.title] as const] : [])));
    return [...byId].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (study !== ALL && r.studyId !== study) return false;
        if (status !== ALL && r.status !== status) return false;
        // A booking with no session cannot answer a question about dates.
        if (when !== ALL && !(r.start && r.end)) return false;
        if (when === "today") return isSameDay(r.start!, now);
        if (when === "upcoming") return r.start! > now;
        if (when === "past") return r.end! <= now;
        return true;
      }),
    [rows, when, study, status, now],
  );

  const reset = () => {
    setWhen(ALL);
    setStudy(ALL);
    setStatus(ALL);
  };

  const columns: DataColumn<BookingLedgerRow>[] = [
    {
      id: "date",
      header: "Date",
      width: "120px",
      sortValue: (r) => r.start ?? "",
      cell: (r) => (r.start ? fmtDate(r.start) : NONE),
    },
    {
      id: "time",
      header: "Time",
      width: "130px",
      sortValue: (r) => r.start ?? "",
      cell: (r) => (r.start && r.end ? <span className="tabular-nums">{fmtRange(r.start, r.end)}</span> : NONE),
    },
    { id: "study", header: "Study", sortValue: (r) => r.title ?? "", cell: (r) => r.title ?? NONE },
    { id: "irb", header: "IRB code", width: "130px", hideBelow: "2xl", sortValue: (r) => r.irbCode ?? "", cell: (r) => r.irbCode ?? NONE },
    {
      id: "pid",
      header: "Participant",
      width: "200px",
      sortValue: (r) => r.pid,
      cell: (r) => <span className="tabular-nums">{r.pid}</span>,
    },
    {
      id: "room",
      header: "Room",
      width: "110px",
      hideBelow: "lg",
      sortValue: (r) => r.location ?? "",
      cell: (r) => r.location ?? NONE,
    },
    {
      id: "bookedOn",
      header: "Booked on",
      width: "170px",
      hideBelow: "2xl",
      sortValue: (r) => r.createdAt,
      cell: (r) => fmtDateTime(r.createdAt),
    },
    {
      id: "status",
      header: "Status",
      width: "130px",
      sortValue: (r) => r.status,
      cell: (r) => (
        <Badge tone={STATUS[r.status].tone} size="sm">
          {STATUS[r.status].label}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Correct",
      width: "80px",
      actions: true,
      cell: (r) => (
        <Menu
          label={`Correct the booking for ${r.pid}`}
          triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-fg-2 hover:bg-bg-3 hover:text-fg-1 focus-ring [&>svg]:size-4"
          trigger={<More />}
          width={240}
          header={
            <span className="block text-[14px] leading-[17px] text-field-label">
              {r.pid} · {STATUS[r.status].label.toLowerCase()}
            </span>
          }
          items={OVERRIDES[r.status].map((next) => ({
            label: STATUS[next].label,
            onSelect: () => run(() => setBookingStatus(r.id, next)),
          }))}
        />
      ),
    },
  ];

  const upcoming = rows.filter((r) => r.status === "booked" && (r.start ?? "") > now).length;
  const attended = rows.filter((r) => r.status === "attended").length;
  const noShows = rows.filter((r) => r.status === "no_show").length;
  const cancelled = rows.filter((r) => r.status === "cancelled").length;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6 p-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/staff/dashboard" }, { label: "Bookings ledger" }]} />

      <PageHeader
        title="Bookings ledger"
        actions={<p className="text-[14px] leading-[17px] text-field-label">{rows.length} reservations</p>}
      />

      <VaultNotice />

      <StatRow>
        <StatTile icon={<Shield />} label="Reservations" value={String(rows.length)} detail="every state the engine has recorded" />
        <StatTile icon={<Calendar />} label="Upcoming" value={String(upcoming)} detail="booked and not yet started" />
        <StatTile icon={<CheckmarkCircle />} label="Attended" value={String(attended)} detail="checked in on the day" />
        <StatTile icon={<PersonProhibited />} label="No-shows" value={String(noShows)} detail={`${cancelled} cancelled as well`} />
      </StatRow>

      <AdminNotice notice={notice} onDismiss={dismiss} />

      <Card padding="none">
        <CardHeader
          title="Reservations"
          description={`${upcoming} upcoming · every state the engine has recorded`}
          className="px-4 pb-4 pt-5"
        />
        <DataTable
          label="Bookings ledger"
          columns={columns}
          rows={filtered}
          rowId={(r) => r.id}
          searchText={(r) => [r.pid, r.title, r.irbCode, r.location, STATUS[r.status].label].filter(Boolean).join(" ")}
          searchPlaceholder="Search by pseudonym or study"
          toolbar={
            <FilterBar
              onReset={reset}
              filters={[
                { id: "when", label: "Date", value: when, allValue: ALL, options: WHEN, onChange: setWhen },
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
          summary={`${filtered.length} of ${rows.length}`}
          rowClassName={(r) => (r.status === "cancelled" ? "[&>td]:text-fg-3" : "")}
          initialSort={{ id: "date", dir: "desc" }}
          emptyTitle="No bookings yet"
          emptyHint="Reservations appear here the moment a participant books a slot in the portal."
        />
      </Card>
    </section>
  );
}
