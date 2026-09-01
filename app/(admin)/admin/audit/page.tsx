import type { Metadata } from "next";
import { AuditExport } from "@/components/admin/audit-export";
import { AuditPanel } from "@/components/admin/audit-panel";
import { Breadcrumb, PageHeader } from "@/components/fluent";
import { People, Pulse, Shield, Sparkle } from "@/components/icons";
import { StatRow, StatTile } from "@/components/ui/stat-tile";
import { DataError } from "@/components/ui/data-error";
import { getAudit, pageData, readSession } from "@/lib/api";
import { serverNow } from "@/lib/now";
import { actionFamily, actorRole } from "@/lib/audit";

export const metadata: Metadata = { title: "Audit log · BIL Superadmin" };

const CRUMBS = [{ label: "Overview", href: "/admin" }, { label: "Audit log" }];

/** The append-only compliance record. Read-only by design: nothing edits it. */
export default async function AdminAuditPage() {
  const [result, session] = await Promise.all([getAudit({ limit: 200 }).then(pageData), readSession()]);
  if (!result.ok) return <DataError breadcrumb={CRUMBS} title="Audit log" message={result.message} />;

  const audit = result.data.entries.map((entry) => ({
    id: entry._id,
    at: entry.at,
    action: entry.action,
    actorRole: entry.actorRole,
    actorLabel: entry.actorLabel,
    target: entry.target,
  }));

  const participantLed = audit.filter((a) => actorRole(a.actorRole) === "participant").length;
  const areas = new Set(audit.map((a) => actionFamily(a.action))).size;
  const actors = new Set(audit.map((a) => a.actorLabel)).size;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6 p-6">
      <Breadcrumb items={CRUMBS} />

      <PageHeader
        title="Audit log"
        actions={
          <p className="text-[14px] leading-[17px] text-field-label">
            {result.data.total} {result.data.total === 1 ? "entry" : "entries"}
          </p>
        }
      />
      <StatRow>
        <StatTile icon={<Pulse />} label="Entries" value={String(result.data.total)} detail={`most recent ${audit.length} shown`} />
        <StatTile icon={<People />} label="Participant-led" value={String(participantLed)} detail="actions taken in the portal" />
        <StatTile icon={<Shield />} label="Distinct actors" value={String(actors)} detail="pseudonyms and staff labels" />
        <StatTile icon={<Sparkle />} label="Areas touched" value={String(areas)} detail="parts of the system with activity" />
      </StatRow>

      {/* A PI may read the log; only a superadmin may take a copy out. */}
      {session?.role === "super_admin" && <AuditExport today={serverNow().slice(0, 10)} />}

      <AuditPanel audit={audit} />
    </section>
  );
}
