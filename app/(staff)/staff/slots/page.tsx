import type { Metadata } from "next";
import { SlotLedger } from "@/components/staff/slot-ledger";
import { DataError } from "@/components/ui/data-error";
import { getSlots, pageData } from "@/lib/api";
import { serverNow } from "@/lib/now";
import { toSlotRow } from "@/lib/slots";

export const metadata: Metadata = { title: "Slot ledger · BIL RMS" };

const CRUMBS = [{ label: "Dashboard", href: "/staff/dashboard" }, { label: "Slot ledger" }];

/** Server page: every schedule with its occupancy against capacity. */
export default async function SlotsPage() {
  const result = pageData(await getSlots());
  if (!result.ok) return <DataError breadcrumb={CRUMBS} title="Slot ledger" message={result.message} />;

  return <SlotLedger slots={result.data.map(toSlotRow)} now={serverNow()} />;
}
