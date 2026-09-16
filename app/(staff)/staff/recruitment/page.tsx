import type { Metadata } from "next";
import { Recruitment } from "@/components/staff/recruitment";
import { DataError } from "@/components/ui/data-error";
import { getPipelineStudies, pageData } from "@/lib/api";

export const metadata: Metadata = { title: "Recruitment · BIL RMS" };

const CRUMBS = [{ label: "Dashboard", href: "/staff/dashboard" }, { label: "Recruitment" }];

/**
 * Server page: finding people for a study.
 *
 * It is its own surface rather than a panel under the interest feed. The two
 * answer different questions — that one says who has registered an interest in
 * anything, this one says who to put in a room next week — and stacking them
 * buried the workflow beneath a list it has nothing to do with.
 */
export default async function RecruitmentPage() {
  const studies = pageData(await getPipelineStudies());
  if (!studies.ok) return <DataError breadcrumb={CRUMBS} title="Recruitment" message={studies.message} />;

  return (
    <Recruitment
      // Already narrowed to the studies this person is on, so you can only
      // recruit for your own work.
      studies={studies.data.map((study) => ({
        id: study.id,
        title: study.title,
        irbCode: study.irbCode,
        sector: study.sector ?? null,
        minExperience: study.minExperience ?? null,
      }))}
    />
  );
}
