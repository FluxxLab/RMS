"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { rescheduleBooking, reserveSlot, type BookingOutcome } from "@/app/(portal)/actions";
import { Badge, Button, ButtonLink, Card, CardHeader, Checkbox, MessageBar } from "@/components/fluent";
import { Calendar, Location } from "@/components/icons";
import { dayLabel, fmtDate, fmtRange } from "@/lib/format";
import { freePlaces, type SessionRow } from "@/lib/slots";

interface StudyBookingProps {
  /** Each statement the participant must confirm before the engine will book. */
  criteria: string[];
  slots: SessionRow[];
  /** The session the held booking is currently on, so it can be marked. */
  bookedScheduleId?: string | null;
  /** True when the session list could not be read — different from having none. */
  sessionsUnavailable?: boolean;
  /** The engine's verdict on this participant for this study. */
  eligible: boolean;
  missingProfile: boolean;
  signedIn: boolean;
  /** An existing `booked` booking on this study, if any. */
  existingBookingId: string | null;
  now: string;
}

export function StudyBooking({
  criteria,
  slots,
  bookedScheduleId = null,
  sessionsUnavailable = false,
  eligible,
  missingProfile,
  signedIn,
  existingBookingId,
  now,
}: StudyBookingProps) {
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<BookingOutcome | null>(null);
  const [pending, startTransition] = useTransition();

  /*
   * One key per session chosen, kept for as long as that choice stands. A
   * retry after a timeout carries the same key, so the engine recognises it as
   * the same request and cannot create a second booking.
   */
  const keys = useRef(new Map<string, string>());
  const keyFor = (scheduleId: string) => {
    const existing = keys.current.get(scheduleId);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    keys.current.set(scheduleId, fresh);
    return fresh;
  };

  const booked = result?.ok === true;
  // Holding a booking turns this into a move: the statements were confirmed
  // when it was made, and the engine is not asking for them again.
  const moving = existingBookingId !== null;
  // Every statement, individually: a single "I agree" is not the same consent.
  const allConfirmed = criteria.every((c) => confirmed.has(c));
  const chosenIsCurrent = selected !== null && selected === bookedScheduleId;
  const canBook =
    signedIn &&
    eligible &&
    selected !== null &&
    !pending &&
    !booked &&
    (moving ? !chosenIsCurrent : allConfirmed);

  const toggle = (criterion: string) =>
    setConfirmed((prev) => {
      const next = new Set(prev);
      if (next.has(criterion)) next.delete(criterion);
      else next.add(criterion);
      return next;
    });

  const groups = useMemo(() => {
    const out: { label: string; date: string; slots: SessionRow[] }[] = [];
    for (const slot of slots) {
      const label = dayLabel(slot.start, now);
      const last = out.at(-1);
      if (last && last.label === label) last.slots.push(slot);
      else out.push({ label, date: fmtDate(slot.start), slots: [slot] });
    }
    return out;
  }, [slots, now]);

  const book = () => {
    if (!selected) return;
    startTransition(async () => {
      setResult(
        moving
          ? await rescheduleBooking(existingBookingId, selected)
          : await reserveSlot(selected, [...confirmed], keyFor(selected)),
      );
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {!signedIn && (
        <MessageBar
          intent="info"
          title="Sign in to book a session."
          actions={
            <ButtonLink href="/sign-in" variant="primary" size="sm">
              Sign in
            </ButtonLink>
          }
        >
          You can read everything on this page without an account. Booking needs one so we can confirm eligibility.
        </MessageBar>
      )}
      {signedIn && missingProfile && (
        <MessageBar
          intent="warning"
          title="Complete your participant profile so we can confirm eligibility."
          actions={
            <ButtonLink href="/signup" variant="primary" size="sm">
              Complete profile
            </ButtonLink>
          }
        >
          Booking opens once every rule on the scorecard can be checked.
        </MessageBar>
      )}
      {signedIn && !missingProfile && !eligible && (
        <MessageBar intent="error" title="You are not eligible for this study at the moment.">
          The scorecard shows which rule is not met. If your circumstances change, update your profile and check again.
        </MessageBar>
      )}

      {moving && (
        <MessageBar
          intent="success"
          title="You already hold a booking for this study."
          actions={
            <ButtonLink href="/bookings" variant="secondary" size="sm">
              View my bookings
            </ButtonLink>
          }
        >
          Pick another time below to move it, or cancel it from My bookings. Your place is only released once the new one is
          confirmed.
        </MessageBar>
      )}

      {!moving && criteria.length > 0 && (
        <Card padding="lg">
          <CardHeader
            size="panel"
            title="Confirm the inclusion statements"
            description="Each statement must be true for you. Booking stays locked until every one is ticked."
          />
          <div className="mt-5 flex flex-col">
            {criteria.map((criterion) => (
              <Checkbox
                key={criterion}
                label={criterion}
                checked={confirmed.has(criterion)}
                onChange={() => toggle(criterion)}
                disabled={!signedIn || !eligible || booked}
              />
            ))}
          </div>
          <p className="mt-4 text-[14px] leading-[17px] text-field-label">
            {confirmed.size} of {criteria.length} confirmed
          </p>
        </Card>
      )}

      <Card padding="lg">
        <CardHeader
          size="panel"
          title={moving ? "Move to another session" : "Choose a session"}
          description="Times are shown in the lab's local time."
        />
        {sessionsUnavailable ? (
          <p className="mt-5 text-[16px] leading-[22px] text-fg-2" role="alert">
            The session times could not be loaded just now. Reload the page to try again.
          </p>
        ) : groups.length === 0 ? (
          <p className="mt-5 text-[16px] leading-[22px] text-fg-2">
            No sessions are open right now. Register your interest and we will let you know when new sessions are added.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-4" role="radiogroup" aria-label="Available sessions">
            {groups.map((group) => (
              <div key={group.label}>
                <h3 className="mb-2 flex items-center gap-2 text-[14px] leading-[17px] text-field-label">
                  <Calendar size={16} className="text-fg-3" />
                  {group.label}
                  <span className="text-[14px] leading-[17px] text-fg-4">{group.date}</span>
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {group.slots.map((slot) => {
                    const free = freePlaces(slot);
                    const current = slot.id === bookedScheduleId;
                    const disabled = current || free === 0 || !signedIn || !eligible || booked;
                    const active = selected === slot.id;
                    return (
                      <li key={slot.id}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={active}
                          disabled={disabled}
                          onClick={() => setSelected(slot.id)}
                          className={`flex w-full items-center gap-4 rounded-md border px-4 py-3 text-left transition-[border-color,background-color,box-shadow] duration-150 focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                            active
                              ? "border-brand bg-brand-tint-2 shadow-[inset_3px_0_0_0_var(--color-brand)]"
                              : "border-stroke-2 bg-bg-1 hover:border-stroke-1 hover:bg-bg-3"
                          }`}
                        >
                          <span className="w-32 shrink-0 text-[16px] leading-[19px] tabular-nums text-fg-1">
                            {fmtRange(slot.start, slot.end)}
                          </span>
                          <span className="flex items-center gap-1.5 text-[16px] leading-[19px] text-fg-2">
                            <Location size={16} className="text-fg-3" />
                            {slot.location}
                          </span>
                          <span className="ml-auto">
                            {current ? (
                              <Badge tone="brand" size="sm">
                                Your session
                              </Badge>
                            ) : free > 0 ? (
                              <Badge tone={free === 1 ? "warning" : "success"} size="sm">
                                {free} {free === 1 ? "place" : "places"} left
                              </Badge>
                            ) : (
                              <Badge tone="neutral" size="sm">
                                Full
                              </Badge>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      {result && !result.ok && (
        <MessageBar intent="error" title={result.message} live>
          {result.reasons.length > 0 ? (
            <ul className="mt-1 list-disc pl-5">
              {result.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : (
            "Choose another session or try again in a moment."
          )}
        </MessageBar>
      )}
      {booked && (
        <MessageBar
          intent="success"
          title={result?.message ?? "Slot booked. See you soon."}
          live
          actions={
            <ButtonLink href="/bookings" variant="primary" size="sm">
              View my bookings
            </ButtonLink>
          }
        >
          Your booking is recorded against your pseudonym. A confirmation will be sent to the email held in the vault.
        </MessageBar>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] leading-[20px] text-field-label">
          {moving ? (
            <>
              Moving keeps your place until the new one is confirmed.{" "}
              <Link href="/bookings" className="text-brand hover:underline">
                See my bookings
              </Link>
            </>
          ) : (
            <>
              By booking you confirm the statements above are true.{" "}
              <Link href="/profile" className="text-brand hover:underline">
                Review your profile
              </Link>
            </>
          )}
        </p>
        <Button variant="primary" size="lg" onClick={book} disabled={!canBook} loading={pending}>
          {booked ? "Done" : moving ? "Move to this session" : "Book this session"}
        </Button>
      </div>
    </div>
  );
}
