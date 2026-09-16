"use server";

import { apiMessage, getScreeningProgress, inviteToScreen } from "@/lib/api";
import type { ScreeningProgress } from "@/lib/api/schemas";

type Outcome = { ok: true; data: ScreeningProgress } | { ok: false; message: string };

/*
 * Both are asked for on demand rather than rendered with the page: matching
 * walks the panel, which is work worth doing when a recruiter asks for it and
 * not on every page load.
 */
export async function screeningProgress(studyId: string): Promise<Outcome> {
  const result = await getScreeningProgress(studyId);
  return result.ok ? { ok: true, data: result.data } : { ok: false, message: apiMessage(result.error) };
}

/** Invites everyone who matches and has not been invited already. */
export async function inviteMatching(studyId: string): Promise<Outcome> {
  const result = await inviteToScreen(studyId);
  return result.ok ? { ok: true, data: result.data } : { ok: false, message: apiMessage(result.error) };
}
