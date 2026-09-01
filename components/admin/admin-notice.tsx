"use client";

import { Button, MessageBar } from "@/components/fluent";
import { Dismiss } from "@/components/icons";
import type { AdminNotice as Notice } from "./use-admin-action";

/** The engine's verdict on the last superadmin write, dismissible. */
export function AdminNotice({ notice, onDismiss }: { notice: Notice | null; onDismiss: () => void }) {
  if (!notice) return null;
  return (
    <MessageBar
      intent={notice.ok ? "success" : "error"}
      live
      actions={<Button variant="subtle" size="sm" aria-label="Dismiss" onClick={onDismiss} icon={<Dismiss />} />}
    >
      {notice.message}
    </MessageBar>
  );
}
