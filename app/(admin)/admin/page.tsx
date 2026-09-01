import type { Metadata } from "next";
import { OccupancyChart } from "@/components/dashboard/occupancy-chart";
import { ShareChart } from "@/components/dashboard/share-chart";
import { StackedBarChart } from "@/components/dashboard/stacked-bar-chart";
import { activeSeries } from "@/components/dashboard/actor-series";
import { Breadcrumb, PageHeader } from "@/components/fluent";
import { Book, Calendar, Shield, Tag } from "@/components/icons";
import { StatRow, StatTile } from "@/components/ui/stat-tile";
import { DataError } from "@/components/ui/data-error";
import { studiesByStatus } from "@/lib/audit";
import { getAdminOverview, getAudit, getPipelineStudies, getSlots, getTaxonomy, pageData } from "@/lib/api";
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
  const [overviewResult, studiesResult, slotsResult, taxonomyResult, auditResult] = await Promise.all([
    getAdminOverview(),
    getPipelineStudies(),
    getSlots(),
    getTaxonomy(),
    getAudit({ limit: 200 }),
  ]);

  const overview = pageData(overviewResult);
  const studies = pageData(studiesResult);
  const slots = pageData(slotsResult);
  const taxonomy = pageData(taxonomyResult);
  const audit = pageData(auditResult);

  if (!overview.ok) return <DataError breadcrumb={CRUMBS} title="System overview" message={overview.message} />;
  if (!studies.ok) return <DataError breadcrumb={CRUMBS} title="System overview" message={studies.message} />;
  if (!slots.ok) return <DataError breadcrumb={CRUMBS} title="System overview" message={slots.message} />;
  if (!taxonomy.ok) return <DataError breadcrumb={CRUMBS} title="System overview" message={taxonomy.message} />;
  if (!audit.ok) return <DataError breadcrumb={CRUMBS} title="System overview" message={audit.message} />;

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
          icon={<Tag />}
          label="Interest terms"
          value={String(taxonomy.data.length)}
          detail={`${overview.data.staffAccounts} staff ${overview.data.staffAccounts === 1 ? "account" : "accounts"} · ${overview.data.staffWithMfa} with MFA`}
        />
      </StatRow>

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
