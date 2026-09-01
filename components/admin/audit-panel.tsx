"use client";

import { useMemo, useState } from "react";
import { Badge, Card, CardHeader, DataTable, FilterBar, type DataColumn } from "@/components/fluent";
import { fmtDateTime } from "@/lib/format";
import { ACTOR_ROLE_LABEL, actionFamily, actorRole, type AuditRow } from "@/lib/audit";

const ALL = "all";

interface AuditPanelProps {
  audit: AuditRow[];
  /** Show only the most recent N — the overview wants a glance, not the ledger. */
  limit?: number;
}

export function AuditPanel({ audit, limit }: AuditPanelProps) {
  const [role, setRole] = useState(ALL);
  const [family, setFamily] = useState(ALL);

  // The families actually present, so the filter never offers an empty result.
  const families = useMemo(
    () =>
      [...new Set(audit.map((a) => actionFamily(a.action)))]
        .sort()
        .map((value) => ({ value, label: value })),
    [audit],
  );

  const rows = useMemo(() => {
    const filtered = audit.filter(
      (a) => (role === ALL || actorRole(a.actorRole) === role) && (family === ALL || actionFamily(a.action) === family),
    );
    return limit ? filtered.slice(0, limit) : filtered;
  }, [audit, role, family, limit]);

  const columns: DataColumn<AuditRow>[] = [
    { id: "at", header: "When", width: "180px", sortValue: (a) => a.at, cell: (a) => fmtDateTime(a.at) },
    {
      id: "action",
      header: "Action",
      sortValue: (a) => a.action,
      cell: (a) => <span className="font-mono text-[13px]">{a.action}</span>,
    },
    {
      id: "role",
      header: "Role",
      width: "180px",
      hideBelow: "lg",
      sortValue: (a) => a.actorRole,
      cell: (a) => ACTOR_ROLE_LABEL[actorRole(a.actorRole)],
    },
    {
      id: "actor",
      header: "Actor",
      width: "200px",
      sortValue: (a) => a.actorLabel,
      cell: (a) => <span className="tabular-nums">{a.actorLabel}</span>,
    },
    {
      id: "target",
      header: "Target",
      width: "200px",
      hideBelow: "2xl",
      sortValue: (a) => a.target ?? "",
      cell: (a) => <span className="tabular-nums">{a.target ?? "—"}</span>,
    },
    {
      id: "family",
      header: "Area",
      width: "130px",
      sortValue: (a) => actionFamily(a.action),
      cell: (a) => (
        <Badge tone="brand" size="sm">
          {actionFamily(a.action)}
        </Badge>
      ),
    },
  ];

  return (
    <Card padding="none">
      <CardHeader
        title={limit ? "Recent activity" : "Audit log"}
        description="Every recorded action, newest first"
        className="px-4 pb-4 pt-5"
      />
      <DataTable
        label="Audit log"
        columns={columns}
        rows={rows}
        rowId={(a) => a.id}
        searchText={(a) => `${a.action} ${a.actorLabel} ${ACTOR_ROLE_LABEL[actorRole(a.actorRole)]} ${a.target ?? ""}`}
        searchPlaceholder="Search by action or actor"
        toolbar={
          <FilterBar
            onReset={() => {
              setRole(ALL);
              setFamily(ALL);
            }}
            filters={[
              {
                id: "role",
                label: "Role",
                value: role,
                allValue: ALL,
                options: Object.entries(ACTOR_ROLE_LABEL).map(([value, label]) => ({ value, label })),
                onChange: setRole,
              },
              { id: "family", label: "Area", value: family, allValue: ALL, options: families, onChange: setFamily },
            ]}
          />
        }
        summary={`${rows.length} of ${audit.length}`}
        initialSort={{ id: "at", dir: "desc" }}
        emptyTitle="Nothing audited yet"
        emptyHint="Every reservation, cancellation and check-in writes an entry here."
      />
    </Card>
  );
}
