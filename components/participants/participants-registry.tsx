import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Breadcrumb, Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/fluent";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, People, PersonProhibited, Tag } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { StatRow, StatTile } from "@/components/ui/stat-tile";
import { VaultNotice } from "@/components/ui/vault-notice";
import { fmtDate } from "@/lib/format";
import type { Page, RegistryRow, RegistrySort, RegistrySummary, SortDir } from "@/lib/participants";

interface ParticipantsRegistryProps {
  rows: RegistryRow[];
  page: Page<RegistryRow>;
  summary: RegistrySummary;
  query: string;
  sort: RegistrySort;
  dir: SortDir;
}

interface Column {
  key: RegistrySort;
  label: string;
  numeric?: boolean;
}

const COLUMNS: Column[] = [
  { key: "pid", label: "Pseudonym" },
  { key: "joined", label: "Joined" },
  { key: "bookings", label: "Bookings", numeric: true },
  { key: "attended", label: "Attended", numeric: true },
  { key: "noShows", label: "No-shows", numeric: true },
  { key: "interests", label: "Interests" },
  { key: "lastActivity", label: "Last activity" },
];

// Numeric columns default to descending (largest first); text to ascending.
function nextDir(column: Column, active: boolean, dir: SortDir): SortDir {
  if (active) return dir === "asc" ? "desc" : "asc";
  return column.numeric ? "desc" : "asc";
}

function SortHeader({ column, query, sort, dir }: { column: Column; query: string; sort: RegistrySort; dir: SortDir }) {
  const active = column.key === sort;
  const target = nextDir(column, active, dir);
  return (
    <Th numeric={column.numeric} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link
        href={{ pathname: "/staff/participants", query: { ...(query ? { q: query } : {}), sort: column.key, dir: target } }}
        className={`inline-flex items-center gap-1 rounded-xs hover:text-fg-1 focus-ring ${active ? "text-fg-1" : ""}`}
      >
        {column.label}
        <ChevronDown
          size={12}
          className={`transition-transform duration-150 ${active ? "" : "opacity-0"} ${active && dir === "asc" ? "rotate-180" : ""}`}
        />
      </Link>
    </Th>
  );
}

function PageLink({
  to,
  disabled,
  label,
  query,
  sort,
  dir,
  icon,
}: {
  to: number;
  disabled: boolean;
  label: string;
  query: string;
  sort: RegistrySort;
  dir: SortDir;
  icon: ReactNode;
}) {
  const shared = "flex size-8 items-center justify-center rounded-md [&>svg]:size-4";
  if (disabled) {
    return (
      <span aria-hidden="true" className={`${shared} text-fg-disabled`}>
        {icon}
      </span>
    );
  }
  return (
    <Link
      aria-label={label}
      href={{ pathname: "/staff/participants", query: { ...(query ? { q: query } : {}), sort, dir, page: to } }}
      className={`${shared} text-fg-2 hover:bg-bg-3 hover:text-fg-1 focus-ring`}
    >
      {icon}
    </Link>
  );
}

/** Pseudonymous participant registry — server-rendered, sortable and paged via URL state. */
export function ParticipantsRegistry({ rows, page, summary, query, sort, dir }: ParticipantsRegistryProps) {
  const filtering = query.trim().length > 0;

  return (
    <section aria-label="Participants registry" className="flex min-w-0 flex-1 flex-col gap-6 p-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/staff/dashboard" }, { label: "Participants registry" }]} />

      <PageHeader
        title="Participants registry"
        actions={
          <p className="text-[14px] leading-[17px] text-field-label">
            {filtering ? `${page.total} of ${summary.registered} match “${query}”` : `${summary.registered} registered`}
          </p>
        }
      />

      <VaultNotice />

      <StatRow>
        <StatTile icon={<People />} label="Registered" value={String(summary.registered)} detail="pseudonyms issued" />
        <StatTile icon={<Calendar />} label="With an upcoming booking" value={String(summary.withUpcoming)} detail="hold a booked slot that has not started" />
        <StatTile icon={<Tag />} label="Registered interests" value={String(summary.withInterests)} detail="available for targeted recruitment" />
        <StatTile icon={<PersonProhibited />} label="No-shows tracked" value={String(summary.noShowsTracked)} detail="cumulative; informs recruitment, no automatic sanction" />
      </StatRow>

      <Card padding="none">
        <CardHeader title="Registry" description="Search by pseudonym or interest tag from the top bar" className="px-4 pb-4 pt-5" />

        {rows.length === 0 ? (
          <div className="border-t border-stroke-3 py-10">
            <EmptyState
              icon={<People />}
              title={filtering ? "No participants match" : "No participants registered"}
              hint={
                filtering
                  ? `No pseudonym or interest tag contains “${query}”. Clear the search to see everyone.`
                  : "Participants appear here as they complete registration in the portal and receive a pseudonym."
              }
            />
          </div>
        ) : (
          <Table>
            <thead>
              <tr className="h-[60px]">
                {COLUMNS.map((column) => (
                  <SortHeader key={column.key} column={column} query={query} sort={sort} dir={dir} />
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.pid} className="h-[76px] transition-colors hover:bg-bg-2">
                  <Td className="whitespace-nowrap">{r.pid}</Td>
                  <Td muted className="whitespace-nowrap">{fmtDate(r.joinedAt)}</Td>
                  <Td numeric>
                    {r.bookings}
                    {r.upcoming > 0 && <span className="ml-1 type-caption text-brand-ink">({r.upcoming} upcoming)</span>}
                  </Td>
                  <Td numeric>{r.attended}</Td>
                  <Td numeric className={r.noShows > 0 ? "text-danger-fg" : ""}>{r.noShows}</Td>
                  <Td>
                    {r.interests.length === 0 ? (
                      <span className="text-fg-4">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {r.interests.map((tag) => (
                          <Badge key={tag} tone="brand" size="sm">
                            {tag}
                          </Badge>
                        ))}
                      </span>
                    )}
                  </Td>
                  <Td muted className="whitespace-nowrap">{r.lastActivity ? fmtDate(r.lastActivity) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {page.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stroke-2 px-4 py-2.5 type-caption text-fg-3">
            <span className="tabular-nums">
              {page.from}–{page.to} of {page.total}
            </span>
            <div className="flex items-center gap-2">
              <PageLink
                to={page.page - 1}
                disabled={page.page === 1}
                label="Previous page"
                query={query}
                sort={sort}
                dir={dir}
                icon={<ChevronLeft />}
              />
              <PageLink
                to={page.page + 1}
                disabled={page.page === page.pageCount}
                label="Next page"
                query={query}
                sort={sort}
                dir={dir}
                icon={<ChevronRight />}
              />
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
