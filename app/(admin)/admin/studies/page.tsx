import type { Metadata } from "next";
import { StudiesPanel } from "@/components/admin/studies-panel";
import { Breadcrumb, PageHeader } from "@/components/fluent";
import { Book, CheckmarkCircle, Clock, Shield } from "@/components/icons";
import { StatRow, StatTile } from "@/components/ui/stat-tile";
import { DataError } from "@/components/ui/data-error";
import { getPipelineStudies, getStudyLog, pageData } from "@/lib/api";
import { studiesByStatus } from "@/lib/audit";

export const metadata: Metadata = { title: "Studies · BIL Superadmin" };

const CRUMBS = [{ label: "Overview", href: "/admin" }, { label: "Studies" }];

/** Every study the lab has authored, at whatever stage it has reached. */
export default async function AdminStudiesPage() {
  const [studiesResult, logResult] = await Promise.all([getPipelineStudies(), getStudyLog()]);
  const studies = pageData(studiesResult);
  const log = pageData(logResult);

  if (!studies.ok) return <DataError breadcrumb={CRUMBS} title="Studies" message={studies.message} />;
  if (!log.ok) return <DataError breadcrumb={CRUMBS} title="Studies" message={log.message} />;

  const counts = studiesByStatus(studies.data.map((s) => s.status));

  // The recruitment target lives on the study log, not the study record.
  const targetById = new Map(log.data.map((entry) => [entry.studyId, entry.maxCap]));

  const rows = studies.data.map((study) => ({
    id: study.id,
    irbCode: study.irbCode,
    title: study.title,
    location: study.location,
    durationMinutes: study.durationMinutes,
    maxCap: targetById.get(study.id) ?? null,
    status: study.status,
  }));

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6 p-6">
      <Breadcrumb items={CRUMBS} />

      <PageHeader
        title="Studies"
        actions={
          <p className="text-[14px] leading-[17px] text-field-label">
            {rows.length} {rows.length === 1 ? "study" : "studies"}
          </p>
        }
      />
      <StatRow>
        <StatTile icon={<Book />} label="Studies" value={String(rows.length)} detail={`${counts.draft} still in draft`} />
        <StatTile icon={<CheckmarkCircle />} label="Active" value={String(counts.active)} detail="recruiting participants now" />
        <StatTile icon={<Clock />} label="Paused" value={String(counts.paused)} detail="not taking new bookings" />
        <StatTile
          icon={<Shield />}
          label="In ethics review"
          value={String(counts.ethics_review)}
          detail={`${counts.completed} completed`}
        />
      </StatRow>

      <StudiesPanel studies={rows} />
    </section>
  );
}
