import "server-only";

import { cookies } from "next/headers";
import type { z } from "zod";

import { readSessionToken } from "./set-cookie";

/*
 * The one door to the NestJS API. Every read and write goes through here, so
 * the base URL, the session cookie and response validation are decided once.
 *
 * It is server-only by construction: the session is an httpOnly cookie the
 * browser cannot read, and the API is never called from a client component.
 */

/** The cookie the API issues on login. Named here so one place owns it. */
export const SESSION_COOKIE = "jwt";

const BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:3000";

/**
 * The booking engine's own result codes. A refusal carries one of these, and
 * the UI maps it to copy — it never decides for itself what the outcome was.
 */
export type EngineCode =
  | "not_found"
  | "cancelled"
  | "full"
  | "duplicate"
  | "criteria_not_confirmed"
  | "ineligible"
  | "locked";

const ENGINE_CODES: readonly string[] = [
  "not_found",
  "cancelled",
  "full",
  "duplicate",
  "criteria_not_confirmed",
  "ineligible",
  "locked",
];

/** What a refusal carried, beyond its HTTP status. */
export interface Refusal {
  message: string;
  /** Set when the engine named its own outcome. */
  code?: EngineCode;
  /** The specific failing rules, in the engine's wording. */
  reasons?: string[];
}

export type ApiFailure =
  | { kind: "unauthorised" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | ({ kind: "conflict" } & Refusal)
  | ({ kind: "invalid" } & Refusal)
  | { kind: "server"; message: string }
  | { kind: "unreachable"; message: string }
  | { kind: "malformed"; message: string };

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Query parameters; undefined and empty values are dropped. */
  query?: Record<string, string | number | undefined>;
  /** Seconds to cache a GET. Omit for always-fresh. */
  revalidate?: number;
}

function url(path: string, query?: RequestOptions["query"]): string {
  const target = new URL(path.replace(/^\//, ""), BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") target.searchParams.set(key, String(value));
  }
  return target.toString();
}

async function sessionHeader(): Promise<Record<string, string>> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? { cookie: `${SESSION_COOKIE}=${token}` } : {};
}

function failureFor(status: number, refusal: Refusal): ApiFailure {
  if (status === 401) return { kind: "unauthorised" };
  if (status === 403) return { kind: "forbidden" };
  // A 404 the engine named is a refusal with a message; a bare one is not.
  if (status === 404 && refusal.code === undefined) return { kind: "not_found" };
  if (status === 409 || status === 423) return { kind: "conflict", ...refusal };
  if (status >= 400 && status < 500) return { kind: "invalid", ...refusal };
  return { kind: "server", message: refusal.message };
}

/** Reads what an error body says, without trusting it to have any of it. */
function refusalFrom(payload: unknown, fallback: string): Refusal {
  if (payload === null || typeof payload !== "object") return { message: fallback };
  const body = payload as Record<string, unknown>;

  const message = typeof body.message === "string" && body.message.length > 0 ? body.message : fallback;
  const code = typeof body.code === "string" && ENGINE_CODES.includes(body.code) ? (body.code as EngineCode) : undefined;
  const reasons = Array.isArray(body.reasons) ? body.reasons.filter((r): r is string => typeof r === "string") : undefined;

  return { message, code, reasons: reasons && reasons.length > 0 ? reasons : undefined };
}

/**
 * Calls the API and validates the response against `schema`. A response that
 * does not match the contract is a failure, not something to render — the
 * schema is the boundary, and unknown properties are dropped rather than
 * passed through into the UI.
 */
export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const { method = "GET", body, query, revalidate } = options;

  let response: Response;
  try {
    response = await fetch(url(path, query), {
      method,
      headers: {
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(await sessionHeader()),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      ...(method === "GET" && revalidate !== undefined ? { next: { revalidate } } : { cache: "no-store" }),
    });
  } catch (cause) {
    return {
      ok: false,
      error: { kind: "unreachable", message: cause instanceof Error ? cause.message : "The API did not respond." },
    };
  }

  const text = await response.text();
  let payload: unknown = undefined;
  if (text.length > 0) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    return { ok: false, error: failureFor(response.status, refusalFrom(payload, `${response.status} ${response.statusText}`)) };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { kind: "malformed", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
    };
  }

  return { ok: true, data: parsed.data };
}

/**
 * Opens a server-sent-event stream on the API, carrying the session.
 *
 * The browser cannot do this itself: the session cookie belongs to this app's
 * origin, not the API's. A route handler holds the stream open and pipes it
 * through, so the token stays on the server.
 */
export async function openStream(path: string): Promise<Response> {
  return fetch(url(path), {
    headers: { accept: "text/event-stream", ...(await sessionHeader()) },
    cache: "no-store",
  });
}

/**
 * Fetches a path and hands back the raw response, untouched.
 *
 * The export is a file, not a record: it comes back as text/csv with a
 * Content-Disposition, and parsing it through a schema would destroy both.
 * Everything else should go through `apiRequest`, which validates.
 */
export async function fetchRaw(path: string, query?: RequestOptions["query"]): Promise<Response> {
  return fetch(url(path, query), {
    headers: { ...(await sessionHeader()) },
    cache: "no-store",
  });
}

/** Human-facing copy for a failure. Never leaks a stack or an internal field. */
export function apiMessage(error: ApiFailure): string {
  switch (error.kind) {
    case "unauthorised":
      return "Your session has expired. Sign in again to continue.";
    case "forbidden":
      return "Your role does not allow that.";
    case "not_found":
      return "That record no longer exists.";
    case "conflict":
      return error.message;
    case "invalid":
      return error.message;
    case "server":
      return "The research system could not complete that. Nothing was assumed — check the view before trying again.";
    case "unreachable":
      return "The research API is not responding. Try again in a moment.";
    case "malformed":
      return "The research API returned something this app does not understand.";
  }
}

/**
 * Signs in and hands back the session the API issued.
 *
 * Login is the one call that needs the response headers rather than the body:
 * the API answers with an acknowledgement and puts the session in a Set-Cookie.
 * The token is returned here so the caller can place it in this app's own
 * cookie jar; it is never returned to the browser in a body.
 */
export async function authenticate(
  path: string,
  credentials: { email: string; password: string },
): Promise<ApiResult<{ token: string; maxAge?: number }>> {
  let response: Response;
  try {
    response = await fetch(url(path), {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(credentials),
      cache: "no-store",
    });
  } catch (cause) {
    return {
      ok: false,
      error: { kind: "unreachable", message: cause instanceof Error ? cause.message : "The API did not respond." },
    };
  }

  if (!response.ok) {
    return { ok: false, error: failureFor(response.status, { message: `${response.status} ${response.statusText}` }) };
  }

  const setCookie = response.headers.get("set-cookie") ?? "";
  const token = readSessionToken(setCookie, SESSION_COOKIE);
  if (!token) {
    return { ok: false, error: { kind: "malformed", message: "The API accepted the sign-in but issued no session." } };
  }

  const maxAge = Number(/Max-Age=(\d+)/i.exec(setCookie)?.[1]);
  return { ok: true, data: { token, maxAge: Number.isFinite(maxAge) ? maxAge : undefined } };
}
