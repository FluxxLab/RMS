import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Breadcrumb, Card, CardHeader, MessageBar } from "@/components/fluent";
import { Checkmark, Location, Money, Timer } from "@/components/icons";
import { ScorecardCard } from "@/components/portal/scorecard";
import { StudyBooking } from "@/components/portal/study-booking";
import { DataError } from "@/components/ui/data-error";
import { getBookableSessions, getMyBookings, getScorecard, getStudy, isParticipant, pageData, readSession } from "@/lib/api";
import type { Scorecard } from "@/lib/api/schemas";
import { serverNow } from "@/lib/now";
import { freePlaces, toSessionRow, type SessionRow } from "@/lib/slots";

const CRUMBS = [{ label: "Studies", href: "/" }, { label: "Study" }];

/** What a guest sees: nothing has been checked, because nobody is signed in. */
const NOT_SIGNED_IN: Scorecard = {
  ok: false,
  profileComplete: false,
  missingProfileFields: [],
  results: [],
  failures: [],
  passCount: 0,
};

export async function generateMetadata({ params }: PageProps<"/studies/[studyId]">): Promise<Metadata> {
  const { studyId } = await params;
  const study = await getStudy(studyId);
  return { title: study.ok ? `${study.data.title} · BIL Research` : "Study · BIL Research" };
}

/**
 * Study detail: what the study offers, the per-rule scorecard and booking.
 *
 * The scorecard is the engine's, fetched whole. No rule is evaluated here — the
 * page shows the verdict and disables what the engine would refuse anyway.
 */
export default async function StudyPage({ params }: PageProps<"/studies/[studyId]">) {
  const { studyId } = await params;

  // The endpoint serves recruiting studies only, so a draft or a completed
  // one is simply not here — which is the right answer for a participant.
  const result = await getStudy(studyId);
  if (!result.ok && result.error.kind === "not_found") notFound();

  const detail = pageData(result);
  if (!detail.ok) return <DataError breadcrumb={CRUMBS} title="Study" message={detail.message} />;

  const study = detail.data;

  const signedIn = isParticipant(await readSession());

  // Sessions, the scorecard and existing bookings all need a session of their
  // own. A guest reads the study; they are asked to sign in before booking.
  let scorecard = NOT_SIGNED_IN;
  let sessions: SessionRow[] = [];
  let sessionsFailed = false;
  let existingBookingId: string | null = null;
  let bookedScheduleId: string | null = null;

  if (signedIn) {
    const [scorecardResult, sessionsResult, bookingsResult] = await Promise.all([
      getScorecard(study.id),
      getBookableSessions(study.id),
      getMyBookings(),
    ]);

    if (scorecardResult.ok) scorecard = scorecardResult.data;

    // An unread session list is not an empty one. Saying "no sessions" here
    // would be a claim the app cannot make.
    if (sessionsResult.ok) sessions = sessionsResult.data.map(toSessionRow);
    else sessionsFailed = true;
    if (bookingsResult.ok) {
      const held = bookingsResult.data.find((b) => b.status === "booked" && b.studyId === study.id);
      existingBookingId = held?.id ?? null;
      // The booking names its study but not its schedule, so the session is
      // matched on when and where it runs — the pair that identifies it.
      bookedScheduleId = held
        ? (sessions.find((s) => s.start === held.start && s.location === held.location)?.id ?? null)
        : null;
    }
  }

  const openSessions = sessions.filter((s) => freePlaces(s) > 0).length;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Studies", href: "/" }, { label: study.title }]} />

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {study.tags.map((tag) => (
            <Badge key={tag} tone="brand" size="sm">
              {tag}
            </Badge>
          ))}
          {study.status === "paused" && <Badge tone="warning">Recruitment paused</Badge>}
        </div>
        <h1 className="type-title-2 text-fg-1">{study.title}</h1>
        <p className="max-w-3xl type-body-lg text-fg-2">{study.shortDescription}</p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 type-body text-fg-2">
          <li className="flex items-center gap-1.5">
            <Timer size={18} className="text-fg-3" aria-hidden="true" />
            <span className="sr-only">Session length: </span>
            {study.durationMinutes} minutes
          </li>
          <li className="flex items-center gap-1.5">
            <Money size={18} className="text-fg-3" aria-hidden="true" />
            <span className="sr-only">Compensation: </span>
            {study.compensation}
          </li>
          <li className="flex items-center gap-1.5">
            <Location size={18} className="text-fg-3" aria-hidden="true" />
            <span className="sr-only">Where: </span>
            {study.location}
          </li>
          <li className="type-caption self-center text-fg-4">
            <span className="sr-only">Protocol: </span>
            {study.irbCode}
          </li>
        </ul>
      </header>

      {study.status === "paused" && (
        <MessageBar intent="warning" title="This study is not taking new bookings at the moment.">
          Existing bookings are unaffected. Check back soon or register your interest.
        </MessageBar>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <Card padding="lg">
            <CardHeader
              size="panel"
              title="What the session involves"
              description="Read this before you book. You may withdraw at any point."
            />
            <div className="mt-5 flex flex-col gap-4 text-[16px] leading-[24px] text-fg-2">
              {study.protocol.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </Card>

          {study.whoThisIsFor.length > 0 && (
            <Card padding="lg">
              <CardHeader
                size="panel"
                title="Who this study is for"
                description="Written from the study's rules, so it is always current."
              />
              <ul className="mt-5 grid gap-x-8 gap-y-2.5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
                {study.whoThisIsFor.map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-[16px] leading-[22px] text-fg-1">
                    <Checkmark size={16} className="mt-1 shrink-0 text-brand" />
                    {line}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {study.status === "active" && (
            <div id="book" className="scroll-mt-24">
              <StudyBooking
                criteria={study.inclusionCriteria}
                slots={sessions}
                bookedScheduleId={bookedScheduleId}
                sessionsUnavailable={sessionsFailed}
                eligible={scorecard.ok}
                missingProfile={!scorecard.profileComplete}
                signedIn={signedIn}
                existingBookingId={existingBookingId}
                now={serverNow()}
              />
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-16 lg:self-start">
          <ScorecardCard scorecard={scorecard} />
          <Card padding="lg">
            <CardHeader size="panel" title="Study facts" />
            <dl className="mt-5 grid grid-cols-2 items-baseline gap-x-4 gap-y-3.5 text-[16px] leading-[19px]">
              <dt className="text-[14px] leading-[17px] text-field-label">Compensation</dt>
              <dd className="text-fg-1">{study.compensation}</dd>
              <dt className="text-[14px] leading-[17px] text-field-label">Duration</dt>
              <dd className="text-fg-1">{study.durationMinutes} minutes</dd>
              <dt className="text-[14px] leading-[17px] text-field-label">Where</dt>
              <dd className="text-fg-1">{study.location}</dd>
              <dt className="text-[14px] leading-[17px] text-field-label">Open sessions</dt>
              <dd className="text-fg-1">{signedIn ? openSessions : "Sign in to see"}</dd>
              <dt className="text-[14px] leading-[17px] text-field-label">Protocol</dt>
              <dd className="text-fg-1">{study.irbCode}</dd>
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}
