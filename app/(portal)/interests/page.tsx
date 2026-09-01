import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Breadcrumb, PageHeader } from "@/components/fluent";
import { InterestsForm } from "@/components/portal/interests-form";
import { DataError } from "@/components/ui/data-error";
import { getMyInterests, getTaxonomy, isParticipant, pageData, readSession } from "@/lib/api";

export const metadata: Metadata = { title: "Research interests · BIL Research" };

const CRUMBS = [{ label: "Studies", href: "/" }, { label: "Research interests" }];

export default async function InterestsPage() {
  if (!isParticipant(await readSession())) redirect("/sign-in?next=/interests");

  const [taxonomyResult, mineResult] = await Promise.all([getTaxonomy(), getMyInterests()]);
  const taxonomy = pageData(taxonomyResult);
  const mine = pageData(mineResult);

  if (!taxonomy.ok) return <DataError breadcrumb={CRUMBS} title="Research interests" message={taxonomy.message} />;
  if (!mine.ok) return <DataError breadcrumb={CRUMBS} title="Research interests" message={mine.message} />;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={CRUMBS} />

      <PageHeader
        title="Research interests"
        description="Tell us what you would like to take part in. New studies that match are offered to you first."
      />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[640px_minmax(0,1fr)]">
        {/* Primary object: the form, held to a readable column. */}
        <InterestsForm taxonomy={taxonomy.data.map((tag) => tag.label)} initialTags={mine.data} />

        {/* Secondary surface: quiet, no elevation. */}
        <aside className="max-w-md self-start rounded-md border border-stroke-2 bg-bg-2 p-5">
          <h2 className="type-body-strong text-fg-1">How this is used</h2>
          <p className="mt-2 type-body text-fg-2">
            Researchers search these topics when they are recruiting, and see the pseudonyms that match — never a name or an
            email. Saving replaces your whole list, so it always says what you want today.
          </p>
        </aside>
      </div>
    </div>
  );
}
