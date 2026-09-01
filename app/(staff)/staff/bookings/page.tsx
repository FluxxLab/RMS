import type { Metadata } from "next";
import { BookingsLedger, type BookingLedgerRow } from "@/components/staff/bookings-ledger";
import { DataError } from "@/components/ui/data-error";
import { getBookings, getSlots, pageData } from "@/lib/api";
import { serverNow } from "@/lib/now";

export const metadata: Metadata = { title: "Bookings ledger · BIL RMS" };

const CRUMBS = [{ label: "Dashboard", href: "/staff/dashboard" }, { label: "Bookings ledger" }];

/**
 * Server page: every reservation, keyed by pseudonym.
 *
 * The API returns a booking's ids rather than its session, so the slot ledger
 * is fetched alongside and joined here — one place, rather than in the table.
 */
export default async function BookingsPage() {
  const [bookingsResult, slotsResult] = await Promise.all([getBookings(), getSlots()]);
  const bookings = pageData(bookingsResult);
  const slots = pageData(slotsResult);
  if (!bookings.ok) return <DataError breadcrumb={CRUMBS} title="Bookings ledger" message={bookings.message} />;
  if (!slots.ok) return <DataError breadcrumb={CRUMBS} title="Bookings ledger" message={slots.message} />;

  const sessionById = new Map(slots.data.map((slot) => [slot.id, slot]));

  const rows: BookingLedgerRow[] = bookings.data.map((booking) => {
    const session = sessionById.get(booking.scheduleId);
    return {
      id: booking.id,
      pid: booking.participantPid,
      status: booking.status,
      studyId: booking.studyId,
      createdAt: booking.createdAt,
      irbCode: session?.irbCode,
      title: session?.title,
      start: session?.start,
      end: session?.end,
      location: session?.location,
    };
  });

  return <BookingsLedger rows={rows} now={serverNow()} />;
}
