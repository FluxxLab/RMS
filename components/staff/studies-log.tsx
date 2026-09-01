"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, type BadgeTone, Breadcrumb, Card, CardHeader, type DataColumn, DataTable, FilterBar, PageHeader } from "@/components/fluent";
import { Book, Calendar, CheckmarkCircle, Clock } from "@/components/icons";
import { StatRow, StatTile } from "@/components/ui/stat-tile";
import type { StudyStatus } from "@/lib/types";

const STATUS: Record<StudyStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  ethics_review: { label: "Ethics review", tone: "warning" },
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "neutral" },
  completed: { label: "Completed", tone: "informative" },
};

const ALL = "all";

export interface StudyLogRow {
  id: string;
  irbCode: string;
  title: string;
  location: string;
  durationMinutes: number;
  status: StudyStatus;
  sessions: number;
  booked: number;
  openPlaces: number;
}

interface StudiesLogProps {
  rows: StudyLogRow[];
}

/** The console's read-only view of the study portfolio. Lifecycle is superadmin's. */
export function StudiesLog({ rows }: StudiesLogProps) {
  const [status, setStatus] = useState(ALL);
  const [room, setRoom] = useState(ALL);

  const rooms = useMemo(
    () => [...new Set(rows.map((r) => r.location))].sort().map((value) => ({ value, label: value })),
    [rows],
  );

  const filtered = useMemo(
    () => rows.filter((r) => (status === ALL || r.status === status) && (room === ALL || r.location === room)),
    [rows, status, room],
  );

  const active = rows.filter((r) => r.status === "active").length;
  const recruiting = rows.filter((r) => r.status === "active" && r.openPlaces > 0).length;
  const openPlaces = rows.reduce((sum, r) => sum + r.openPlaces, 0);

  const columns: DataColumn<StudyLogRow>[] = [
    { id: "irb", header: "IRB code", width: "140px", sortValue: (r) => r.irbCode, cell: (r) => r.irbCode },
    {
      id: "title",
      header: "Study",
      sortValue: (r) => r.title,
      cell: (r) => (
        <Link href={`/staff/studies/${r.id}`} title={r.title} className="rounded-xs hover:underline focus-ring">
          {r.title}
        </Link>
      ),
    },
    { id: "room", header: "Room", width: "110px", hideBelow: "lg", sortValue: (r) => r.location, cell: (r) => r.location },
    {
      id: "duration",
      header: "Duration",
      width: "110px",
      numeric: true,
      hideBelow: "xl",
      sortValue: (r) => r.durationMinutes,
      cell: (r) => `${r.durationMinutes} min`,
    },
    { id: "sessions", header: "Sessions", width: "110px", numeric: true, sortValue: (r) => r.sessions, cell: (r) => String(r.sessions) },
    { id: "booked", header: "Booked", width: "100px", numeric: true, sortValue: (r) => r.booked, cell: (r) => String(r.booked) },
    {
      id: "open",
      header: "Free places",
      width: "130px",
      numeric: true,
      sortValue: (r) => r.openPlaces,
      cell: (r) => String(r.openPlaces),
    },
    {
      id: "status",
      header: "Status",
      width: "150px",
      sortValue: (r) => r.status,
      cell: (r) => (
        <Badge tone={STATUS[r.status].tone} size="sm">
          {STATUS[r.status].label}
        </Badge>
      ),
    },
  ];

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6 p-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/staff/dashboard" }, { label: "Study log" }]} />

      <PageHeader
        title="Study log"
        actions={<p className="text-[14px] leading-[17px] text-field-label">{rows.length} {rows.length === 1 ? "study" : "studies"}</p>}
      />

      <StatRow>
        <StatTile icon={<Book />} label="Studies" value={String(rows.length)} detail="in the portfolio" />
        <StatTile icon={<CheckmarkCircle />} label="Active" value={String(active)} detail="open to participants" />
        <StatTile icon={<Calendar />} label="Recruiting" value={String(recruiting)} detail="active with a free place" />
        <StatTile icon={<Clock />} label="Free places" value={String(openPlaces)} detail="unfilled places across all sessions" />
      </StatRow>

      <Card padding="none">
        <CardHeader
          title="Studies"
          description="Read-only — lifecycle changes are made in Superadmin control"
          className="px-4 pb-4 pt-5"
        />
        <DataTable
          label="Study log"
          columns={columns}
          rows={filtered}
          rowId={(r) => r.id}
          searchText={(r) => `${r.irbCode} ${r.title} ${r.location}`}
          searchPlaceholder="Search by IRB code or title"
          toolbar={
            <FilterBar
              onReset={() => {
                setStatus(ALL);
                setRoom(ALL);
              }}
              filters={[
                {
                  id: "status",
                  label: "Status",
                  value: status,
                  allValue: ALL,
                  options: Object.entries(STATUS).map(([value, meta]) => ({ value, label: meta.label })),
                  onChange: setStatus,
                },
                { id: "room", label: "Room", value: room, allValue: ALL, options: rooms, onChange: setRoom },
              ]}
            />
          }
          summary={`${filtered.length} of ${rows.length}`}
          initialSort={{ id: "irb", dir: "asc" }}
          emptyTitle="No studies yet"
          emptyHint="Studies appear here once a superadmin has authored them."
        />
      </Card>
    </section>
  );
}
