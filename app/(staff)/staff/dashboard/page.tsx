import type { Metadata } from "next";
import { OpsDashboard } from "@/components/dashboard/ops-dashboard";
import { DataError } from "@/components/ui/data-error";
import { getAudit, getDashboard, getInterestLeads, getSlots, getStudyLog, getTxLog, pageData } from "@/lib/api";
import { serverNow } from "@/lib/now";
import { toSlotRow } from "@/lib/slots";

export const metadata: Metadata = { title: "Operations dashboard · BIL RMS" };

const CRUMBS = [{ label: "Dashboard" }];

/**
 * Server page: the console's operations view.
 *
 * The headline counts come from the engine's own dashboard endpoint; the slot,
 * study, lead and audit feeds are here only to show how those counts break
 * down across today, across studies and across the week.
 */
export default async function DashboardPage() {
  const [kpisResult, slotsResult, studiesResult, leadsResult, auditResult, txLogResult] = await Promise.all([
    getDashboard(),
    getSlots(),
    getStudyLog(),
    getInterestLeads(),
    getAudit({ limit: 200 }),
    getTxLog(),
  ]);

  const kpis = pageData(kpisResult);
  const slots = pageData(slotsResult);
  const studies = pageData(studiesResult);
  const leads = pageData(leadsResult);
  const audit = pageData(auditResult);

  if (!kpis.ok) return <DataError breadcrumb={CRUMBS} title="Operations dashboard" message={kpis.message} />;
  if (!slots.ok) return <DataError breadcrumb={CRUMBS} title="Operations dashboard" message={slots.message} />;
  if (!studies.ok) return <DataError breadcrumb={CRUMBS} title="Operations dashboard" message={studies.message} />;
  if (!leads.ok) return <DataError breadcrumb={CRUMBS} title="Operations dashboard" message={leads.message} />;
  if (!audit.ok) return <DataError breadcrumb={CRUMBS} title="Operations dashboard" message={audit.message} />;

  return (
    <OpsDashboard
      reported={kpis.data}
      slots={slots.data.map(toSlotRow)}
      studies={studies.data.map((study) => ({ title: study.title, seatsBooked: study.seatsBooked }))}
      leads={leads.data}
      audit={audit.data.entries}
      // A log that could not be read starts empty; the panel says so and retries.
      txLog={txLogResult.ok ? txLogResult.data : []}
      now={serverNow()}
    />
  );
}
