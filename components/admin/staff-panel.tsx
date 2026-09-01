"use client";

import { useMemo, useState } from "react";
import { invite, revoke } from "@/app/(admin)/admin/actions";
import { Badge, Button, Card, CardHeader, DataTable, Field, FilterBar, Input, Select, type DataColumn } from "@/components/fluent";
import type { StaffRole } from "@/lib/types";
import { useAdminAction } from "./use-admin-action";
import { AdminNotice } from "./admin-notice";

const ROLE_LABEL: Record<StaffRole, string> = {
  research_assistant: "Research assistant",
  principal_investigator: "Principal investigator",
  super_admin: "Superadmin",
};

const ROLES = Object.entries(ROLE_LABEL) as [StaffRole, string][];

const ALL = "all";

const ACCESS = [
  { value: "active", label: "Active" },
  { value: "revoked", label: "Revoked" },
];

/** The shortest password the API will accept. */
const MIN_PASSWORD = 12;

/** A staff account as the directory reports it. */
export interface StaffAccount {
  id: string;
  fullName: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  mfaEnabled: boolean;
}

export function StaffPanel({ users }: { users: StaffAccount[] }) {
  const { notice, dismiss, pending, run } = useAdminAction();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("research_assistant");
  const [roleFilter, setRoleFilter] = useState(ALL);
  const [access, setAccess] = useState(ALL);

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (roleFilter === ALL || u.role === roleFilter) &&
          (access === ALL || (access === "active") === u.isActive),
      ),
    [users, roleFilter, access],
  );

  const ready = fullName.trim().length >= 2 && email.includes("@") && password.length >= MIN_PASSWORD;

  const columns: DataColumn<StaffAccount>[] = [
    { id: "name", header: "Name", sortValue: (u) => u.fullName, cell: (u) => u.fullName },
    { id: "email", header: "Email", width: "260px", hideBelow: "lg", sortValue: (u) => u.email, cell: (u) => u.email },
    { id: "role", header: "Role", width: "220px", sortValue: (u) => u.role, cell: (u) => ROLE_LABEL[u.role] },
    {
      id: "mfa",
      header: "MFA",
      width: "120px",
      hideBelow: "xl",
      sortValue: (u) => String(u.mfaEnabled),
      cell: (u) => (
        <Badge tone={u.mfaEnabled ? "success" : "warning"} size="sm">
          {u.mfaEnabled ? "Enabled" : "Not set up"}
        </Badge>
      ),
    },
    {
      id: "status",
      header: "Access",
      width: "130px",
      sortValue: (u) => String(u.isActive),
      cell: (u) => (
        <Badge tone={u.isActive ? "success" : "neutral"} size="sm">
          {u.isActive ? "Active" : "Revoked"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Revoke",
      width: "110px",
      actions: true,
      cell: (u) =>
        u.isActive ? (
          <Button variant="subtle" size="sm" disabled={pending} onClick={() => run(() => revoke(u.id))}>
            Revoke
          </Button>
        ) : (
          <span className="text-fg-4">—</span>
        ),
    },
  ];

  return (
    <Card padding="none">
      <CardHeader title="Staff accounts" description="Who can reach the console, and at what role" className="px-4 pb-4 pt-5" />

      <form
        className="flex flex-wrap items-end gap-3 border-t border-stroke-2 px-4 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => invite(fullName.trim(), email.trim(), password, role),
            () => {
              setFullName("");
              setEmail("");
              setPassword("");
            },
          );
        }}
      >
        <Field label="Name" width="md">
          {({ id }) => <Input id={id} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Amara Okonkwo" />}
        </Field>
        <Field label="Email" width="md">
          {({ id }) => (
            <Input
              id={id}
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@bil.example"
            />
          )}
        </Field>
        <Field label="Temporary password" width="md" hint={`At least ${MIN_PASSWORD} characters.`}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="password"
              autoComplete="new-password"
              aria-describedby={describedBy}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <Field label="Role" width="md">
          {({ id }) => (
            <Select id={id} value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
              {ROLES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Button type="submit" variant="primary" loading={pending} disabled={!ready}>
          Create account
        </Button>
      </form>

      <div className="px-4">
        <AdminNotice notice={notice} onDismiss={dismiss} />
      </div>

      <DataTable
        label="Staff accounts"
        columns={columns}
        rows={filtered}
        rowId={(u) => u.id}
        searchText={(u) => `${u.fullName} ${u.email} ${ROLE_LABEL[u.role]}`}
        searchPlaceholder="Search staff"
        toolbar={
          <FilterBar
            onReset={() => {
              setRoleFilter(ALL);
              setAccess(ALL);
            }}
            filters={[
              {
                id: "role",
                label: "Role",
                value: roleFilter,
                allValue: ALL,
                options: ROLES.map(([value, label]) => ({ value, label })),
                onChange: setRoleFilter,
              },
              { id: "access", label: "Access", value: access, allValue: ALL, options: ACCESS, onChange: setAccess },
            ]}
          />
        }
        summary={`${filtered.length} of ${users.length}`}
        initialSort={{ id: "name", dir: "asc" }}
        emptyTitle="No staff accounts yet"
        emptyHint="Create an account above and it appears here."
      />
    </Card>
  );
}
