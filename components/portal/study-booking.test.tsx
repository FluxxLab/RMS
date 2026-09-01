// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "@/lib/testing/axe";
import { StudyBooking } from "./study-booking";
import type { SessionRow } from "@/lib/slots";

/*
 * Booking is the one place the browser holds a gate of its own. The engine
 * re-decides everything on submit, so what is asserted here is the courtesy:
 * that the control cannot be reached until each statement has been confirmed.
 */

vi.mock("@/app/(portal)/actions", () => ({
  reserveSlot: vi.fn(async () => ({ ok: true, message: "Slot booked. See you soon.", reasons: [] })),
  rescheduleBooking: vi.fn(async () => ({ ok: true, message: "Booking moved.", reasons: [] })),
}));

const NOW = "2026-08-27T09:30:00Z";

const CRITERIA = [
  "I have not taken part in this study before.",
  "I can travel to the lab unaccompanied.",
];

const SESSIONS: SessionRow[] = [
  {
    id: "sch-1",
    start: "2026-08-28T09:00:00Z",
    end: "2026-08-28T09:30:00Z",
    location: "Lab A1",
    maxCapacity: 2,
    taken: 0,
    status: "available",
  },
];

function eligible(overrides: Partial<React.ComponentProps<typeof StudyBooking>> = {}) {
  return (
    <StudyBooking
      criteria={CRITERIA}
      slots={SESSIONS}
      eligible
      missingProfile={false}
      signedIn
      existingBookingId={null}
      now={NOW}
      {...overrides}
    />
  );
}

describe("FR-BKG-030 booking is locked until every statement is confirmed", () => {
  it("AT-07 keeps the control disabled while a statement is unticked", async () => {
    const user = userEvent.setup();
    render(eligible());

    await user.click(screen.getByRole("radio", { name: /Lab A1/ }));
    const book = screen.getByRole("button", { name: /Book this session/ });
    expect(book).toHaveProperty("disabled", true);

    await user.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText("1 of 2 confirmed")).toBeDefined();
    expect(book).toHaveProperty("disabled", true);

    await user.click(screen.getAllByRole("checkbox")[1]);
    expect(screen.getByText("2 of 2 confirmed")).toBeDefined();
    expect(book).toHaveProperty("disabled", false);
  });

  it("keeps it disabled while no session is chosen, however many are ticked", async () => {
    const user = userEvent.setup();
    render(eligible());

    for (const box of screen.getAllByRole("checkbox")) await user.click(box);
    expect(screen.getByRole("button", { name: /Book this session/ })).toHaveProperty("disabled", true);
  });

  it("offers one checkbox per statement, not a single blanket agreement", () => {
    render(eligible());
    expect(screen.getAllByRole("checkbox")).toHaveLength(CRITERIA.length);
    for (const statement of CRITERIA) expect(screen.getByLabelText(statement)).toBeDefined();
  });
});

describe("FR-SCR-090 the engine's verdict is what closes the gate", () => {
  it("refuses booking outright when the engine says not eligible", () => {
    render(eligible({ eligible: false }));
    expect(screen.getByText(/not eligible for this study/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Book this session/ })).toHaveProperty("disabled", true);
  });

  it("asks an incomplete profile to be finished rather than guessing at eligibility", () => {
    render(eligible({ eligible: false, missingProfile: true }));
    expect(screen.getByText(/Complete your participant profile/i)).toBeDefined();
  });

  it("asks a guest to sign in instead of offering a booking it cannot make", () => {
    render(eligible({ signedIn: false, eligible: false }));
    expect(screen.getByText("Sign in to book a session.")).toBeDefined();
  });
});

describe("a held booking turns the panel into a move", () => {
  it("marks the session already held and does not ask for the statements again", () => {
    render(eligible({ existingBookingId: "bkg-1", bookedScheduleId: "sch-1" }));

    expect(screen.getByText("Move to another session")).toBeDefined();
    expect(screen.getByText("Your session")).toBeDefined();
    expect(screen.queryByText("Confirm the inclusion statements")).toBeNull();
    expect(screen.getByRole("radio", { name: /Lab A1/ })).toHaveProperty("disabled", true);
  });
});

describe("NFR-USE-010 the booking panel meets WCAG 2.2 AA", () => {
  it("raises no automated accessibility violation", async () => {
    const { container } = render(eligible());
    expect(await axe(container)).toEqual([]);
  });
});
