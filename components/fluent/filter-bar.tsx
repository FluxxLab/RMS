"use client";

import { ArrowSync, Filter } from "@/components/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/*
 * "Filter" frame: one bar, #F9F9FB on a 0.6px #D5D5D5 outline at 10px radius,
 * its segments divided by 0.3px #979797 rules at 69%. Labels 14/19 #202224;
 * the reset step is #EA0234 with a replay glyph.
 *
 * The frame's #EA0234 becomes the app's danger token — resetting is the one
 * destructive-ish step here and it should read like every other one. Each
 * segment is a shadcn/Radix Select, so the menu is a real listbox rather than
 * the browser's own control, and it can be styled to match the app.
 */

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSpec {
  id: string;
  /** Shown when nothing is chosen, e.g. "Order Status" in the frame. */
  label: string;
  value: string;
  /** The value that counts as "not filtering". */
  allValue: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

interface FilterBarProps {
  filters: FilterSpec[];
  onReset: () => void;
}

const RULE = "w-px shrink-0 self-stretch bg-[#979797]/[0.69]";
const LABEL = "text-[14px] leading-[19px] text-[#202224]";

export function FilterBar({ filters, onReset }: FilterBarProps) {
  const filtering = filters.some((f) => f.value !== f.allValue);

  return (
    <div className="flex min-h-[54px] flex-wrap items-stretch overflow-hidden rounded-[10px] border-[0.6px] border-[#d5d5d5] bg-[#f9f9fb]">
      <span aria-hidden="true" className="flex items-center px-4 text-[#202224] [&>svg]:size-5">
        <Filter />
      </span>
      <span className={RULE} />
      <span className={`flex items-center px-4 ${LABEL}`}>Filter By</span>

      {filters.map((filter) => (
        <div key={filter.id} className="flex items-stretch">
          <span className={RULE} />
          <Select value={filter.value} onValueChange={filter.onChange}>
            {/* The bar supplies the chrome, so the trigger drops its own. */}
            <SelectTrigger
              aria-label={filter.label}
              className="h-full min-w-[9rem] rounded-none border-0 bg-transparent px-4 focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={filter.allValue}>{filter.label}</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      <span className={RULE} />
      <button
        type="button"
        onClick={onReset}
        disabled={!filtering}
        className="flex items-center gap-2 px-4 text-[14px] leading-[19px] text-danger-fg hover:bg-danger-bg focus-ring disabled:text-fg-disabled disabled:hover:bg-transparent [&>svg]:size-4"
      >
        <ArrowSync aria-hidden="true" />
        Reset Filter
      </button>
    </div>
  );
}
