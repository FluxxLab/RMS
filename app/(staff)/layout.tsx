import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { StaffShell } from "@/components/shell/staff-shell";
import { consoleUser } from "@/lib/staff-user";

/**
 * The console is staff-only. A visitor without a staff session is sent to sign
 * in here rather than each page discovering it separately — and the API refuses
 * them regardless, so this is the courtesy, not the control.
 */
export default async function StaffLayout({ children }: { children: ReactNode }) {
  const user = await consoleUser();
  if (user === null) redirect("/login");

  return <StaffShell user={user}>{children}</StaffShell>;
}
