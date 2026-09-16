"use client";

import type { BulkScheduleInput } from "@/lib/api";
import { Field, Input, Select } from "@/components/fluent";

/** A study the generator can schedule against. */
export interface SchedulableStudy {
  id: string;
  irbCode: string;
  title: string;
  durationMinutes: number;
}

/** The generator's limits, as the engine enforces them. */
const LIMITS = {
  capacityPerSlot: { min: 1, max: 50 },
  daysAhead: { min: 1, max: 90 },
  startHour: { min: 0, max: 23 },
  slotsPerDay: { min: 1, max: 24 },
  slotLengthMinutes: { min: 15, max: 480 },
};

function clamp(value: string, { min, max }: { min: number; max: number }): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : min;
}

/** Pads to a 24-hour clock reading, e.g. 9 → "09:00". */
function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** What the generator form holds, before it is clamped into an engine request. */
export interface GenerateDraft {
  studyId: string;
  location: string;
  capacity: string;
  days: string;
  startHour: string;
  perDay: string;
  length: string;
}

export function emptyGenerateDraft(studies: SchedulableStudy[]): GenerateDraft {
  return {
    studyId: studies[0]?.id ?? "",
    location: "Lab A1",
    capacity: "2",
    days: "5",
    startHour: "9",
    perDay: "4",
    length: "30",
  };
}

/** The draft as the engine takes it — every number inside the bounds above. */
export function toBulkInput(draft: GenerateDraft): BulkScheduleInput {
  return {
    studyId: draft.studyId,
    location: draft.location.trim(),
    capacityPerSlot: clamp(draft.capacity, LIMITS.capacityPerSlot),
    daysAhead: clamp(draft.days, LIMITS.daysAhead),
    startHour: clamp(draft.startHour, LIMITS.startHour),
    slotsPerDay: clamp(draft.perDay, LIMITS.slotsPerDay),
    slotLengthMinutes: clamp(draft.length, LIMITS.slotLengthMinutes),
  };
}

export function generateIsReady(draft: GenerateDraft): boolean {
  return draft.studyId !== "" && draft.location.trim().length > 0;
}

/**
 * How many sessions the current answers would produce, said in words before
 * the button is pressed — twenty sessions is not a thing to discover afterwards.
 */
export function generateSummary(draft: GenerateDraft): string {
  const input = toBulkInput(draft);
  const total = input.slotsPerDay * input.daysAhead;
  const endHour = input.startHour + Math.ceil((input.slotsPerDay * input.slotLengthMinutes) / 60);

  return `${total} ${total === 1 ? "session" : "sessions"} · ${input.slotsPerDay} a day from ${hourLabel(input.startHour)} to about ${hourLabel(Math.min(24, endHour))} · ${input.capacityPerSlot * total} places in total`;
}

interface GenerateFieldsProps {
  studies: SchedulableStudy[];
  draft: GenerateDraft;
  onChange: (patch: Partial<GenerateDraft>) => void;
}

/**
 * The generator's form: a regular grid of sessions, described rather than
 * drawn. The shape is the engine's — so many a day, of one length, for so many
 * days from tomorrow — so the form offers exactly that and nothing it would
 * refuse.
 */
export function GenerateFields({ studies, draft, onChange }: GenerateFieldsProps) {
  const study = studies.find((s) => s.id === draft.studyId);

  return (
    <div className="grid gap-x-4 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
      <Field label="Study" className="[grid-column:1/-1]">
        {({ id }) => (
          <Select id={id} value={draft.studyId} onChange={(e) => onChange({ studyId: e.target.value })}>
            {studies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.irbCode} · {s.title}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Room">
        {({ id }) => <Input id={id} value={draft.location} onChange={(e) => onChange({ location: e.target.value })} />}
      </Field>

      <Field label="Places per session" hint={`${LIMITS.capacityPerSlot.min}–${LIMITS.capacityPerSlot.max}`}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="number"
            aria-describedby={describedBy}
            min={LIMITS.capacityPerSlot.min}
            max={LIMITS.capacityPerSlot.max}
            value={draft.capacity}
            onChange={(e) => onChange({ capacity: e.target.value })}
          />
        )}
      </Field>

      <Field label="Days to cover" hint="Counting forward from tomorrow.">
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="number"
            aria-describedby={describedBy}
            min={LIMITS.daysAhead.min}
            max={LIMITS.daysAhead.max}
            value={draft.days}
            onChange={(e) => onChange({ days: e.target.value })}
          />
        )}
      </Field>

      <Field label="First session at" hint="On the hour.">
        {({ id, describedBy }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            value={draft.startHour}
            onChange={(e) => onChange({ startHour: e.target.value })}
          >
            {Array.from({ length: 24 }, (_, hour) => (
              <option key={hour} value={hour}>
                {hourLabel(hour)}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Sessions per day" hint={`${LIMITS.slotsPerDay.min}–${LIMITS.slotsPerDay.max}`}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="number"
            aria-describedby={describedBy}
            min={LIMITS.slotsPerDay.min}
            max={LIMITS.slotsPerDay.max}
            value={draft.perDay}
            onChange={(e) => onChange({ perDay: e.target.value })}
          />
        )}
      </Field>

      <Field
        label="Session length"
        hint={study ? `The study's protocol runs ${study.durationMinutes} minutes.` : "In minutes."}
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="number"
            aria-describedby={describedBy}
            min={LIMITS.slotLengthMinutes.min}
            max={LIMITS.slotLengthMinutes.max}
            step={15}
            value={draft.length}
            onChange={(e) => onChange({ length: e.target.value })}
          />
        )}
      </Field>
    </div>
  );
}
