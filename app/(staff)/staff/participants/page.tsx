import type { Metadata } from "next";
import { ParticipantsRegistry } from "@/components/participants/participants-registry";
import { DataError } from "@/components/ui/data-error";
import { getBookings, getParticipants, getSlots, pageData } from "@/lib/api";
import { serverNow } from "@/lib/now";
import {
  buildRegistry,
  filterRegistry,
  isRegistrySort,
  paginate,
  registrySummary,
  sortRegistry,
  type RegistrySort,
  type SortDir,
} from "@/lib/participants";

export const metadata: Metadata = { title: "Participants · BIL RMS" };

const CRUMBS = [{ label: "Dashboard", href: "/staff/dashboard" }, { label: "Participants" }];

const DEFAULT_SORT: RegistrySort = "joined";
const DEFAULT_DIR: SortDir = "desc";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** Server page: search and sort live in the URL so the view needs no client state. */
export default async function ParticipantsPage({ searchParams }: PageProps<"/staff/participants">) {
  const params = await searchParams;
  const query = first(params.q);
  const sortParam = first(params.sort);
  const sort = isRegistrySort(sortParam) ? sortParam : DEFAULT_SORT;
  const dirParam = first(params.dir);
  const dir: SortDir = dirParam === "asc" ? "asc" : dirParam === "desc" ? "desc" : DEFAULT_DIR;

  // Four pseudonym-keyed feeds, joined below. The slot ledger is here only to
  // tell an upcoming session from one that has already run.
  const [profilesResult, bookingsResult, slotsResult] = await Promise.all([
    getParticipants(),
    getBookings(),
    getSlots(),
  ]);

  const profiles = pageData(profilesResult);
  const bookings = pageData(bookingsResult);
  const slots = pageData(slotsResult);

  if (!profiles.ok) return <DataError breadcrumb={CRUMBS} title="Participants" message={profiles.message} />;
  if (!bookings.ok) return <DataError breadcrumb={CRUMBS} title="Participants" message={bookings.message} />;
  if (!slots.ok) return <DataError breadcrumb={CRUMBS} title="Participants" message={slots.message} />;

  const startById = new Map(slots.data.map((slot) => [slot.id, slot.start]));

  const registry = buildRegistry(
    profiles.data,
    bookings.data.map((booking) => ({
      pid: booking.participantPid,
      status: booking.status,
      createdAt: booking.createdAt,
      checkedInAt: booking.checkedInAt,
      start: startById.get(booking.scheduleId),
    })),
    [],
    serverNow(),
  );

  const visible = sortRegistry(filterRegistry(registry, query), sort, dir);
  const page = paginate(visible, Number(first(params.page)) || 1);

  return (
    <ParticipantsRegistry
      rows={page.rows}
      page={page}
      summary={registrySummary(registry)}
      query={query}
      sort={sort}
      dir={dir}
    />
  );
}
