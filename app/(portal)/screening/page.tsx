import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Breadcrumb, MessageBar, PageHeader } from "@/components/fluent";
import { ScreeningForms } from "@/components/portal/screening-forms";
import { DataError } from "@/components/ui/data-error";
import { getMyScreenings, isParticipant, pageData, readSession } from "@/lib/api";

export const metadata: Metadata = { title: "Screening · BIL Research" };

const CRUMBS = [{ label: "Studies", href: "/" }, { label: "Screening" }];

/**
 * The questionnaires a study has asked this participant to answer.
 *
 * A study reaches people in two steps: it matches on the sectors they have
 * worked in, then asks the ones who match a few questions of its own. This is
 * where those questions are answered, and the answer decides eligibility
 * without anybody reading a form.
 */
export default async function ScreeningPage() {
  if (!isParticipant(await readSession())) redirect("/sign-in?next=/screening");

  const screenings = pageData(await getMyScreenings(), "/sign-in");
  if (!screenings.ok) return <DataError breadcrumb={CRUMBS} title="Screening" message={screenings.message} />;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={CRUMBS} />
      <PageHeader
        title="Screening"
        description="A few questions from studies that are looking for your experience."
      />

      {screenings.data.length === 0 ? (
        <MessageBar intent="info" title="Nothing to answer right now.">
          When a study is looking for someone with your experience, its questions appear here.
        </MessageBar>
      ) : (
        <ScreeningForms screenings={screenings.data} />
      )}
    </div>
  );
}
