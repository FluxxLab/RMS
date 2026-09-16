import { describe, expect, it } from "vitest";
import {
  dateInputValue,
  dayLabel,
  fmtDate,
  fmtDateTime,
  fmtRange,
  fmtTime,
  fromDateTimeInputs,
  isSameDay,
  minutesBetween,
  plusMinutes,
  timeInputValue,
} from "../format";

/*
 * The API transports UTC; fixtures carry a bare wall-clock. Both must render
 * the same string on a server and in a browser, whatever zone either sits in.
 */

describe("FR-SCH-090 timestamps render in the lab's zone", () => {
  it("reads a bare stamp literally", () => {
    expect(fmtTime("2026-08-27T09:05:00")).toBe("09:05");
    expect(fmtDate("2026-08-27T09:05:00")).toBe("Thu 27 Aug");
  });

  it("reads a UTC stamp from the API the same way", () => {
    expect(fmtTime("2026-08-27T09:05:00.000Z")).toBe("09:05");
    expect(fmtDate("2026-08-27T09:05:00.000Z")).toBe("Thu 27 Aug");
  });

  it("converts a stamp carrying an offset back to the lab's zone", () => {
    // 11:05 at +02:00 is 09:05 UTC.
    expect(fmtTime("2026-08-27T11:05:00+02:00")).toBe("09:05");
    // 23:30 at -05:00 is 04:30 the next day.
    expect(fmtDateTime("2026-08-27T23:30:00-05:00")).toBe("Fri 28 Aug · 04:30");
  });

  it("does not drift with the machine's timezone", () => {
    const original = process.env.TZ;
    const render = (tz: string) => {
      process.env.TZ = tz;
      return `${fmtDate("2026-08-27T23:30:00.000Z")} ${fmtTime("2026-08-27T23:30:00.000Z")}`;
    };

    const inTokyo = render("Asia/Tokyo");
    const inLA = render("America/Los_Angeles");
    process.env.TZ = original;

    expect(inTokyo).toBe(inLA);
  });

  it("ranges and same-day checks follow the same clock", () => {
    expect(fmtRange("2026-08-27T09:00:00Z", "2026-08-27T09:45:00Z")).toBe("09:00–09:45");
    expect(isSameDay("2026-08-27T00:30:00Z", "2026-08-27T23:30:00Z")).toBe(true);
    expect(isSameDay("2026-08-27T23:30:00Z", "2026-08-28T00:30:00Z")).toBe(false);
  });

  it("labels whole days relative to now", () => {
    const now = "2026-08-27T09:30:00Z";
    expect(dayLabel("2026-08-27T18:00:00Z", now)).toBe("Today");
    expect(dayLabel("2026-08-28T06:00:00Z", now)).toBe("Tomorrow");
    expect(dayLabel("2026-08-26T06:00:00Z", now)).toBe("Yesterday");
    expect(dayLabel("2026-09-03T06:00:00Z", now)).toBe("Thu 3 Sep");
  });
});

/*
 * The edit form reads a session into two boxes and writes them back, so what
 * matters is that the round trip lands on the same instant. A form that loses
 * half an hour on open and saves it back is the kind of bug that only shows up
 * as a participant arriving at the wrong time.
 */
describe("the form's date and time boxes", () => {
  it("round-trips a timestamp through the two boxes unchanged", () => {
    const iso = "2026-10-01T14:30:00.000Z";

    const back = fromDateTimeInputs(dateInputValue(iso), timeInputValue(iso));

    expect(back).toBe(iso);
  });

  it("splits a timestamp into the shapes the inputs require", () => {
    expect(dateInputValue("2026-01-05T09:00:00Z")).toBe("2026-01-05");
    expect(timeInputValue("2026-01-05T09:05:00Z")).toBe("09:05");
  });

  it("refuses a half-typed date rather than inventing one", () => {
    expect(fromDateTimeInputs("2026-10", "09:00")).toBeNull();
    expect(fromDateTimeInputs("2026-10-01", "")).toBeNull();
  });

  it("measures a session's length in minutes", () => {
    expect(minutesBetween("2026-10-01T09:00:00Z", "2026-10-01T09:30:00Z")).toBe(30);
    expect(minutesBetween("2026-10-01T23:30:00Z", "2026-10-02T00:30:00Z")).toBe(60);
  });

  it("moves an instant on, across a midnight", () => {
    expect(plusMinutes("2026-10-01T23:45:00Z", 30)).toBe("2026-10-02T00:15:00.000Z");
  });
});
