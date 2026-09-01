import type { Metadata } from "next";
import { TaxonomyPanel } from "@/components/admin/taxonomy-panel";
import { Breadcrumb, PageHeader } from "@/components/fluent";
import { DataError } from "@/components/ui/data-error";
import { getInterestLeads, getTaxonomy, pageData } from "@/lib/api";

export const metadata: Metadata = { title: "Taxonomy · BIL Superadmin" };

const CRUMBS = [{ label: "Overview", href: "/admin" }, { label: "Interest taxonomy" }];

export default async function AdminTaxonomyPage() {
  const [taxonomyResult, leadsResult] = await Promise.all([getTaxonomy(), getInterestLeads()]);
  const taxonomy = pageData(taxonomyResult);
  const leads = pageData(leadsResult);

  if (!taxonomy.ok) return <DataError breadcrumb={CRUMBS} title="Interest taxonomy" message={taxonomy.message} />;
  if (!leads.ok) return <DataError breadcrumb={CRUMBS} title="Interest taxonomy" message={leads.message} />;

  // How many participants have chosen each term, so a term that recruits
  // nobody is visible as such.
  const uses = new Map<string, number>();
  for (const lead of leads.data) {
    for (const tag of lead.tags) uses.set(tag, (uses.get(tag) ?? 0) + 1);
  }

  const terms = taxonomy.data.map((tag) => ({ id: tag.id, label: tag.label, uses: uses.get(tag.label) ?? 0 }));

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6 p-6">
      <Breadcrumb items={CRUMBS} />

      <PageHeader
        title="Interest taxonomy"
        actions={
          <p className="text-[14px] leading-[17px] text-field-label">
            {terms.length} {terms.length === 1 ? "term" : "terms"}
          </p>
        }
      />
      <TaxonomyPanel terms={terms} />
    </section>
  );
}
