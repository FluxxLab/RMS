"use client";

import { useState, useTransition } from "react";
import type { AdminResult } from "@/app/(admin)/admin/actions";

export interface AdminNotice {
  ok: boolean;
  message: string;
}

/**
 * Runs a superadmin write and keeps its verdict for display. The engine's
 * message is shown verbatim — the browser decides nothing about whether the
 * operation was allowed, it only reports what came back.
 */
export function useAdminAction() {
  const [notice, setNotice] = useState<AdminNotice | null>(null);
  const [pending, startTransition] = useTransition();

  /**
   * `onSuccess` runs only when the engine accepted the write. A refused
   * request leaves the form exactly as it was, so the person can correct what
   * they typed instead of typing it again.
   */
  const run = (operation: () => Promise<AdminResult>, onSuccess?: () => void) => {
    startTransition(async () => {
      const result = await operation();
      setNotice({ ok: result.ok, message: result.message });
      if (result.ok) onSuccess?.();
    });
  };

  return { notice, dismiss: () => setNotice(null), pending, run };
}
