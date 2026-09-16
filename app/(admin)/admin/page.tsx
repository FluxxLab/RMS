import type { Metadata } from "next";
import { OccupancyChart } from "@/components/dashboard/occupancy-chart";
import { ShareChart } from "@/components/dashboard/share-chart";
import { StackedBarChart } from "@/components/dashboard/stacked-bar-chart";
import { activeSeries } from "@/components/dashboard/actor-series";
import { Breadcrumb, PageHeader } from "@/components/fluent";
import { Book, Calendar, People, Shield } from "@/components/icons";
import { StatRow, StatTile } from "@/components/ui/stat-tile";
import { DataError } from "@/components/ui/data-error";
import { StudyTable } from "@/components/admin/study-table";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { studiesByStatus } from "@/lib/audit";
import { getAdminOverview, getAudit, getBookings, getPipelineStudies, getSlots, getStudyLog, pageData } from "@/lib/api";
import { auditByDay, utilisationSeries } from "@/lib/dashboard";
import { fmtDate } from "@/lib/format";
import { freePlaces, toSlotRow } from "@/lib/slots";
import type { StudyStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Overview · BIL Superadmin" };

const CRUMBS = [{ label: "Overview" }];

const STUDY_LABEL: Record<StudyStatus, string> = {
  draft: "Draft",
  ethics_review: "Ethics review",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

/** System-wide overview, read entirely as charts. */
export default async function AdminOverviewPage() {
  const [overviewResult, studiesResult, slotsResult, auditResult, logResult, bookingsResult] = await Promise.all([
    getAdminOverview(),
    getPipelineStudies(),
    getSlots(),
    getAudit({ limit: 200 }),
    // Per-study counts: the charts say how the lab is doing overall, this says
    // which study is doing it.
    getStudyLog(),
    // Outcomes per study, for how each one is actually performing.
    getBookings(),
  ]);

  const overview = pageData(overviewResult);
  const studies = pageData(studiesResult);
  const slots = pageData(slotsResult);
  const audit = pageData(auditResult);
  const log = logResult.ok ? logResult.data : [];


  if (!overview.ok) return <DataError breadcrumb={CRUMBS} title="System overview" message={overview.message} />;
  if (!studies.ok) return <DataError breadcrumb={CRUMBS} title="System overview" message={studies.message} />;
  if (!slots.ok) return <DataError breadcrumb={CRUMBS} title="System overview" message={slots.message} />;
  if (!audit.ok) return <DataError breadcrumb={CRUMBS} title="System overview" message={audit.message} />;

  /*
   * Attendance is counted from the bookings themselves rather than the study
   * log, because the log counts seats, and a seat says nothing about whether
   * the person in it turned up.
   */
  const bookings = bookingsResult.ok ? bookingsResult.data : [];
  const performance = studies.data.map((study) => {
    const mine = bookings.filter((b) => b.studyId === study.id);
    return {
      studyId: study.id,
      title: study.title,
      irbCode: study.irbCode,
      attended: mine.filter((b) => b.status === "attended").length,
      noShows: mine.filter((b) => b.status === "no_show").length,
    };
  });

  const counts = studiesByStatus(studies.data.map((s) => s.status));
  const sessions = slots.data.map(toSlotRow);
  const utilisation = utilisationSeries(sessions);
  const days = auditByDay(audit.data.entries);
  const series = activeSeries(days);

  const studiesByLifecycle = (Object.keys(STUDY_LABEL) as StudyStatus[]).map((status) => ({
    label: STUDY_LABEL[status],
    value: counts[status],
  }));

  // Sessions carry their own occupancy, so the split is places taken against places left.
  const placesTaken = sessions.reduce((sum, s) => (s.status === "cancelled" ? sum : sum + s.taken), 0);
  const placesFree = sessions.reduce((sum, s) => sum + freePlaces(s), 0);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6 p-6">
      <Breadcrumb items={CRUMBS} />

      <PageHeader title="System overview" actions={<p className="text-[14px] leading-[17px] text-field-label">Superadmin</p>} />

      <StatRow>
        <StatTile
          icon={<Book />}
          label="Studies"
          value={String(overview.data.totalStudies)}
          detail={`${counts.active} active · ${counts.paused} paused · ${counts.ethics_review} in ethics review`}
        />
        <StatTile icon={<Calendar />} label="Sessions" value={String(sessions.length)} detail="across every study" />
        <StatTile icon={<Shield />} label="Bookings" value={String(overview.data.bookingsRecorded)} detail="reservations in every state" />
        <StatTile
          icon={<People />}
          label="Staff accounts"
          value={String(overview.data.staffAccounts)}
          detail={`${overview.data.staffWithMfa} with MFA`}
        />
      </StatRow>

      <StudyTable studies={studies.data} log={log} />

      <PerformanceChart studies={performance} />

      <OccupancyChart
        title="Capacity utilisation"
        period={
          utilisation.length
            ? `${fmtDate(utilisation[0].date)} – ${fmtDate(utilisation[utilisation.length - 1].date)}`
            : "No sessions"
        }
        emptyHint="No sessions scheduled yet. Create sessions and the line fills in."
        points={utilisation.map((p) => ({
          label: fmtDate(p.date),
          pct: p.pct,
          caption: `${p.taken} of ${p.capacity} places`,
        }))}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ShareChart
          title="Places across live sessions"
          period={`${placesTaken + placesFree} in total`}
          unit="places"
          emptyHint="No sessions yet. Places appear here once a schedule exists."
          slices={[
            { label: "Taken", value: placesTaken },
            { label: "Free", value: placesFree },
          ]}
        />
        <ShareChart
          title="Studies by lifecycle"
          period={`${studies.data.length} ${studies.data.length === 1 ? "study" : "studies"}`}
          unit="studies"
          emptyHint="No studies yet. They appear here once authored."
          slices={studiesByLifecycle}
        />
      </div>

      <StackedBarChart
        eyebrow="Recorded actions"
        title="Audit activity"
        control={`${audit.data.total} entries`}
        series={series}
        bars={days.map((d) => ({ label: fmtDate(d.date), values: d.counts }))}
        emptyHint="Nothing audited yet. Every reservation and check-in adds a bar here."
      />
    </section>
  );
}
