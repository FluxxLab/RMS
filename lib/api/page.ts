import "server-only";

import { redirect } from "next/navigation";
import { apiMessage, type ApiResult } from "./client";

/**
 * Unwraps an API result for a page: either the data, or the sentence to show
 * in its place.
 *
 * An expired session is not something to render — it sends the person to sign
 * in, which is where they can do something about it.
 *
 * `signInPath` says *which* sign-in. Staff and participants authenticate
 * against different stores, so sending a participant to the staff door gives
 * them a form their password cannot open, and a failure that reads as a wrong
 * password rather than a wrong page. Portal pages pass "/sign-in"; the default
 * serves the staff console and superadmin control.
 */
export function pageData<T>(
  result: ApiResult<T>,
  signInPath: "/login" | "/sign-in" = "/login",
): { ok: true; data: T } | { ok: false; message: string } {
  if (result.ok) return { ok: true, data: result.data };
  if (result.error.kind === "unauthorised") redirect(signInPath);
  return { ok: false, message: apiMessage(result.error) };
}
