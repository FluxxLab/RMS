import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./client";

/*
 * Who is signed in, read from the session the API issued.
 *
 * The token's payload is read, not verified: this only decides what to render.
 * Every request that touches data carries the same cookie, and the API
 * verifies it there — nothing is trusted on this side.
 */

/** A staff role, or `participant`. */
export type SessionRole = "participant" | "research_assistant" | "principal_investigator" | "super_admin";

export interface Session {
  /** The participant's pseudonym, or a staff account id. */
  subject: string;
  role: SessionRole;
}

const ROLES: readonly string[] = ["participant", "research_assistant", "principal_investigator", "super_admin"];

function decodePayload(token: string): unknown {
  const segment = token.split(".")[1];
  if (!segment) return null;
  try {
    return JSON.parse(Buffer.from(segment.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = decodePayload(token);
  if (payload === null || typeof payload !== "object") return null;

  const { sub, roles } = payload as { sub?: unknown; roles?: unknown };
  if (typeof sub !== "string" || typeof roles !== "string" || !ROLES.includes(roles)) return null;

  return { subject: sub, role: roles as SessionRole };
}

/** True when the session belongs to a participant rather than a staff account. */
export function isParticipant(session: Session | null): boolean {
  return session?.role === "participant";
}
