const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/*
 * Hand-rolled formatters so server and client render byte-identical strings.
 *
 * Timestamps arrive two ways: the API transports UTC ("…T09:00:00Z"), while
 * fixtures carry a bare wall-clock ("…T09:00:00"). Both are rendered in the
 * lab's configured zone (FR-SCH-090) rather than the machine's, because
 * getHours() would otherwise give a different answer on a server in one zone
 * and a browser in another — and hydration would not match.
 */

/** The lab's zone as a fixed offset from UTC, in minutes. */
const LAB_UTC_OFFSET_MINUTES = 0;

const pad = (n: number) => String(n).padStart(2, "0");

interface Parts {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hours: number;
  minutes: number;
}

const STAMP = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

/**
 * Breaks a timestamp into the lab's wall-clock parts. A bare stamp is already
 * lab time and is read literally; one carrying a zone is converted.
 */
function labParts(iso: string): Parts {
  const match = STAMP.exec(iso.trim());

  if (match) {
    const [, y, mo, d, h, mi, s, zone] = match;
    if (!zone) {
      const at = Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0);
      return partsFromUtc(at);
    }
    const offset =
      zone === "Z" ? 0 : (zone[0] === "-" ? -1 : 1) * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(-2)));
    return partsFromUtc(Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0) - offset * 60_000 + LAB_UTC_OFFSET_MINUTES * 60_000);
  }

  // Anything else: let the platform parse it, then shift into the lab's zone.
  return partsFromUtc(new Date(iso).getTime() + LAB_UTC_OFFSET_MINUTES * 60_000);
}

function partsFromUtc(epochMs: number): Parts {
  const d = new Date(epochMs);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    weekday: d.getUTCDay(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
  };
}

export function fmtTime(iso: string): string {
  const p = labParts(iso);
  return `${pad(p.hours)}:${pad(p.minutes)}`;
}

export function fmtDate(iso: string): string {
  const p = labParts(iso);
  return `${DAYS[p.weekday]} ${p.day} ${MONTHS[p.month]}`;
}

export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}

export function fmtRange(startIso: string, endIso: string): string {
  return `${fmtTime(startIso)}–${fmtTime(endIso)}`;
}

export function isSameDay(a: string, b: string): boolean {
  const x = labParts(a);
  const y = labParts(b);
  return x.year === y.year && x.month === y.month && x.day === y.day;
}

/** Midnight of the timestamp's lab day, as an epoch, for whole-day arithmetic. */
function startOfDay(iso: string): number {
  const p = labParts(iso);
  return Date.UTC(p.year, p.month, p.day);
}

/** "Today", "Tomorrow", "Yesterday" or a short date, relative to `now`. */
export function dayLabel(iso: string, now: string): string {
  const diffDays = Math.round((startOfDay(iso) - startOfDay(now)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return fmtDate(iso);
}

/** Compact relative-or-clock stamp for the list column, Outlook style. */
export function listStamp(iso: string, now: string): string {
  return isSameDay(iso, now) ? fmtTime(iso) : fmtDate(iso);
}

/** Last block of a PID, used as an avatar label. */
export function pidShort(pid: string): string {
  return pid.split("/").at(-1) ?? pid;
}

/*
 * The other direction: a timestamp into the two values a form edits, and back.
 *
 * Everything above renders in the lab's zone, so the form has to read and
 * write in it too. Going through the machine's local zone instead — which is
 * what `<input type="datetime-local">` does on its own — would show an
 * operator in Lagos a different time than the table beside it once the lab's
 * offset is anything but zero.
 */

/** The date part, as `<input type="date">` wants it. */
export function dateInputValue(iso: string): string {
  const p = labParts(iso);
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}`;
}

/** The clock part, as `<input type="time">` wants it. */
export function timeInputValue(iso: string): string {
  const p = labParts(iso);
  return `${pad(p.hours)}:${pad(p.minutes)}`;
}

/** Minutes between two timestamps, which is how a form asks for a duration. */
export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
}

/**
 * A date and a clock reading, both lab time, as the UTC instant the API stores.
 * Returns null rather than an Invalid Date when either box is empty or partial.
 */
export function fromDateTimeInputs(date: string, time: string): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})/.exec(time);
  if (!d || !t) return null;

  const at = Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2]) - LAB_UTC_OFFSET_MINUTES * 60_000;
  return Number.isFinite(at) ? new Date(at).toISOString() : null;
}

/** That instant, moved on by a number of minutes. */
export function plusMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}
