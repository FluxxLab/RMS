"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "@/components/icons";
import { Button } from "./button";
import { Input, Select } from "./field";

export interface DataColumn<T> {
  id: string;
  header: string;
  /** One value per cell. Return plain text or a single element. */
  cell: (row: T) => ReactNode;
  /** Enables sorting; return a string or number. */
  sortValue?: (row: T) => string | number;
  numeric?: boolean;
  /** Fixed width (any CSS length). Text columns without a width share the remaining space and truncate. */
  width?: string;
  /** Hide the column below a breakpoint to keep narrow layouts readable. */
  hideBelow?: "md" | "lg" | "xl" | "2xl";
  /**
   * Right-aligned actions column with a visually hidden header. Controls are
   * never truncated, so give the column a width that fits its widest label.
   */
  actions?: boolean;
  /** Allow this column's text to wrap instead of truncating. */
  wrap?: boolean;
}

export interface SortState {
  id: string;
  dir: "asc" | "desc";
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  rowId: (row: T) => string;
  /** Text to match the toolbar search against. Omit to hide search. */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  /** Extra toolbar controls (filters) rendered after the search box. */
  toolbar?: ReactNode;
  /** Summary shown at the toolbar's right edge. */
  summary?: ReactNode;
  initialSort?: SortState;
  pageSizeOptions?: number[];
  initialPageSize?: number;
  emptyTitle: string;
  emptyHint?: string;
  rowClassName?: (row: T) => string;
  /** Accessible name for the table. */
  label: string;
}

const HIDE = { md: "max-md:hidden", lg: "max-lg:hidden", xl: "max-xl:hidden", "2xl": "max-2xl:hidden" } as const;

function compare(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

/**
 * Fluent data table: toolbar (search + filters + summary), sortable sticky
 * header, 48px rows with a single value per cell, empty state and a
 * pagination footer. Sorting, search and paging run client-side.
 */
export function DataTable<T>({
  columns,
  rows,
  rowId,
  searchText,
  searchPlaceholder = "Search",
  toolbar,
  summary,
  initialSort,
  pageSizeOptions = [5, 10, 25, 50],
  initialPageSize = 5,
  emptyTitle,
  emptyHint,
  rowClassName,
  label,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(0);
  const searchId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !searchText) return rows;
    return rows.filter((r) => searchText(r).toLowerCase().includes(q));
  }, [rows, query, searchText]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortValue) return filtered;
    const sign = sort.dir === "asc" ? 1 : -1;
    const value = col.sortValue;
    return [...filtered].sort((a, b) => compare(value(a), value(b)) * sign || rowId(a).localeCompare(rowId(b)));
  }, [filtered, sort, columns, rowId]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  const toggleSort = (col: DataColumn<T>) => {
    if (!col.sortValue) return;
    setPage(0);
    setSort((prev) =>
      prev?.id === col.id ? { id: col.id, dir: prev.dir === "asc" ? "desc" : "asc" } : { id: col.id, dir: col.numeric ? "desc" : "asc" },
    );
  };

  const align = (col: DataColumn<T>) => (col.numeric || col.actions ? "text-right" : "text-left");

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      {(searchText || toolbar || summary) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-stroke-2 px-4 py-3">
          {searchText && (
            <label htmlFor={searchId} className="relative block w-full sm:w-72">
              <span className="sr-only">{searchPlaceholder}</span>
              <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-field-label" />
              <Input
                id={searchId}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="pl-11"
              />
            </label>
          )}
          {toolbar}
          {summary && <div className="ml-auto type-caption text-fg-3">{summary}</div>}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-[14px] leading-[19px]" aria-label={label}>
          <colgroup>
            {columns.map((col) => (
              <col key={col.id} style={col.width ? { width: col.width } : undefined} className={col.hideBelow ? HIDE[col.hideBelow] : ""} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="h-[60px]">
              {columns.map((col) => {
                const active = sort?.id === col.id;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    aria-sort={col.sortValue ? (active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none") : undefined}
                    className={`whitespace-nowrap border-b-[0.6px] border-[#d5d5d5] bg-[#fcfdfd] px-4 font-normal uppercase text-[#202224]/90 ${align(col)} ${col.hideBelow ? HIDE[col.hideBelow] : ""}`}
                  >
                    {col.actions ? (
                      <span className="sr-only">{col.header}</span>
                    ) : col.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        className={`inline-flex h-[60px] items-center gap-1 rounded-xs hover:text-[#202224] focus-ring ${active ? "text-[#202224]" : ""}`}
                      >
                        {col.header}
                        <ChevronDown
                          size={12}
                          className={`transition-transform duration-150 ${active ? "" : "opacity-0"} ${active && sort!.dir === "asc" ? "rotate-180" : ""}`}
                        />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <p className="type-body-strong text-fg-1">{query ? `No rows match “${query}”` : emptyTitle}</p>
                  {(emptyHint || query) && (
                    <p className="mt-1 type-caption text-fg-3">{query ? "Try a different word or clear the search." : emptyHint}</p>
                  )}
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={rowId(row)} className={`h-[76px] transition-colors hover:bg-bg-2 ${rowClassName?.(row) ?? ""}`}>
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={`border-b-[0.4px] border-[#979797]/60 px-4 align-middle text-[#202224]/90 ${col.wrap || col.actions ? "whitespace-nowrap" : "truncate whitespace-nowrap"} ${col.numeric ? "tabular-nums" : ""} ${align(col)} ${col.hideBelow ? HIDE[col.hideBelow] : ""}`}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 type-caption text-fg-3">
        <label className="flex items-center gap-2">
          Rows per page
          <Select
            value={String(pageSize)}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            size="sm"
            className="w-20"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex items-center gap-2">
          <span className="tabular-nums">
            {sorted.length === 0 ? "0" : `${start + 1}–${Math.min(start + pageSize, sorted.length)}`} of {sorted.length}
          </span>
          <Button variant="subtle" size="sm" aria-label="Previous page" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} icon={<ChevronLeft />} />
          <Button variant="subtle" size="sm" aria-label="Next page" disabled={safePage >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} icon={<ChevronRight />} />
        </div>
      </div>
    </div>
  );
}
