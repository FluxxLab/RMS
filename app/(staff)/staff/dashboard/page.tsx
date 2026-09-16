import type { Metadata } from "next";
import { OpsDashboard } from "@/components/dashboard/ops-dashboard";
import { DataError } from "@/components/ui/data-error";
import { getAudit, getDashboard, getSlots, getStudyLog, getTxLog, pageData, readSession } from "@/lib/api";
import { serverNow } from "@/lib/now";
import { toSlotRow } from "@/lib/slots";

export const metadata: Metadata = { title: "Operations dashboard · BIL RMS" };

const CRUMBS = [{ label: "Dashboard" }];

/**
 * Server page: the console's operations view.
 *
 * The headline counts come from the engine's own dashboard endpoint; the slot
 * and study feeds show how those counts break down across today and across
 * studies. The API narrows all of them to the studies the caller is on.
 *
 * The lead, audit and engine feeds are fetched only for a superadmin. They are
 * the three things that cannot be narrowed to a study, so a scoped viewer must
 * not be shown them — and there is no reason to ask the API for data the page
 * will not render.
 */
export default async function DashboardPage() {
  const oversight = (await readSession())?.role === "super_admin";

  const [kpisResult, slotsResult, studiesResult, auditResult, txLogResult] = await Promise.all([
    getDashboard(),
    getSlots(),
    getStudyLog(),
    oversight ? getAudit({ limit: 200 }) : null,
    oversight ? getTxLog() : null,
  ]);

  const kpis = pageData(kpisResult);
  const slots = pageData(slotsResult);
  const studies = pageData(studiesResult);
  const audit = auditResult === null ? null : pageData(auditResult);

  if (!kpis.ok) return <DataError breadcrumb={CRUMBS} title="Operations dashboard" message={kpis.message} />;
  if (!slots.ok) return <DataError breadcrumb={CRUMBS} title="Operations dashboard" message={slots.message} />;
  if (!studies.ok) return <DataError breadcrumb={CRUMBS} title="Operations dashboard" message={studies.message} />;
  if (audit && !audit.ok) return <DataError breadcrumb={CRUMBS} title="Operations dashboard" message={audit.message} />;

  return (
    <OpsDashboard
      reported={kpis.data}
      slots={slots.data.map(toSlotRow)}
      studies={studies.data.map((study) => ({
        studyId: study.studyId,
        irbCode: study.irbCode,
        title: study.title,
        status: study.status,
        seatsBooked: study.seatsBooked,
        seatsTotal: study.seatsTotal,
        openSlots: study.openSlots,
      }))}
      audit={audit?.ok ? audit.data.entries : []}
      // A log that could not be read starts empty; the panel says so and retries.
      txLog={txLogResult?.ok ? txLogResult.data : []}
      oversight={oversight}
      now={serverNow()}
    />
  );
}
