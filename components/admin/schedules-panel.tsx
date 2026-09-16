"use client";

import { useMemo, useState } from "react";
import {
  cancelSession,
  createSession,
  createSessions,
  deleteSession,
  editSession,
} from "@/app/(admin)/admin/actions";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  Dialog,
  Field,
  FilterBar,
  Menu,
  Select,
  type BadgeTone,
  type DataColumn,
} from "@/components/fluent";
import { Add, Calendar, More } from "@/components/icons";
import {
  dateInputValue,
  fmtDate,
  fmtRange,
  fromDateTimeInputs,
  minutesBetween,
  plusMinutes,
  timeInputValue,
} from "@/lib/format";
import type { SlotRow } from "@/lib/slots";
import type { ScheduleStatus } from "@/lib/types";
import { AdminNotice } from "./admin-notice";
import { SessionFields, draftIsReady, type SessionDraft } from "./session-form";
import {
  GenerateFields,
  emptyGenerateDraft,
  generateIsReady,
  generateSummary,
  toBulkInput,
  type GenerateDraft,
  type SchedulableStudy,
} from "./sessions-panel";
import { useAdminAction } from "./use-admin-action";

const STATUS: Record<ScheduleStatus, { label: string; tone: BadgeTone }> = {
  available: { label: "Available", tone: "success" },
  full: { label: "Full", tone: "brand" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const ALL = "all";

/** Tomorrow at 09:00, which is where an empty add-form opens. */
function defaultDraft(now: string): SessionDraft {
  const tomorrow = plusMinutes(now, 24 * 60);
  return { date: dateInputValue(tomorrow), time: "09:00", minutes: "30", location: "Lab A1", capacity: "2" };
}

function draftFrom(slot: SlotRow): SessionDraft {
  return {
    date: dateInputValue(slot.start),
    time: timeInputValue(slot.start),
    minutes: String(minutesBetween(slot.start, slot.end)),
    location: slot.location,
    capacity: String(slot.maxCapacity),
  };
}

interface SchedulesPanelProps {
  slots: SlotRow[];
  /** Studies a new session may be attached to; empty hides the add button. */
  studies: SchedulableStudy[];
  /** The lab's clock at render, so "upcoming" means the same on both sides. */
  now: string;
}

export function SchedulesPanel({ slots, studies, now }: SchedulesPanelProps) {
  const { notice, dismiss, pending, run } = useAdminAction();
  const [cancelling, setCancelling] = useState<SlotRow | null>(null);
  const [deleting, setDeleting] = useState<SlotRow | null>(null);
  const [editing, setEditing] = useState<SlotRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<SessionDraft>(() => defaultDraft(now));
  const [studyId, setStudyId] = useState(studies[0]?.id ?? "");
  const [bulk, setBulk] = useState<GenerateDraft>(() => emptyGenerateDraft(studies));
  const [study, setStudy] = useState(ALL);
  const [status, setStatus] = useState(ALL);

  const patch = (changes: Partial<SessionDraft>) => setDraft((d) => ({ ...d, ...changes }));
  const patchBulk = (changes: Partial<GenerateDraft>) => setBulk((d) => ({ ...d, ...changes }));

  const openAdd = () => {
    setDraft(defaultDraft(now));
    setStudyId(studies[0]?.id ?? "");
    setAdding(true);
  };

  /* Reopening starts fresh rather than offering back the answers that made the
     batch already on the calendar. */
  const openGenerate = () => {
    setBulk(emptyGenerateDraft(studies));
    setGenerating(true);
  };

  const openEdit = (slot: SlotRow) => {
    setDraft(draftFrom(slot));
    setEditing(slot);
  };

  const studyOptions = useMemo(
    () =>
      [...new Map(slots.map((s) => [s.irbCode, s.title]))]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [slots],
  );

  const filtered = useMemo(
    () => slots.filter((s) => (study === ALL || s.irbCode === study) && (status === ALL || s.status === status)),
    [slots, study, status],
  );

  const submitAdd = () => {
    const start = fromDateTimeInputs(draft.date, draft.time);
    if (!start || studyId === "") return;

    run(
      () =>
        createSession({
          studyId,
          start,
          end: plusMinutes(start, Number(draft.minutes)),
          location: draft.location.trim(),
          maxCapacity: Number(draft.capacity),
        }),
      () => setAdding(false),
    );
  };

  /*
   * Only what actually differs is sent.
   *
   * The API reads a start on its own as "move it, keep its length", so sending
   * an unchanged end alongside a new start would be a different instruction
   * than the one the operator gave. Comparing field by field keeps the request
   * to what they touched.
   */
  const submitEdit = () => {
    if (!editing) return;
    const start = fromDateTimeInputs(draft.date, draft.time);
    if (!start) return;

    const end = plusMinutes(start, Number(draft.minutes));
    const changes: Parameters<typeof editSession>[1] = {};

    if (start !== new Date(editing.start).toISOString()) changes.start = start;
    if (end !== new Date(editing.end).toISOString()) changes.end = end;
    if (draft.location.trim() !== editing.location) changes.location = draft.location.trim();
    if (Number(draft.capacity) !== editing.maxCapacity) changes.maxCapacity = Number(draft.capacity);

    run(() => editSession(editing.id, changes), () => setEditing(null));
  };

  const columns: DataColumn<SlotRow>[] = [
    { id: "date", header: "Date", width: "120px", sortValue: (s) => s.start, cell: (s) => fmtDate(s.start) },
    {
      id: "time",
      header: "Time",
      width: "130px",
      sortValue: (s) => s.start,
      cell: (s) => <span className="tabular-nums">{fmtRange(s.start, s.end)}</span>,
    },
    { id: "study", header: "Study", sortValue: (s) => s.title, cell: (s) => s.title },
    { id: "room", header: "Room", width: "110px", hideBelow: "lg", sortValue: (s) => s.location, cell: (s) => s.location },
    {
      id: "occupancy",
      header: "Booked",
      width: "120px",
      numeric: true,
      sortValue: (s) => s.taken / Math.max(1, s.maxCapacity),
      cell: (s) => `${s.taken}/${s.maxCapacity}`,
    },
    {
      id: "status",
      header: "Status",
      width: "130px",
      sortValue: (s) => s.status,
      cell: (s) => (
        <Badge tone={STATUS[s.status].tone} size="sm">
          {STATUS[s.status].label}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Manage",
      width: "80px",
      actions: true,
      cell: (s) => {
        const live = s.status !== "cancelled";
        const items = [];

        // A cancelled session is not edited back into service, and one that has
        // already run is not moved: neither is a thing the API will accept.
        if (live && s.end > now) items.push({ label: "Edit session", onSelect: () => openEdit(s) });
        if (live && s.end > now) items.push({ label: "Cancel session", onSelect: () => setCancelling(s) });

        // Deleting is only ever offered for a session nobody has booked; the
        // API refuses the rest, and offering it here would be an invitation to
        // an error message.
        if (s.taken === 0) items.push({ label: "Delete session", onSelect: () => setDeleting(s) });

        if (items.length === 0) return <span className="text-fg-4">—</span>;

        return (
          <Menu
            label={`Manage the ${fmtRange(s.start, s.end)} session on ${fmtDate(s.start)}`}
            triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-fg-2 hover:bg-bg-3 hover:text-fg-1 focus-ring [&>svg]:size-4"
            trigger={<More />}
            width={220}
            header={
              <span className="block text-[14px] leading-[17px] text-field-label">
                {fmtDate(s.start)} · {fmtRange(s.start, s.end)} · {s.location}
              </span>
            }
            items={items}
          />
        );
      },
    },
  ];

  return (
    <>
      <AdminNotice notice={notice} onDismiss={dismiss} />

      <Dialog
        open={generating}
        onClose={() => setGenerating(false)}
        title="Generate sessions"
        actions={
          <>
            <Button variant="secondary" onClick={() => setGenerating(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={pending}
              disabled={!generateIsReady(bulk)}
              onClick={() => run(() => createSessions(toBulkInput(bulk)), () => setGenerating(false))}
            >
              Generate sessions
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <GenerateFields studies={studies} draft={bulk} onChange={patchBulk} />

          {/* The count, before the button rather than after it. */}
          <p className="type-caption text-fg-3">{generateSummary(bulk)}</p>
        </div>
      </Dialog>

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a session"
        actions={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={pending}
              disabled={studyId === "" || !draftIsReady(draft)}
              onClick={submitAdd}
            >
              Add session
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Study">
            {({ id }) => (
              <Select id={id} value={studyId} onChange={(e) => setStudyId(e.target.value)}>
                {studies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.irbCode} · {s.title}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <SessionFields draft={draft} onChange={patch} />
        </div>
      </Dialog>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit session"
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={pending}
              disabled={!draftIsReady(draft, editing?.taken ?? 1)}
              onClick={submitEdit}
            >
              Save session
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {editing ? (
            <p className="type-caption text-fg-3">
              {editing.irbCode} · {editing.title}
            </p>
          ) : null}

          <SessionFields draft={draft} onChange={patch} minCapacity={editing?.taken ?? 1} />

          {/*
            * Said before saving, not after. Moving a session moves the people
            * on it, and an operator changing a room at a glance should not
            * discover that from the confirmation.
            */}
          {editing && editing.taken > 0 ? (
            <p className="type-body text-fg-2">
              {editing.taken} {editing.taken === 1 ? "person is" : "people are"} booked on this session and will be
              moved with it.
            </p>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        title="Cancel this session?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setCancelling(null)} disabled={pending}>
              Keep it
            </Button>
            <Button
              variant="primary"
              loading={pending}
              onClick={() =>
                cancelling &&
                run(
                  () => cancelSession(cancelling.id),
                  () => setCancelling(null),
                )
              }
            >
              Cancel session
            </Button>
          </>
        }
      >
        {cancelling
          ? `${cancelling.taken} booking${cancelling.taken === 1 ? "" : "s"} on this session will be cancelled and every place released. Participants keep the entry in their history with the reason.`
          : ""}
      </Dialog>

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this session?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={pending}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                deleting &&
                run(
                  () => deleteSession(deleting.id),
                  () => setDeleting(null),
                )
              }
            >
              Delete session
            </Button>
          </>
        }
      >
        {deleting
          ? `The ${fmtRange(deleting.start, deleting.end)} session on ${fmtDate(deleting.start)} in ${deleting.location} will be removed outright. Nobody has booked it, so nobody's history points at it — if that turns out to be wrong, the server refuses and nothing is lost.`
          : ""}
      </Dialog>

      <Card padding="none">
        <CardHeader
          title="Sessions"
          description="Edit, cancel or remove a session; cancelling releases every place on it"
          className="px-4 pb-4 pt-5"
          action={
            studies.length > 0 ? (
              <span className="flex items-center gap-2">
                <Button variant="secondary" size="sm" icon={<Calendar />} onClick={openGenerate}>
                  Generate
                </Button>
                <Button variant="primary" size="sm" icon={<Add />} onClick={openAdd}>
                  Add session
                </Button>
              </span>
            ) : undefined
          }
        />
        <DataTable
          label="Sessions"
          columns={columns}
          rows={filtered}
          rowId={(s) => s.id}
          searchText={(s) => `${s.title} ${s.irbCode} ${s.location}`}
          searchPlaceholder="Search by study or room"
          toolbar={
            <FilterBar
              onReset={() => {
                setStudy(ALL);
                setStatus(ALL);
              }}
              filters={[
                { id: "study", label: "Study", value: study, allValue: ALL, options: studyOptions, onChange: setStudy },
                {
                  id: "status",
                  label: "Status",
                  value: status,
                  allValue: ALL,
                  options: Object.entries(STATUS).map(([value, meta]) => ({ value, label: meta.label })),
                  onChange: setStatus,
                },
              ]}
            />
          }
          summary={`${filtered.length} of ${slots.length}`}
          initialSort={{ id: "date", dir: "asc" }}
          rowClassName={(s) => (s.status === "cancelled" ? "[&>td]:text-fg-3" : "")}
          emptyTitle="No sessions yet"
          emptyHint={
            studies.length > 0
              ? "Add one above, or generate a run of them."
              : "Sessions belong to a study, and only an active one can hold them. Activate a study and the buttons appear here."
          }
        />
      </Card>
    </>
  );
}
