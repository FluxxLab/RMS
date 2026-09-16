"use client";

import { useMemo, useState } from "react";
import { changeRole, invite, revoke } from "@/app/(admin)/admin/actions";
import { Badge, Button, Card, CardHeader, DataTable, Dialog, Field, FilterBar, Input, Select, type DataColumn } from "@/components/fluent";
import { Add } from "@/components/icons";
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
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<StaffAccount | null>(null);
  const [editRole, setEditRole] = useState<StaffRole>("research_assistant");
  /* Revoking is held behind a confirmation: it removes someone's access, and a
     misplaced click on a row should not be able to do that silently. */
  const [revoking, setRevoking] = useState<StaffAccount | null>(null);
  const [roleFilter, setRoleFilter] = useState(ALL);
  const [access, setAccess] = useState(ALL);

  const clearForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
  };

  /* Closing discards the draft: a half-typed account left behind would be
     offered back the next time someone opened the dialog for a different one. */
  const closeInvite = () => {
    setInviting(false);
    clearForm();
  };

  const openEdit = (user: StaffAccount) => {
    setEditRole(user.role);
    setEditing(user);
  };

  const submit = () =>
    run(
      () => invite(fullName.trim(), email.trim(), password, role),
      () => {
        clearForm();
        setInviting(false);
      },
    );

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
      header: "Manage",
      width: "180px",
      actions: true,
      cell: (u) => (
        <span className="flex items-center justify-end gap-1">
          <Button variant="subtle" size="sm" disabled={pending} onClick={() => openEdit(u)}>
            Edit
          </Button>
          {u.isActive ? (
            <Button variant="subtle" size="sm" disabled={pending} onClick={() => setRevoking(u)}>
              Revoke
            </Button>
          ) : (
            <span className="px-2 text-fg-4">—</span>
          )}
        </span>
      ),
    },
  ];

  return (
    <Card padding="none">
      <CardHeader
        title="Staff accounts"
        description="Who can reach the console, and at what role"
        className="px-4 pb-4 pt-5"
        action={
          <Button variant="primary" size="sm" icon={<Add />} onClick={() => setInviting(true)}>
            New account
          </Button>
        }
      />

      {/*
        * Creating an account is an occasional act, so it lives behind a button
        * rather than across the top of the table. Inline, four fields and a
        * password box competed with the list for the whole width and were the
        * first thing read on a page that exists to show who already has access.
        */}
      <Dialog
        open={inviting}
        onClose={closeInvite}
        title="New staff account"
        actions={
          <>
            <Button variant="secondary" onClick={closeInvite} disabled={pending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} loading={pending} disabled={!ready}>
              Create account
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Name">
            {({ id }) => (
              <Input id={id} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Amara Okonkwo" />
            )}
          </Field>
          <Field label="Email">
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
          <Field label="Temporary password" hint={`At least ${MIN_PASSWORD} characters.`}>
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
          <Field label="Role">
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
        </div>
      </Dialog>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.fullName}` : "Edit account"}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={pending}
              disabled={!editing || editRole === editing.role}
              onClick={() => {
                if (!editing) return;
                run(() => changeRole(editing.id, editRole), () => setEditing(null));
              }}
            >
              Save role
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {/*
            * Name and email are not editable, and not by omission: the audit
            * trail names people by their email, so changing it would detach a
            * person from everything they have already done.
            */}
          <Field label="Email">{() => <Input value={editing?.email ?? ""} disabled readOnly />}</Field>

          <Field label="Role" hint="Takes effect the next time they sign in.">
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as StaffRole)}
              >
                {ROLES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        title="Revoke access"
        actions={
          <>
            <Button variant="secondary" onClick={() => setRevoking(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => {
                if (!revoking) return;
                run(() => revoke(revoking.id), () => setRevoking(null));
              }}
            >
              Revoke access
            </Button>
          </>
        }
      >
        <p className="type-body text-fg-2">
          <strong className="font-medium text-fg-1">{revoking?.fullName}</strong> will no longer be able to sign
          in. The account itself is kept, so everything they have already done stays attributable in the audit
          log.
        </p>
      </Dialog>

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
