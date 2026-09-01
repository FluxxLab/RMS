import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Breadcrumb, Card, CardHeader, MessageBar, PageHeader, type BadgeTone } from "@/components/fluent";
import { Calendar, CheckmarkCircle, Clock, Money } from "@/components/icons";
import { StatRow, StatTile } from "@/components/ui/stat-tile";
import { DataError } from "@/components/ui/data-error";
import { getPipelineStudies, getSlots, getStudy, getStudyLog, pageData } from "@/lib/api";
import { fmtDate, fmtRange } from "@/lib/format";
import { serverNow } from "@/lib/now";
import { freePlaces, toSlotRow } from "@/lib/slots";
import type { ScheduleStatus, StudyStatus } from "@/lib/types";

const STUDY_STATUS: Record<StudyStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  ethics_review: { label: "Ethics review", tone: "warning" },
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "neutral" },
  completed: { label: "Completed", tone: "informative" },
};

const SESSION_STATUS: Record<ScheduleStatus, { label: string; tone: BadgeTone }> = {
  available: { label: "Available", tone: "success" },
  full: { label: "Full", tone: "brand" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const CRUMBS = [{ label: "Study log", href: "/staff/studies" }, { label: "Study" }];

export async function generateMetadata({ params }: PageProps<"/staff/studies/[studyId]">): Promise<Metadata> {
  const { studyId } = await params;
  const studies = await getPipelineStudies();
  const study = studies.ok ? studies.data.find((s) => s.id === studyId) : undefined;
  return { title: study ? `${study.title} · BIL RMS` : "Study · BIL RMS" };
}

/**
 * A study as the console reads it: its recruitment position and its sessions.
 * No participant is named — occupancy is a count, never a list.
 */
export default async function StaffStudyPage({ params }: PageProps<"/staff/studies/[studyId]">) {
  const { studyId } = await params;

  const [studiesResult, logResult, slotsResult, detailResult] = await Promise.all([
    getPipelineStudies(),
    getStudyLog(),
    getSlots(),
    // The full record is served for recruiting studies only, so a draft has
    // none — the page shows what the pipeline knows and says the rest is
    // written but not published yet.
    getStudy(studyId),
  ]);
  const studies = pageData(studiesResult);
  const log = pageData(logResult);
  const slots = pageData(slotsResult);

  if (!studies.ok) return <DataError breadcrumb={CRUMBS} title="Study" message={studies.message} />;
  if (!log.ok) return <DataError breadcrumb={CRUMBS} title="Study" message={log.message} />;
  if (!slots.ok) return <DataError breadcrumb={CRUMBS} title="Study" message={slots.message} />;

  const study = studies.data.find((s) => s.id === studyId);
  if (!study) notFound();

  const entry = log.data.find((e) => e.studyId === studyId);
  const detail = detailResult.ok ? detailResult.data : null;

  // The slot ledger identifies a session's study by IRB code, which is unique.
  const sessions = slots.data
    .map(toSlotRow)
    .filter((slot) => slot.irbCode === study.irbCode)
    .sort((a, b) => a.start.localeCompare(b.start));

  const now = serverNow();
  const live = sessions.filter((s) => s.status !== "cancelled");
  const openPlaces = sessions.reduce((sum, s) => sum + freePlaces(s), 0);
  const upcoming = live.filter((s) => s.start > now).length;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6 p-6">
      <Breadcrumb items={[{ label: "Study log", href: "/staff/studies" }, { label: study.title }]} />

      <PageHeader
        title={study.title}
        description={study.shortDescription}
        actions={
          <span className="flex items-center gap-3">
            <Badge tone={STUDY_STATUS[study.status].tone} size="sm">
              {STUDY_STATUS[study.status].label}
            </Badge>
            <span className="text-[14px] leading-[17px] text-field-label">{study.irbCode}</span>
          </span>
        }
      />

      <StatRow>
        <StatTile
          icon={<Calendar />}
          label="Sessions"
          value={String(live.length)}
          detail={`${upcoming} still to run · ${sessions.length - live.length} cancelled`}
        />
        <StatTile
          icon={<Clock />}
          label="Places booked"
          value={String(entry?.seatsBooked ?? 0)}
          detail={`of ${entry?.seatsTotal ?? 0} offered`}
        />
        <StatTile
          icon={<CheckmarkCircle />}
          label="Recruitment target"
          value={entry ? String(entry.maxCap) : "—"}
          detail={entry ? `${Math.max(0, entry.maxCap - entry.seatsBooked)} still to recruit` : "no sessions scheduled yet"}
        />
        <StatTile
          icon={<Money />}
          label="Free places"
          value={String(openPlaces)}
          detail={`${study.compensation} · ${study.durationMinutes} min`}
        />
      </StatRow>

      <Card padding="lg">
        <CardHeader size="panel" title="Study record" description="What the portal shows participants before they book" />
        <dl className="mt-5 grid gap-x-8 gap-y-5 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          <div>
            <dt className="text-[14px] leading-[17px] text-field-label">Room</dt>
            <dd className="mt-1 text-[16px] leading-[22px] text-fg-1">{study.location}</dd>
          </div>
          <div>
            <dt className="text-[14px] leading-[17px] text-field-label">Session length</dt>
            <dd className="mt-1 text-[16px] leading-[22px] text-fg-1">{study.durationMinutes} minutes</dd>
          </div>
          <div>
            <dt className="text-[14px] leading-[17px] text-field-label">Compensation</dt>
            <dd className="mt-1 text-[16px] leading-[22px] text-fg-1">{study.compensation}</dd>
          </div>
          <div>
            <dt className="text-[14px] leading-[17px] text-field-label">Topics</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {study.tags.length === 0 ? (
                <span className="text-[16px] leading-[22px] text-fg-3">None recorded</span>
              ) : (
                study.tags.map((tag) => (
                  <Badge key={tag} tone="brand" size="sm">
                    {tag}
                  </Badge>
                ))
              )}
            </dd>
          </div>
        </dl>
      </Card>

      {detail === null ? (
        <MessageBar intent="info" title="The protocol and inclusion statements are not published yet.">
          They are written and stored, but the study record is only served once a study is recruiting. Move it to active and
          they appear here as participants will read them.
        </MessageBar>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card padding="lg">
            <CardHeader size="panel" title="What the session involves" description="The protocol participants read before booking" />
            <div className="mt-5 flex flex-col gap-4 text-[16px] leading-[24px] text-fg-2">
              {detail.protocol.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader size="panel" title="Who this study is for" description="Written from the rules, so it is always current" />
            <ul className="mt-5 flex flex-col gap-2.5">
              {detail.whoThisIsFor.map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-[16px] leading-[22px] text-fg-1">
                  <CheckmarkCircle className="mt-0.5 size-4 shrink-0 text-brand" />
                  {line}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {detail !== null && detail.inclusionCriteria.length > 0 && (
        <Card padding="lg">
          <CardHeader size="panel" title="Inclusion statements" description="Each must be confirmed before the engine will take a booking" />
          <ol className="mt-5 flex flex-col gap-2.5">
            {detail.inclusionCriteria.map((line, i) => (
              <li key={line} className="flex items-start gap-3 text-[16px] leading-[22px] text-fg-1">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[12px] leading-none tabular-nums text-brand">
                  {i + 1}
                </span>
                {line}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card padding="none">
        <CardHeader title="Sessions" description="Occupancy against capacity" className="px-4 pb-4 pt-5" />
        {sessions.length === 0 ? (
          <p className="border-t border-stroke-2 px-4 py-8 text-[16px] leading-[22px] text-fg-2">
            No sessions scheduled. A superadmin creates them in Superadmin control.
          </p>
        ) : (
          <ul className="border-t border-stroke-2">
            {sessions.map((session) => (
              <li key={session.id} className="flex flex-wrap items-center gap-3 border-b border-stroke-3 px-4 py-3 last:border-b-0">
                <span className="w-28 shrink-0 text-[14px] leading-[20px] text-fg-1">{fmtDate(session.start)}</span>
                <span className="w-32 shrink-0 tabular-nums text-[14px] leading-[20px] text-fg-1">
                  {fmtRange(session.start, session.end)}
                </span>
                <span className="min-w-0 flex-1 text-[14px] leading-[20px] text-field-label">{session.location}</span>
                <span className="shrink-0 tabular-nums text-[14px] leading-[20px] text-field-label">
                  {session.taken}/{session.maxCapacity}
                </span>
                <Badge tone={SESSION_STATUS[session.status].tone} size="sm">
                  {SESSION_STATUS[session.status].label}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
