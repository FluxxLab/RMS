import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal/portal-shell";
import { isParticipant, readSession } from "@/lib/api";

/**
 * The portal is public: browsing studies needs no account. The shell is told
 * who is signed in so it can offer the right thing — sign in, or the sections
 * that only make sense once there is a pseudonym to attach them to.
 */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await readSession();
  return <PortalShell pid={isParticipant(session) ? session!.subject : null}>{children}</PortalShell>;
}
