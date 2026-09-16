"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

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
  /*
   * Where the panel sits on screen.
   *
   * It is rendered into the body rather than beside its trigger, because a
   * menu inside a scrolling table is clipped by that table: an absolutely
   * positioned panel cannot escape an `overflow` ancestor, so the last row's
   * menu opens inside the frame and loses half of itself. Positioning it with
   * the trigger's own rectangle puts it back on top of the table.
   */
  const [at, setAt] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const GAP = 8;
    const EDGE = 8;
    // `end` aligns the panel's right edge with the trigger's, then both edges
    // are clamped so a menu near the window's border stays fully on screen.
    const wanted = align === "end" ? rect.right - width : rect.left;
    const left = Math.max(EDGE, Math.min(wanted, window.innerWidth - width - EDGE));
    const top = rect.bottom + GAP;

    setAt({ top, left, maxHeight: Math.max(120, window.innerHeight - top - EDGE) });
  }, [align, width]);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Measured before paint, so the panel never appears at the wrong place first.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  /*
   * Kept under the trigger while anything scrolls. The listener is capturing so
   * it hears the table's own scrollbar, not just the window's — that inner
   * scroller is the whole reason the panel had to leave the table.
   */
  useEffect(() => {
    if (!open) return;
    const follow = () => place();
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [open, place]);

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

      {open &&
        at &&
        createPortal(
          <div
            ref={panelRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onPanelKeyDown}
            style={{ position: "fixed", top: at.top, left: at.left, width, maxHeight: at.maxHeight }}
            className="scroll-thin z-50 overflow-y-auto rounded-2xl border border-panel-border bg-bg-1 p-2 text-fg-1 shadow-16"
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
          </div>,
          document.body,
        )}
    </div>
  );
}
