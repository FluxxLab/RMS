import type { Metadata } from "next";
import { StaffPanel } from "@/components/admin/staff-panel";
import { Breadcrumb, PageHeader } from "@/components/fluent";
import { LockClosed, People, PersonProhibited, Star } from "@/components/icons";
import { StatRow, StatTile } from "@/components/ui/stat-tile";
import { DataError } from "@/components/ui/data-error";
import { getStaff, pageData } from "@/lib/api";

export const metadata: Metadata = { title: "Staff · BIL Superadmin" };

const CRUMBS = [{ label: "Overview", href: "/admin" }, { label: "Staff accounts" }];

export default async function AdminStaffPage() {
  const result = pageData(await getStaff());
  if (!result.ok) return <DataError breadcrumb={CRUMBS} title="Staff accounts" message={result.message} />;

  const users = result.data;
  const active = users.filter((u) => u.isActive).length;
  const revoked = users.length - active;
  const admins = users.filter((u) => u.role === "super_admin").length;
  const investigators = users.filter((u) => u.role === "principal_investigator").length;
  const withMfa = users.filter((u) => u.mfaEnabled).length;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6 p-6">
      <Breadcrumb items={CRUMBS} />

      <PageHeader
        title="Staff accounts"
        actions={<p className="text-[14px] leading-[17px] text-field-label">{active} with access</p>}
      />
      <StatRow>
        <StatTile icon={<People />} label="Accounts" value={String(users.length)} detail="created on the console" />
        <StatTile icon={<LockClosed />} label="With MFA" value={String(withMfa)} detail={`${active - withMfa} still to set it up`} />
        <StatTile icon={<PersonProhibited />} label="Revoked" value={String(revoked)} detail="kept so the audit trail resolves" />
        <StatTile
          icon={<Star />}
          label="Superadmins"
          value={String(admins)}
          detail={`${investigators} principal investigator${investigators === 1 ? "" : "s"}`}
        />
      </StatRow>

      <StaffPanel users={users} />
    </section>
  );
}
