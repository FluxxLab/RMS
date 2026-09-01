import "server-only";

import { getStaff, readSession } from "./api";
import type { StaffRole } from "./types";

/** The signed-in staff member, as the console chrome needs them. */
export interface ConsoleUser {
  name: string;
  initials: string;
  role: StaffRole;
}

const ROLE_LABEL: Record<StaffRole, string> = {
  research_assistant: "Research assistant",
  principal_investigator: "Principal investigator",
  super_admin: "Superadmin",
};

export function roleLabel(role: StaffRole | null): string {
  return role ? ROLE_LABEL[role] : "Not signed in";
}

/** First letters of the first and last words, which is what the avatar shows. */
function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * Who is signed in to the console.
 *
 * The session names the account; the directory gives it a name to show. A
 * directory that cannot be read is not an error worth a page for — the chrome
 * falls back to the role, and every view below it reports its own failure.
 */
export async function consoleUser(): Promise<ConsoleUser | null> {
  const session = await readSession();
  if (session === null || session.role === "participant") return null;

  const staff = await getStaff();
  const me = staff.ok ? staff.data.find((user) => user.id === session.subject) : undefined;
  const name = me?.fullName ?? roleLabel(session.role);

  return { name, initials: initialsFor(name), role: session.role };
}
