"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface MenuItem {
  label: string;
  /** A destination. Mutually exclusive with `onSelect`. */
  href?: string;
  onSelect?: () => void | Promise<void>;
  icon?: ReactNode;
}

interface MenuProps {
  /** Accessible name for the trigger and the menu it opens. */
  label: string;
  /** What the trigger renders — an avatar, an icon, a label. */
  trigger: ReactNode;
  triggerClassName?: string;
  triggerTitle?: string;
  /** Identity or context shown above the items. */
  header?: ReactNode;
  /** A closing note, e.g. a privacy statement. */
  footer?: ReactNode;
  items: MenuItem[];
  /** Which edge of the trigger the panel hangs from. */
  align?: "start" | "end";
  width?: number;
}

const ITEM =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[16px] leading-[19px] text-fg-1 hover:bg-bg-3 focus:bg-bg-3 focus:outline-none [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:text-field-label";

/**
 * A menu button and its panel. Roving focus lives on the items, so the panel is
 * driven entirely from the keyboard: arrows move, Home/End jump, Escape and Tab
 * close and hand focus back to the trigger.
 */
export function Menu({
  label,
  trigger,
  triggerClassName = "",
  triggerTitle,
  header,
  footer,
  items,
  align = "end",
  width = 260,
}: MenuProps) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Opening moves focus onto the first item, so the menu is usable without a pointer.
  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  const focusItem = (index: number) => {
    const count = items.length;
    itemRefs.current[((index % count) + count) % count]?.focus();
  };

  const currentIndex = () => itemRefs.current.findIndex((el) => el === document.activeElement);

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        focusItem(currentIndex() + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusItem(currentIndex() - 1);
        break;
      case "Home":
        e.preventDefault();
        focusItem(0);
        break;
      case "End":
        e.preventDefault();
        focusItem(items.length - 1);
        break;
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        title={triggerTitle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onPanelKeyDown}
          style={{ width }}
          className={`absolute top-[calc(100%+8px)] z-50 rounded-2xl border border-panel-border bg-bg-1 p-2 text-fg-1 shadow-16 ${
            align === "end" ? "right-0" : "left-0"
          }`}
        >
          {header && <div className="px-3 pb-3 pt-2">{header}</div>}
          {header && <div className="mb-2 border-t border-stroke-2" />}
          {items.map((item, i) =>
            item.href ? (
              <Link
                key={item.label}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                href={item.href}
                role="menuitem"
                tabIndex={-1}
                onClick={() => close(false)}
                className={ITEM}
              >
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  item.onSelect?.();
                  close(true);
                }}
                className={ITEM}
              >
                {item.icon}
                {item.label}
              </button>
            ),
          )}
          {footer && (
            <>
              <div className="mb-2 mt-2 border-t border-stroke-2" />
              <p className="px-3 pb-1 text-[14px] leading-[17px] text-field-label">{footer}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
