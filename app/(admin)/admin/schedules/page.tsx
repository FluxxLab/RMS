import type { Metadata } from "next";
import { SchedulesPanel } from "@/components/admin/schedules-panel";
import { Breadcrumb, PageHeader } from "@/components/fluent";
import { Calendar, CheckmarkCircle, Clock, Timer } from "@/components/icons";
import { StatRow, StatTile } from "@/components/ui/stat-tile";
import { DataError } from "@/components/ui/data-error";
import { getPipelineStudies, getSlots, pageData } from "@/lib/api";
import { serverNow } from "@/lib/now";
import { freePlaces, toSlotRow } from "@/lib/slots";

export const metadata: Metadata = { title: "Schedules · BIL Superadmin" };

const CRUMBS = [{ label: "Overview", href: "/admin" }, { label: "Schedules" }];

export default async function AdminSchedulesPage() {
  const [slotsResult, studiesResult] = await Promise.all([getSlots(), getPipelineStudies()]);
  const slots = pageData(slotsResult);
  const studies = pageData(studiesResult);

  if (!slots.ok) return <DataError breadcrumb={CRUMBS} title="Schedules" message={slots.message} />;
  if (!studies.ok) return <DataError breadcrumb={CRUMBS} title="Schedules" message={studies.message} />;

  const now = serverNow();
  const sessions = slots.data.map(toSlotRow);

  const live = sessions.filter((s) => s.status !== "cancelled");
  const upcoming = live.filter((s) => s.start > now).length;
  const free = sessions.reduce((sum, s) => sum + freePlaces(s), 0);
  const cancelled = sessions.length - live.length;

  // Only a study that is taking part can be scheduled against.
  const schedulable = studies.data.filter((s) => s.status === "active" || s.status === "paused");

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6 p-6">
      <Breadcrumb items={CRUMBS} />

      <PageHeader
        title="Schedules"
        actions={
          <p className="text-[14px] leading-[17px] text-field-label">
            {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
          </p>
        }
      />
      <StatRow>
        <StatTile icon={<Timer />} label="Sessions" value={String(sessions.length)} detail="across every study" />
        <StatTile icon={<Calendar />} label="Upcoming" value={String(upcoming)} detail="still to run" />
        <StatTile icon={<CheckmarkCircle />} label="Free places" value={String(free)} detail="unfilled across live sessions" />
        <StatTile icon={<Clock />} label="Cancelled" value={String(cancelled)} detail="sessions no longer running" />
      </StatRow>

      <SchedulesPanel slots={sessions} studies={schedulable} now={now} />
    </section>
  );
}
