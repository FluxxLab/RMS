"use client";

import { Field, Input, Select } from "@/components/fluent";

/** The engine's bounds, so the form cannot offer what it would refuse. */
export const SESSION_LIMITS = {
  capacity: { min: 1, max: 50 },
  minutes: { min: 15, max: 480 },
};

/** The four things a session is, as a form holds them. */
export interface SessionDraft {
  date: string;
  time: string;
  minutes: string;
  location: string;
  capacity: string;
}

interface SessionFieldsProps {
  draft: SessionDraft;
  onChange: (patch: Partial<SessionDraft>) => void;
  /**
   * The floor on capacity. A session someone is already booked on cannot be
   * shrunk below them, and the API refuses it — so the box refuses it first,
   * with the reason attached rather than arriving as an error afterwards.
   */
  minCapacity?: number;
}

/**
 * Date, time, length, room, places — shared by adding a session and editing
 * one, because they are the same five answers and a second copy would be a
 * second set of bounds to keep in step.
 */
export function SessionFields({ draft, onChange, minCapacity = 1 }: SessionFieldsProps) {
  const floor = Math.max(SESSION_LIMITS.capacity.min, minCapacity);

  return (
    <div className="grid gap-x-4 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
      <Field label="Date">
        {({ id }) => (
          <Input id={id} type="date" value={draft.date} onChange={(e) => onChange({ date: e.target.value })} />
        )}
      </Field>

      <Field label="Starts">
        {({ id }) => (
          <Input id={id} type="time" step={300} value={draft.time} onChange={(e) => onChange({ time: e.target.value })} />
        )}
      </Field>

      <Field label="Length" hint="Minutes.">
        {({ id, describedBy }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            value={draft.minutes}
            onChange={(e) => onChange({ minutes: e.target.value })}
          >
            {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Room">
        {({ id }) => (
          <Input
            id={id}
            value={draft.location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="e.g. Lab A1"
          />
        )}
      </Field>

      <Field
        label="Places"
        hint={minCapacity > 1 ? `At least ${minCapacity} — that many are already booked.` : `1–${SESSION_LIMITS.capacity.max}.`}
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="number"
            aria-describedby={describedBy}
            min={floor}
            max={SESSION_LIMITS.capacity.max}
            value={draft.capacity}
            onChange={(e) => onChange({ capacity: e.target.value })}
          />
        )}
      </Field>
    </div>
  );
}

/** Whether the draft is answerable at all — the API's own rules, checked early. */
export function draftIsReady(draft: SessionDraft, minCapacity = 1): boolean {
  const capacity = Number(draft.capacity);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(draft.date) &&
    /^\d{2}:\d{2}/.test(draft.time) &&
    draft.location.trim().length > 0 &&
    Number.isInteger(capacity) &&
    capacity >= Math.max(SESSION_LIMITS.capacity.min, minCapacity) &&
    capacity <= SESSION_LIMITS.capacity.max
  );
}
