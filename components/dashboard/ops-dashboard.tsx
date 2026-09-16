import { Breadcrumb, Meter, PageHeader } from "@/components/fluent";
import { Calendar, CheckmarkCircle, Clock, Timer } from "@/components/icons";
import { OccupancyChart } from "@/components/dashboard/occupancy-chart";
import { StackedBarChart } from "@/components/dashboard/stacked-bar-chart";
import { TxLogPanel } from "@/components/dashboard/tx-log-panel";
import type { TxLogEntry } from "@/components/dashboard/use-tx-log-stream";
import { activeSeries } from "@/components/dashboard/actor-series";
import { StatRow, StatTile } from "@/components/ui/stat-tile";
import { StudyProgress, type StudyProgressRow } from "@/components/dashboard/study-progress";
import { auditByDay, dashboardKpis, todaySessions, type ReportedKpis } from "@/lib/dashboard";
import type { SlotRow } from "@/lib/slots";
import { fmtDate, fmtDateTime, fmtTime } from "@/lib/format";

/** One study's recruitment position, as the study log reports it. */
export interface StudyShare {
  title: string;
  seatsBooked: number;
}

interface OpsDashboardProps {
  /** The engine's own headline counts. */
  reported: ReportedKpis;
  slots: SlotRow[];
  /*
   * The full per-study row, not just a title and a count: the panel shows
   * recruitment against capacity, which needs the capacity.
   */
  studies: StudyProgressRow[];
  /** Audit entries, newest first. */
  audit: { at: string; actorRole: string }[];
  /** The engine log as the server read it; the panel keeps it current itself. */
  txLog: TxLogEntry[];
  now: string;
  /*
   * Whether the viewer oversees the whole lab.
   *
   * The interest feed, the engine log and the audit trail are the three things
   * here that cannot be narrowed to a study: interests name no study, and
   * neither audit entries nor engine calls carry one. Shown to someone who is
   * scoped they would report on colleagues' work, so they belong to the
   * superadmin — who is not scoped and is the one doing the overseeing.
   */
  oversight: boolean;
}

/** The researcher console's operations dashboard — server-rendered from API data. */
export function OpsDashboard({ reported, slots, studies, audit, txLog, now, oversight }: OpsDashboardProps) {
  const kpis = dashboardKpis(reported, slots, now);
  const sessions = todaySessions(slots, now);
  const days = auditByDay(audit);
  const series = activeSeries(days);
  const ratePct = kpis.attendanceRate === null ? null : Math.round(kpis.attendanceRate * 100);

  return (
    <section aria-label="Operations dashboard" className="flex min-w-0 flex-1 flex-col gap-6 p-6">
      <Breadcrumb items={[{ label: "Dashboard" }]} />

      <PageHeader
        title="Operations dashboard"
        actions={
          <p className="flex items-center gap-2 text-[14px] leading-[17px] text-field-label">
            <span className="inline-block size-2 rounded-full bg-success-fg" aria-hidden="true" />
            Live · {fmtDateTime(now)}
          </p>
        }
      />

      <StatRow>
        <StatTile
          icon={<Clock />}
          label="Awaiting check-in"
          value={String(kpis.pendingCheckIns)}
          detail={`${kpis.sessionsToday} ${kpis.sessionsToday === 1 ? "session" : "sessions"} scheduled today`}
        />
        <StatTile
          icon={<Calendar />}
          label="Open slots"
          value={String(kpis.openSlots)}
          detail={`${kpis.openPlaces} ${kpis.openPlaces === 1 ? "place" : "places"} free to book`}
        />
        <StatTile icon={<Timer />} label="Schedules" value={String(kpis.totalSchedules)} detail={`${kpis.upcomingSchedules} upcoming`} />
        <StatTile
          icon={<CheckmarkCircle />}
          label="Attendance rate"
          value={ratePct === null ? "—" : `${ratePct}%`}
          detail={
            ratePct === null
              ? "no session has ended yet"
              : `${kpis.attendedCount} attended across elapsed sessions`
          }
        >
          <Meter value={ratePct ?? 0} label="Attendance rate" className="mt-4" />
        </StatTile>
      </StatRow>

      {/* Today's sessions — occupancy across the day */}
      <OccupancyChart
        title="Today's sessions"
        period={fmtDate(now)}
        emptyHint="No sessions today. Generate a schedule in Superadmin control to populate this view."
        points={sessions.map((s) => ({
          label: fmtTime(s.start),
          pct: (s.taken / Math.max(1, s.maxCapacity)) * 100,
          caption: `${s.taken} of ${s.maxCapacity} places`,
        }))}
      />

      {/* Recruitment against capacity, per study the viewer is on */}
      <StudyProgress
        studies={studies}
        emptyHint="No studies are assigned to you yet. Ask a lab administrator to add you to one."
      />

      {oversight && (
        <>
          {/* The engine log, streaming — the one view that must not lag reality */}
          <TxLogPanel initial={txLog} />

          {/* Audit log — recorded actions per day, by the role that acted */}
          <StackedBarChart
            eyebrow="Recorded actions"
            title="Audit activity"
            control={`${audit.length} entries`}
            series={series}
            bars={days.map((d) => ({ label: fmtDate(d.date), values: d.counts }))}
            emptyHint="Nothing audited yet. Every reservation and check-in adds a bar here."
          />
        </>
      )}
    </section>
  );
}
