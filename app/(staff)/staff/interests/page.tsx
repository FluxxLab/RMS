import type { Metadata } from "next";
import { InterestLeads } from "@/components/staff/interest-leads";
import { DataError } from "@/components/ui/data-error";
import { getInterestLeads, pageData } from "@/lib/api";
import { serverNow } from "@/lib/now";

export const metadata: Metadata = { title: "Interest leads · BIL RMS" };

const CRUMBS = [{ label: "Dashboard", href: "/staff/dashboard" }, { label: "Interest leads" }];

/** Server page: research interests registered in the portal, for recruitment. */
export default async function InterestsPage() {
  const leads = pageData(await getInterestLeads());
  if (!leads.ok) return <DataError breadcrumb={CRUMBS} title="Interest leads" message={leads.message} />;

  return <InterestLeads interests={leads.data} now={serverNow()} />;
}
