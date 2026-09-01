import type { ReactNode } from "react";

export interface Step {
  name: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  /** Zero-based index of the current step. */
  current: number;
  /** Rendered on the counter's row, so the two share a line instead of stacking. */
  title?: ReactNode;
  className?: string;
}

/*
 * Stepper (Figma): counter right-aligned, 16px above the bar.
 *   "Step 1 of 4"  — 14/17, weight 500, brand
 *   barContainer   — 12px tall; 6px track (brand tint, radius 20) under a
 *                    12px brand bar (radius 20)
 */
export function Stepper({ steps, current, title, className = "" }: StepperProps) {
  const pct = ((current + 1) / steps.length) * 100;
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-baseline justify-between gap-4">
        {title ?? <span />}
        <p className="shrink-0 text-[14px] font-medium leading-[17px] text-brand">
          Step {current + 1} of {steps.length}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Registration progress"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={current + 1}
        aria-valuetext={`Step ${current + 1} of ${steps.length}: ${steps[current]?.name ?? ""}`}
        className="relative h-3 w-full"
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-[3px] h-1.5 rounded-[20px] bg-brand-tint" />
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 h-3 rounded-[20px] bg-brand transition-[width] duration-300 ease-[var(--ease-fluent-decel)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
