"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import {
  Children,
  Fragment,
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Checkmark, ChevronDown } from "@/components/icons";

/*
 * The select control, drawn by us rather than by the operating system.
 *
 * A native <select> renders its list with the platform's own widget — grey on
 * Windows, ignoring every token in the design system, and unstyleable. This is
 * the same control built on Radix so the open list matches the closed one.
 *
 * It deliberately keeps the native API: callers still pass <option> and
 * <optgroup> children and a value/onChange pair, so a call site reads the same
 * as it did and nothing had to change to adopt this.
 *
 * Kept: keyboard navigation, type-ahead, screen-reader semantics and hidden
 * form submission when `name` is set — all of which Radix provides, and all of
 * which a hand-rolled listbox usually loses.
 */

export type ControlSize = "md" | "sm";

/*
 * `whitespace-nowrap` with a truncating value is what keeps the control one
 * line tall. Without it a long option — a study named after its IRB code —
 * wraps inside the trigger, and the field grows past every other control on
 * the row.
 */
const TRIGGER =
  "flex w-full cursor-pointer items-center justify-between gap-2 whitespace-nowrap rounded-lg border border-field-border bg-bg-1 text-left text-fg-1 transition-[border-color,box-shadow] duration-150 focus:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 data-[state=open]:border-brand disabled:cursor-not-allowed disabled:bg-bg-3 disabled:text-fg-disabled [&>span]:min-w-0 [&>span]:truncate";

const TRIGGER_SIZE: Record<ControlSize, string> = {
  md: "h-[52px] px-4 text-[16px] leading-[19px]",
  sm: "h-9 px-3 type-body",
};

const INVALID = "border-danger-fg focus-visible:border-danger-fg focus-visible:ring-danger-fg/25";

export interface SelectProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  /** Shaped like a native change event, so existing call sites are untouched. */
  onChange?: (event: { target: { value: string } }) => void;
  disabled?: boolean;
  invalid?: boolean;
  size?: ControlSize;
  className?: string;
  children?: ReactNode;
  "aria-describedby"?: string;
  "aria-label"?: string;
}

interface OptionNode {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

interface GroupNode {
  label: string;
  options: OptionNode[];
}

type Entry = { kind: "option"; option: OptionNode } | { kind: "group"; group: GroupNode };

function readOption(node: ReactElement): OptionNode {
  const props = node.props as { value?: string | number; children?: ReactNode; disabled?: boolean };
  return {
    value: String(props.value ?? ""),
    label: props.children,
    disabled: props.disabled,
  };
}

/**
 * Splits the children into a placeholder and the real entries.
 *
 * An `<option value="">` is the placeholder by convention. It cannot become an
 * item: Radix reserves the empty string for "nothing chosen", and an item
 * carrying it throws.
 */
function parse(children: ReactNode): { placeholder: ReactNode; entries: Entry[] } {
  let placeholder: ReactNode = null;
  const entries: Entry[] = [];

  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;

    /*
     * `Children.toArray` flattens arrays but not fragments, so options wrapped
     * in a <>…</> arrive as a single node and would otherwise be skipped,
     * leaving the control with nothing to offer.
     */
    if (child.type === Fragment) {
      const inner = parse((child.props as { children?: ReactNode }).children);
      placeholder = placeholder ?? inner.placeholder;
      entries.push(...inner.entries);
      continue;
    }

    if (child.type === "optgroup") {
      const props = child.props as { label?: string; children?: ReactNode };
      const options: OptionNode[] = [];
      for (const inner of Children.toArray(props.children)) {
        if (!isValidElement(inner) || inner.type !== "option") continue;
        const option = readOption(inner);
        if (option.value !== "") options.push(option);
      }
      if (options.length) entries.push({ kind: "group", group: { label: props.label ?? "", options } });
      continue;
    }

    if (child.type !== "option") continue;
    const option = readOption(child);
    if (option.value === "") {
      placeholder = option.label;
      continue;
    }
    entries.push({ kind: "option", option });
  }

  return { placeholder, entries };
}

function Item({ option }: { option: OptionNode }) {
  return (
    <SelectPrimitive.Item
      value={option.value}
      disabled={option.disabled}
      className="relative flex cursor-pointer select-none items-center gap-2 py-2.5 pl-3 pr-9 text-[16px] leading-[19px] text-fg-1 outline-none data-[highlighted]:bg-bg-3 data-[state=checked]:font-medium data-[disabled]:cursor-not-allowed data-[disabled]:text-fg-disabled"
    >
      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-3 flex items-center text-brand">
        <Checkmark size={16} strokeWidth={2.2} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export function Select({
  id,
  name,
  value,
  defaultValue,
  onChange,
  disabled,
  invalid = false,
  size = "md",
  className = "",
  children,
  ...aria
}: SelectProps) {
  const { placeholder, entries } = parse(children);

  // Uncontrolled callers still need their value readable for form submission,
  // so it is tracked here rather than left only inside Radix.
  const triggerRef = useRef<HTMLButtonElement>(null);

  /*
   * Where the open list is rendered.
   *
   * Normally the body, so the list escapes any table or panel that would clip
   * it. Inside a modal it must be the dialog itself: `showModal()` puts a
   * <dialog> in the browser's top layer, which sits above every z-index on the
   * page — so a list portalled to the body renders *behind* the modal that
   * opened it, however high its z-index.
   */
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setContainer(triggerRef.current?.closest("dialog") ?? null);
  }, []);

  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? "");
  const current = value === undefined ? uncontrolled : value;

  const flat = entries.flatMap((e) => (e.kind === "option" ? [e.option] : e.group.options));

  return (
    <SelectPrimitive.Root
      // Controlled only when the caller controls it: passing `value` as
      // undefined to a controlled Radix root would strip an uncontrolled
      // caller's own selection on every render.
      {...(value === undefined ? { defaultValue } : { value })}
      onValueChange={(next) => {
        if (value === undefined) setUncontrolled(next);
        onChange?.({ target: { value: next } });
      }}
      disabled={disabled}
    >
      {/*
        * The field a surrounding form submits.
        *
        * Radix can render this itself, but it builds its options from the
        * mounted items — and the list is unmounted until it is first opened, so
        * an untouched control would submit nothing at all. Rendering it here
        * from the options we already parsed makes a default value submit
        * whether or not anyone opened the menu.
        */}
      {name && (
        <select
          name={name}
          value={current}
          onChange={() => {}}
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none absolute size-0 opacity-0"
        >
          <option value="" />
          {flat.map((option) => (
            <option key={option.value} value={option.value} />
          ))}
        </select>
      )}

      <SelectPrimitive.Trigger
        ref={triggerRef}
        id={id}
        aria-invalid={invalid || undefined}
        className={`${TRIGGER} ${TRIGGER_SIZE[size]} ${invalid ? INVALID : ""} ${className}`}
        {...aria}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown
            size={size === "md" ? 24 : 16}
            strokeWidth={2}
            className="shrink-0 text-field-label transition-transform duration-150"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal container={container ?? undefined}>
        <SelectPrimitive.Content
          position="popper"
          side="bottom"
          sideOffset={4}
          /*
           * Always downward. Left to itself the popper flips above the trigger
           * when space below is short, which throws the list over the question
           * being answered. Holding it down is safe because the height below is
           * capped to the room actually available and the list scrolls inside.
           */
          avoidCollisions={false}
          className="z-50 max-h-[min(22rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-stroke-1 bg-bg-1 shadow-lg"
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center bg-bg-1 text-fg-3">
            <ChevronDown size={14} strokeWidth={2} className="rotate-180" />
          </SelectPrimitive.ScrollUpButton>

          <SelectPrimitive.Viewport className="p-1">
            {entries.map((entry, i) =>
              entry.kind === "option" ? (
                <Item key={entry.option.value} option={entry.option} />
              ) : (
                <SelectPrimitive.Group key={`${entry.group.label}-${i}`}>
                  <SelectPrimitive.Label className="px-3 pb-1 pt-2 text-[12px] leading-[15px] text-field-label">
                    {entry.group.label}
                  </SelectPrimitive.Label>
                  {entry.group.options.map((option) => (
                    <Item key={option.value} option={option} />
                  ))}
                </SelectPrimitive.Group>
              ),
            )}
          </SelectPrimitive.Viewport>

          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center bg-bg-1 text-fg-3">
            <ChevronDown size={14} strokeWidth={2} />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
