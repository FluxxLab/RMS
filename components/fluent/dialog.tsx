"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Dismiss } from "@/components/icons";
import { Button } from "./button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Action buttons, rendered right-aligned in the footer. */
  actions: ReactNode;
}

/** Modal dialog on the native <dialog> element: focus-trapped, Esc to close, 40 % scrim. */
export function Dialog({ open, onClose, title, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(92vw,460px)] rounded-2xl border border-panel-border bg-bg-1 p-0 text-fg-1 shadow-64 backdrop:bg-black/40 open:animate-rise"
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="type-title-3 text-heading-ink">{title}</h2>
          <Button variant="subtle" size="sm" aria-label="Close" onClick={onClose} icon={<Dismiss />} className="-mr-2 -mt-1" />
        </div>
        <div className="text-[16px] leading-[24px] text-fg-2">{children}</div>
        <div className="flex justify-end gap-3">{actions}</div>
      </div>
    </dialog>
  );
}
