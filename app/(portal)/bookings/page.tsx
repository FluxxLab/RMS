import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Breadcrumb, PageHeader } from "@/components/fluent";
import { BookingList } from "@/components/portal/booking-list";
import { DataError } from "@/components/ui/data-error";
import { getMyBookings, isParticipant, pageData, readSession } from "@/lib/api";
import { serverNow } from "@/lib/now";

export const metadata: Metadata = { title: "My bookings · BIL Research" };

const CRUMBS = [{ label: "Studies", href: "/" }, { label: "My bookings" }];

export default async function MyBookingsPage() {
  if (!isParticipant(await readSession())) redirect("/sign-in?next=/bookings");

  const result = pageData(await getMyBookings());
  if (!result.ok) return <DataError breadcrumb={CRUMBS} title="My bookings" message={result.message} />;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={CRUMBS} />

      <PageHeader
        title="My bookings"
        description="Cancel any upcoming session yourself; the place is released the moment you do."
      />
      <BookingList rows={result.data} now={serverNow()} />
    </div>
  );
}
