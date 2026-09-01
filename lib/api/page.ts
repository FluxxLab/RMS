import "server-only";

import { redirect } from "next/navigation";
import { apiMessage, type ApiResult } from "./client";

/**
 * Unwraps an API result for a page: either the data, or the sentence to show
 * in its place.
 *
 * An expired session is not something to render — it sends the person to sign
 * in, which is where they can do something about it.
 */
export function pageData<T>(result: ApiResult<T>): { ok: true; data: T } | { ok: false; message: string } {
  if (result.ok) return { ok: true, data: result.data };
  if (result.error.kind === "unauthorised") redirect("/login");
  return { ok: false, message: apiMessage(result.error) };
}
