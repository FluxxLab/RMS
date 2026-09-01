"use client";

import { useState } from "react";
import { createSessions } from "@/app/(admin)/admin/actions";
import { Button, ButtonLink, Card, CardHeader, Field, Input, Select } from "@/components/fluent";
import { Book } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { useAdminAction } from "./use-admin-action";
import { AdminNotice } from "./admin-notice";

/** A study the generator can schedule against. */
export interface SchedulableStudy {
  id: string;
  irbCode: string;
  title: string;
  durationMinutes: number;
}

interface SessionsPanelProps {
  studies: SchedulableStudy[];
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

/**
 * Generates a regular grid of sessions. The shape is the engine's: so many
 * sessions a day, of one length, for so many days from tomorrow — this form
 * offers exactly that and nothing it would refuse.
 */
export function SessionsPanel({ studies }: SessionsPanelProps) {
  const { notice, dismiss, pending, run } = useAdminAction();
  const [studyId, setStudyId] = useState(studies[0]?.id ?? "");
  const [location, setLocation] = useState("Lab A1");
  const [capacity, setCapacity] = useState("2");
  const [days, setDays] = useState("5");
  const [startHour, setStartHour] = useState("9");
  const [perDay, setPerDay] = useState("4");
  const [length, setLength] = useState("30");

  const study = studies.find((s) => s.id === studyId);

  const input = {
    studyId,
    location: location.trim(),
    capacityPerSlot: clamp(capacity, LIMITS.capacityPerSlot),
    daysAhead: clamp(days, LIMITS.daysAhead),
    startHour: clamp(startHour, LIMITS.startHour),
    slotsPerDay: clamp(perDay, LIMITS.slotsPerDay),
    slotLengthMinutes: clamp(length, LIMITS.slotLengthMinutes),
  };

  const total = input.slotsPerDay * input.daysAhead;
  const endHour = input.startHour + Math.ceil((input.slotsPerDay * input.slotLengthMinutes) / 60);
  const ready = studyId !== "" && input.location.length > 0;

  if (studies.length === 0) {
    return (
      <Card padding="lg" className="py-10">
        <EmptyState
          icon={<Book />}
          title="No study can take sessions yet"
          hint="Sessions belong to a study, and only an active or paused one can hold them. Author a study first and it appears here."
          action={
            <ButtonLink href="/admin/studies/new" variant="primary">
              Author a study
            </ButtonLink>
          }
        />
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <CardHeader title="Generate sessions" description="A regular grid of sessions, created in one pass" />

      <form
        className="mt-5 flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createSessions(input));
        }}
      >
        <div className="grid gap-x-6 gap-y-5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
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

          <Field label="Room">
            {({ id }) => <Input id={id} value={location} onChange={(e) => setLocation(e.target.value)} />}
          </Field>

          <Field label="Places per session" hint={`${LIMITS.capacityPerSlot.min}–${LIMITS.capacityPerSlot.max}`}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="number"
                aria-describedby={describedBy}
                min={LIMITS.capacityPerSlot.min}
                max={LIMITS.capacityPerSlot.max}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
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
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            )}
          </Field>

          <Field label="First session at" hint="On the hour.">
            {({ id, describedBy }) => (
              <Select id={id} aria-describedby={describedBy} value={startHour} onChange={(e) => setStartHour(e.target.value)}>
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
                value={perDay}
                onChange={(e) => setPerDay(e.target.value)}
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
                value={length}
                onChange={(e) => setLength(e.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-[14px] leading-[20px] text-field-label">
            {total} {total === 1 ? "session" : "sessions"} · {input.slotsPerDay} a day from {hourLabel(input.startHour)} to about{" "}
            {hourLabel(Math.min(24, endHour))} · {input.capacityPerSlot * total} places in total
          </p>

          <Button type="submit" variant="primary" loading={pending} disabled={!ready}>
            Generate {total} session{total === 1 ? "" : "s"}
          </Button>
        </div>
      </form>

      <div className="mt-5">
        <AdminNotice notice={notice} onDismiss={dismiss} />
      </div>
    </Card>
  );
}
