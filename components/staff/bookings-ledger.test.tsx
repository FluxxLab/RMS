// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "@/lib/testing/axe";
import { BookingsLedger, type BookingLedgerRow } from "./bookings-ledger";

/*
 * The bookings ledger is the staff surface a participant is most visible on,
 * so it is where the privacy rule is worth asserting rather than assuming.
 */

// The ledger's row menu calls a superadmin action; the server is not the
// subject here, so it is stubbed to keep the test to what is rendered.
vi.mock("@/app/(admin)/admin/actions", () => ({
  setBookingStatus: vi.fn(async () => ({ ok: true, message: "Booking updated." })),
}));

const NOW = "2026-08-27T09:30:00Z";

const rows: BookingLedgerRow[] = [
  {
    id: "b1",
    pid: "PIC/2026/LABS/A7K2M",
    status: "booked",
    studyId: "std-1",
    createdAt: "2026-08-25T09:00:00Z",
    irbCode: "IRB-2026-0142",
    title: "Defaults and everyday choices",
    start: "2026-08-28T10:00:00Z",
    end: "2026-08-28T10:30:00Z",
    location: "Lab A1",
  },
  {
    id: "b2",
    pid: "PIC/2026/LABS/B3QXP",
    status: "attended",
    studyId: "std-1",
    createdAt: "2026-08-20T09:00:00Z",
    irbCode: "IRB-2026-0142",
    title: "Defaults and everyday choices",
    start: "2026-08-26T10:00:00Z",
    end: "2026-08-26T10:30:00Z",
    location: "Lab A1",
  },
];

describe("AT-04 staff screens render pseudonyms only", () => {
  it("identifies every participant by pseudonym", () => {
    render(<BookingsLedger rows={rows} now={NOW} />);
    expect(screen.getByText("PIC/2026/LABS/A7K2M")).toBeDefined();
    expect(screen.getByText("PIC/2026/LABS/B3QXP")).toBeDefined();
  });

  it("carries no name or email anywhere in the rendered view", () => {
    const { container } = render(<BookingsLedger rows={rows} now={NOW} />);
    const rendered = container.textContent ?? "";

    // Not a name, not an address, and no field that could hold one.
    expect(rendered).not.toMatch(/@/);
    expect(container.innerHTML).not.toMatch(/\b(name|email)="/i);
    expect(screen.queryByText(/full name/i)).toBeNull();
  });

  it("FR-OPS-060 states that identity is held separately", () => {
    render(<BookingsLedger rows={rows} now={NOW} />);
    expect(screen.getByText(/identity vault/i)).toBeDefined();
  });
});

describe("FR-OPS-080 the bookings ledger explains an empty view", () => {
  it("names the action that would populate it", () => {
    render(<BookingsLedger rows={[]} now={NOW} />);
    expect(screen.getByText("No bookings yet")).toBeDefined();
    expect(screen.getByText(/appear here the moment a participant books/i)).toBeDefined();
  });
});

describe("NFR-USE-010 the bookings ledger meets WCAG 2.2 AA", () => {
  it("raises no automated accessibility violation", async () => {
    const { container } = render(<BookingsLedger rows={rows} now={NOW} />);
    expect(await axe(container)).toEqual([]);
  });
});
