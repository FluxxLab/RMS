"use server";

import { revalidatePath } from "next/cache";
import * as api from "@/lib/api";
import { apiMessage } from "@/lib/api";
import type { StressTestResult } from "@/lib/api/schemas";

/*
 * Researcher console writes. As everywhere, the engine decides and this only
 * carries the request and reports what came back.
 */

export type StressTestOutcome = { ok: true; result: StressTestResult } | { ok: false; message: string };

/**
 * Proves the engine holds capacity under concurrent demand (AT-12).
 *
 * Anything the test books is released again by the engine, so the schedule is
 * left as it was found — but every attempt is audited, which is why this asks
 * before it runs.
 */
export async function stressTestSlot(scheduleId: string): Promise<StressTestOutcome> {
  const result = await api.stressTestSlot(scheduleId);
  if (!result.ok) return { ok: false, message: apiMessage(result.error) };

  for (const path of ["/staff/slots", "/staff/dashboard", "/staff/bookings"]) revalidatePath(path);
  return { ok: true, result: result.data };
}
