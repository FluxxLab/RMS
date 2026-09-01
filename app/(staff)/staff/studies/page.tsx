import type { Metadata } from "next";
import { StudiesLog, type StudyLogRow } from "@/components/staff/studies-log";
import { DataError } from "@/components/ui/data-error";
import { getPipelineStudies, getStudyLog, pageData } from "@/lib/api";

export const metadata: Metadata = { title: "Study log · BIL RMS" };

const CRUMBS = [{ label: "Dashboard", href: "/staff/dashboard" }, { label: "Study log" }];

/**
 * Server page: the study portfolio as the console sees it — read-only.
 *
 * Two calls, because the API splits them: the pipeline lists every study at
 * whatever stage it has reached, and the log reports occupancy for the ones
 * that have sessions.
 */
export default async function StudiesPage() {
  const [logResult, studiesResult] = await Promise.all([getStudyLog(), getPipelineStudies()]);
  const log = pageData(logResult);
  const studies = pageData(studiesResult);
  if (!log.ok) return <DataError breadcrumb={CRUMBS} title="Study log" message={log.message} />;
  if (!studies.ok) return <DataError breadcrumb={CRUMBS} title="Study log" message={studies.message} />;

  // The log only knows a study once it has sessions, so it fills in occupancy
  // rather than deciding which studies exist.
  const occupancy = new Map(log.data.map((entry) => [entry.studyId, entry]));

  const rows: StudyLogRow[] = studies.data.map((study) => {
    const entry = occupancy.get(study.id);
    return {
      id: study.id,
      irbCode: study.irbCode,
      title: study.title,
      location: study.location,
      durationMinutes: study.durationMinutes,
      status: study.status,
      sessions: entry?.totalSlots ?? 0,
      booked: entry?.seatsBooked ?? 0,
      openPlaces: entry ? Math.max(0, entry.seatsTotal - entry.seatsBooked) : 0,
    };
  });

  return <StudiesLog rows={rows} />;
}
