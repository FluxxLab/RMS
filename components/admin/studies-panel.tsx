"use client";

import { useMemo, useState } from "react";
import { changeStudyStatus } from "@/app/(admin)/admin/actions";
import { Badge, Button, ButtonLink, Card, CardHeader, DataTable, Dialog, FilterBar, Menu, type BadgeTone, type DataColumn } from "@/components/fluent";
import { Add, More } from "@/components/icons";
import type { StudyStatus } from "@/lib/types";

/** A study as the superadmin's portfolio view reads it. */
export interface AdminStudyRow {
  id: string;
  irbCode: string;
  title: string;
  location: string;
  durationMinutes: number;
  /** Recruitment target, where the study log reports one. */
  maxCap: number | null;
  status: StudyStatus;
}

/*
 * Which transitions the lifecycle menu offers. This is an affordance, not the
 * rule: the engine re-decides every change and refuses one it does not allow,
 * so an entry here can never let through something the system forbids.
 */
const STUDY_TRANSITIONS: Record<StudyStatus, StudyStatus[]> = {
  draft: ["ethics_review"],
  ethics_review: ["active", "draft"],
  active: ["paused", "completed"],
  paused: ["active", "completed"],
  completed: [],
};
import { AdminNotice } from "./admin-notice";
import { useAdminAction } from "./use-admin-action";

export const STUDY_STATUS: Record<StudyStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  ethics_review: { label: "Ethics review", tone: "warning" },
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "neutral" },
  completed: { label: "Completed", tone: "informative" },
};

const ALL = "all";

export function StudiesPanel({ studies }: { studies: AdminStudyRow[] }) {
  const { notice, dismiss, pending, run } = useAdminAction();
  const [confirming, setConfirming] = useState<{ study: AdminStudyRow; next: StudyStatus } | null>(null);
  const [status, setStatus] = useState(ALL);
  const [room, setRoom] = useState(ALL);

  const rooms = useMemo(
    () => [...new Set(studies.map((s) => s.location))].sort().map((value) => ({ value, label: value })),
    [studies],
  );

  const filtered = useMemo(
    () => studies.filter((s) => (status === ALL || s.status === status) && (room === ALL || s.location === room)),
    [studies, status, room],
  );

  const apply = (studyId: string, next: StudyStatus) =>
    run(
      () => changeStudyStatus(studyId, next),
      () => setConfirming(null),
    );

  // Completing a study cannot be undone: the lifecycle has no edge out of it.
  const request = (study: AdminStudyRow, next: StudyStatus) =>
    next === "completed" ? setConfirming({ study, next }) : apply(study.id, next);

  const columns: DataColumn<AdminStudyRow>[] = [
    { id: "irb", header: "IRB code", width: "140px", sortValue: (s) => s.irbCode, cell: (s) => s.irbCode },
    { id: "title", header: "Study", sortValue: (s) => s.title, cell: (s) => s.title },
    { id: "where", header: "Room", width: "110px", hideBelow: "lg", sortValue: (s) => s.location, cell: (s) => s.location },
    {
      id: "duration",
      header: "Duration",
      width: "110px",
      numeric: true,
      hideBelow: "xl",
      sortValue: (s) => s.durationMinutes,
      cell: (s) => `${s.durationMinutes} min`,
    },
    {
      id: "target",
      header: "Target",
      width: "100px",
      numeric: true,
      sortValue: (s) => s.maxCap ?? -1,
      cell: (s) => (s.maxCap === null ? "—" : String(s.maxCap)),
    },
    {
      id: "status",
      header: "Status",
      width: "150px",
      sortValue: (s) => s.status,
      cell: (s) => (
        <Badge tone={STUDY_STATUS[s.status].tone} size="sm">
          {STUDY_STATUS[s.status].label}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Lifecycle",
      width: "80px",
      actions: true,
      cell: (s) => {
        const next = STUDY_TRANSITIONS[s.status];
        if (next.length === 0) return <span className="text-fg-4">—</span>;
        return (
          <Menu
            label={`Change status of ${s.irbCode}`}
            triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-fg-2 hover:bg-bg-3 hover:text-fg-1 focus-ring [&>svg]:size-4"
            trigger={<More />}
            width={240}
            header={
              <span className="block text-[14px] leading-[17px] text-field-label">
                Move {s.irbCode} on from {STUDY_STATUS[s.status].label.toLowerCase()}
              </span>
            }
            items={next.map((target) => ({ label: STUDY_STATUS[target].label, onSelect: () => request(s, target) }))}
          />
        );
      },
    },
  ];

  return (
    <>
      <AdminNotice notice={notice} onDismiss={dismiss} />

      <Dialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title="Complete this study?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirming(null)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="primary" loading={pending} onClick={() => confirming && apply(confirming.study.id, confirming.next)}>
              Complete study
            </Button>
          </>
        }
      >
        {confirming?.study.irbCode} will stop recruiting and cannot be reopened — the lifecycle has no route out of
        completed. Existing bookings are left as they are.
      </Dialog>

      <Card padding="none">
        <CardHeader
          title="Studies"
          description="Lifecycle is superadmin-only"
          className="px-4 pb-4 pt-5"
          action={
            <ButtonLink href="/admin/studies/new" variant="primary" size="sm" icon={<Add />}>
              New study
            </ButtonLink>
          }
        />
        <DataTable
          label="Studies"
          columns={columns}
          rows={filtered}
          rowId={(s) => s.id}
          searchText={(s) => `${s.irbCode} ${s.title} ${s.location}`}
          searchPlaceholder="Search by IRB code or title"
          toolbar={
            <FilterBar
              onReset={() => {
                setStatus(ALL);
                setRoom(ALL);
              }}
              filters={[
                {
                  id: "status",
                  label: "Status",
                  value: status,
                  allValue: ALL,
                  options: Object.entries(STUDY_STATUS).map(([value, meta]) => ({ value, label: meta.label })),
                  onChange: setStatus,
                },
                { id: "room", label: "Room", value: room, allValue: ALL, options: rooms, onChange: setRoom },
              ]}
            />
          }
          summary={`${filtered.length} of ${studies.length}`}
          initialSort={{ id: "irb", dir: "asc" }}
          emptyTitle="No studies yet"
          emptyHint="Author one with New study and it appears here, in draft."
        />
      </Card>
    </>
  );
}
