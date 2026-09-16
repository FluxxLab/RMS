"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Checkmark } from "@/components/icons";

/*
 * Form controls (Figma "Complete Account Setup"):
 *   Input / Select  — 52px, padding 8px 16px, 1px #CFD3D5, radius 8,
 *                     value 16/19, placeholder #ABAFB1
 *   Label           — 14/17, #5E6366, 4px x-inset, 8px above the control. The
 *                     frame says 12; 14 keeps the label a tier above the 12px
 *                     hint sitting under the same control.
 * `size="sm"` is a 36px variant on the same radius and border, for secondary
 * chrome only (the rows-per-page picker). Toolbar search and filters use the
 * full 52px control, so they read as the same family as the form.
 */

export type ControlSize = "md" | "sm";

const CONTROL =
  "w-full rounded-lg border border-field-border bg-bg-1 text-fg-1 placeholder:text-field-placeholder transition-[border-color,box-shadow] duration-150 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:bg-bg-3 disabled:text-fg-disabled";

const CONTROL_SIZE: Record<ControlSize, string> = {
  md: "h-[52px] px-4 text-[16px] leading-[19px]",
  sm: "h-9 rounded-lg px-3 type-body",
};

const INVALID = "border-danger-fg focus:border-danger-fg focus:ring-danger-fg/25";

/* ---------- Field wrapper ---------- */

export type FieldWidth = "xs" | "sm" | "md" | "lg" | "full";

const WIDTH: Record<FieldWidth, string> = {
  xs: "max-w-28",
  sm: "max-w-56",
  md: "max-w-72",
  lg: "max-w-80",
  full: "",
};

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  /** Marks the field optional. Required is the default, stated once per form. */
  optional?: boolean;
  /** Control width — size the field to the answer it expects. */
  width?: FieldWidth;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
}

/** Label above, control, then persistent hint and inline error below. */
export function Field({ label, hint, error, optional, width = "full", children, className = "" }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="px-1 text-[14px] leading-[17px] text-field-label">
        {label}
        {optional && <span className="ml-1 text-fg-4">(optional)</span>}
      </label>
      {/* Only the control is sized; the hint and error stay readable. */}
      <div className={WIDTH[width]}>{children({ id, describedBy, invalid: Boolean(error) })}</div>
      {hint && !error && (
        <p id={hintId} className="px-1 text-[12px] leading-[15px] text-fg-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="px-1 text-[12px] leading-[15px] text-danger-fg">
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------- Input ---------- */

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  invalid?: boolean;
  size?: ControlSize;
}

export function Input({ invalid = false, size = "md", className = "", ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={`${CONTROL} ${CONTROL_SIZE[size]} ${invalid ? INVALID : ""} ${className}`}
      {...rest}
    />
  );
}

/* ---------- Select ---------- */

/*
 * Lives in its own module because it is no longer a native <select>: the
 * operating system's list ignored every token here and could not be styled.
 * Re-exported so `@/components/fluent` stays the one import for form controls.
 */
export { Select, type SelectProps } from "./select";

/* ---------- Textarea ---------- */

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ invalid = false, className = "", rows = 3, ...rest }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={`${CONTROL} resize-y px-4 py-3 text-[16px] leading-[22px] ${invalid ? INVALID : ""} ${className}`}
      {...rest}
    />
  );
}

/* ---------- Checkbox ---------- */

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label: ReactNode;
  description?: ReactNode;
}

export function Checkbox({ label, description, className = "", ...rest }: CheckboxProps) {
  const id = useId();
  return (
    <label htmlFor={id} className={`group flex cursor-pointer items-start gap-3 rounded-sm py-1.5 ${className}`}>
      <span className="relative mt-px flex size-5 shrink-0 items-center justify-center">
        <input id={id} type="checkbox" className="peer sr-only" {...rest} />
        <span
          aria-hidden="true"
          className="flex size-5 items-center justify-center rounded-[4px] border border-field-border bg-bg-1 text-white transition-colors duration-150 group-hover:border-fg-1 peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg-1 peer-disabled:border-stroke-1 peer-disabled:bg-bg-3 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
        >
          <Checkmark size={14} strokeWidth={2.2} />
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-[16px] leading-[22px] text-fg-1">{label}</span>
        {description && <span className="block type-caption text-fg-3">{description}</span>}
      </span>
    </label>
  );
}

/* ---------- Radio group ---------- */

interface RadioOption<T extends string> {
  value: T;
  label: ReactNode;
  description?: ReactNode;
}

interface RadioGroupProps<T extends string> {
  name: string;
  legend: ReactNode;
  options: readonly RadioOption<T>[];
  value: T | "";
  onChange: (value: T) => void;
  error?: string;
  /** Lay the options out side by side (yes/no questions). */
  inline?: boolean;
}

export function RadioGroup<T extends string>({ name, legend, options, value, onChange, error, inline = false }: RadioGroupProps<T>) {
  const errorId = useId();
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? errorId : undefined} aria-invalid={error ? true : undefined}>
      <legend className="px-1 text-[14px] leading-[17px] text-field-label">{legend}</legend>
      <div className={inline ? "flex flex-wrap gap-x-8 gap-y-1" : "flex flex-col"}>
        {options.map((opt) => (
          <label key={opt.value} className="group flex cursor-pointer items-start gap-3 rounded-sm py-1.5">
            <span className="relative mt-px flex size-5 shrink-0 items-center justify-center">
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="flex size-5 items-center justify-center rounded-full border border-field-border bg-bg-1 transition-colors duration-150 group-hover:border-fg-1 peer-checked:border-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg-1 after:size-2.5 after:scale-0 after:rounded-full after:bg-brand after:transition-transform after:duration-150 peer-checked:after:scale-100"
              />
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] leading-[22px] text-fg-1">{opt.label}</span>
              {opt.description && <span className="block type-caption text-fg-3">{opt.description}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} role="alert" className="px-1 text-[12px] leading-[15px] text-danger-fg">
          {error}
        </p>
      )}
    </fieldset>
  );
}
