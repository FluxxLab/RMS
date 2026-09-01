import type { Metadata } from "next";
import { Breadcrumb, MessageBar, PageHeader } from "@/components/fluent";
import { StudyForm } from "@/components/admin/study-form";
import { DataError } from "@/components/ui/data-error";
import { getStaff, pageData } from "@/lib/api";

export const metadata: Metadata = { title: "New study · BIL Superadmin" };

const CRUMBS = [
  { label: "Overview", href: "/admin" },
  { label: "Studies", href: "/admin/studies" },
  { label: "New study" },
];

/** Authoring a study. It is created in draft; the lifecycle is a separate step. */
export default async function NewStudyPage() {
  const staff = pageData(await getStaff());
  if (!staff.ok) return <DataError breadcrumb={CRUMBS} title="New study" message={staff.message} />;

  // A study is owned by whoever answers for it: a PI, or a superadmin.
  const researchers = staff.data
    .filter((user) => user.isActive && user.role !== "research_assistant")
    .map((user) => ({ id: user.id, fullName: user.fullName }));

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6 p-6">
      <Breadcrumb items={CRUMBS} />

      <PageHeader
        title="New study"
        description="Everything a participant reads, and every rule the engine will check on their behalf."
      />

      {researchers.length === 0 ? (
        <MessageBar intent="warning" title="No researcher can be named as responsible.">
          A study belongs to a principal investigator or a superadmin. Create one of those accounts first, then return here.
        </MessageBar>
      ) : (
        <StudyForm researchers={researchers} />
      )}
    </section>
  );
}
