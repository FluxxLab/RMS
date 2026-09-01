"use client";

import { useMemo, useState } from "react";
import { Badge, Breadcrumb, Card, CardHeader, type DataColumn, DataTable, FilterBar, PageHeader } from "@/components/fluent";
import { Clock, People, Sparkle, Tag } from "@/components/icons";
import { StatRow, StatTile } from "@/components/ui/stat-tile";
import { VaultNotice } from "@/components/ui/vault-notice";
import { fmtDateTime, isSameDay } from "@/lib/format";

const ALL = "all";

const WHEN = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
];

/**
 * A recruitment lead. It is a living record — a participant can change the
 * topics they registered — so the timestamp is when it last changed.
 */
export interface InterestLeadRow {
  pid: string;
  tags: string[];
  updatedAt: string;
}

interface InterestLeadsProps {
  interests: InterestLeadRow[];
  now: string;
}

/** Seven days back from the reference time, as a comparable ISO timestamp. */
function weekAgo(now: string): string {
  const [date, time = "00:00:00"] = now.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d - 7));
  return `${shifted.toISOString().slice(0, 10)}T${time}`;
}

/** Research interests registered in the portal, for targeted recruitment. */
export function InterestLeads({ interests, now }: InterestLeadsProps) {
  const [tag, setTag] = useState(ALL);
  const [when, setWhen] = useState(ALL);

  const tagOptions = useMemo(
    () => [...new Set(interests.flatMap((i) => i.tags))].sort().map((t) => ({ value: t, label: t })),
    [interests],
  );

  const filtered = useMemo(
    () =>
      interests.filter((i) => {
        if (tag !== ALL && !i.tags.includes(tag)) return false;
        if (when === "today") return isSameDay(i.updatedAt, now);
        if (when === "week") return i.updatedAt >= weekAgo(now);
        return true;
      }),
    [interests, tag, when, now],
  );

  const columns: DataColumn<InterestLeadRow>[] = [
    {
      id: "pid",
      header: "Participant",
      width: "200px",
      sortValue: (i) => i.pid,
      cell: (i) => <span className="tabular-nums">{i.pid}</span>,
    },
    {
      id: "tags",
      header: "Interests",
      wrap: true,
      sortValue: (i) => i.tags.join(", "),
      cell: (i) => (
        <span className="flex flex-wrap gap-1.5 py-1">
          {i.tags.map((tag) => (
            <Badge key={tag} tone="brand" size="sm">
              {tag}
            </Badge>
          ))}
        </span>
      ),
    },
    {
      id: "submitted",
      header: "Last updated",
      width: "170px",
      sortValue: (i) => i.updatedAt,
      cell: (i) => fmtDateTime(i.updatedAt),
    },
  ];

  const today = interests.filter((i) => isSameDay(i.updatedAt, now)).length;
  const people = new Set(interests.map((i) => i.pid)).size;
  const terms = new Set(interests.flatMap((i) => i.tags)).size;
  const perPerson = people === 0 ? 0 : Math.round((interests.reduce((n, i) => n + i.tags.length, 0) / people) * 10) / 10;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6 p-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/staff/dashboard" }, { label: "Interest leads" }]} />

      <PageHeader
        title="Interest leads"
        actions={<p className="text-[14px] leading-[17px] text-field-label">{interests.length} leads</p>}
      />

      <VaultNotice />

      <StatRow>
        <StatTile icon={<Tag />} label="Leads" value={String(interests.length)} detail="submissions in total" />
        <StatTile icon={<Clock />} label="Updated today" value={String(today)} detail="changed since midnight" />
        <StatTile icon={<People />} label="Participants" value={String(people)} detail="distinct pseudonyms" />
        <StatTile icon={<Sparkle />} label="Terms chosen" value={String(terms)} detail={`${perPerson} per participant on average`} />
      </StatRow>

      <Card padding="none">
        <CardHeader title="Leads" description={`${today} updated today · available for targeted recruitment`} className="px-4 pb-4 pt-5" />
        <DataTable
          label="Interest leads"
          columns={columns}
          rows={filtered}
          rowId={(i) => `${i.pid}-${i.updatedAt}`}
          searchText={(i) => `${i.pid} ${i.tags.join(" ")}`}
          searchPlaceholder="Search by pseudonym or interest"
          toolbar={
            <FilterBar
              onReset={() => {
                setTag(ALL);
                setWhen(ALL);
              }}
              filters={[
                { id: "tag", label: "Interest", value: tag, allValue: ALL, options: tagOptions, onChange: setTag },
                { id: "when", label: "Date", value: when, allValue: ALL, options: WHEN, onChange: setWhen },
              ]}
            />
          }
          summary={`${filtered.length} of ${interests.length}`}
          initialSort={{ id: "submitted", dir: "desc" }}
          emptyTitle="No interest leads yet"
          emptyHint="Leads appear as participants register research interests in the portal."
        />
      </Card>
    </section>
  );
}
