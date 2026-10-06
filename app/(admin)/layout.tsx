import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { consoleUser } from "@/lib/staff-user";

/**
 * Superadmin control. Only a superadmin session reaches these screens; the API
 * independently refuses every operation the role may not perform, so this gate
 * is about showing the right interface, not about keeping data safe.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await consoleUser();
  if (user === null) redirect("/login");

  /*
   * Route protection at the interface boundary. The API refuses these
   * operations for anyone else regardless, so nothing leaks without this —
   * but a researcher should not be shown a plane of screens that can only
   * ever answer 403.
   */
  if (user.role !== "super_admin") redirect("/staff/dashboard");

  return <AdminShell user={user}>{children}</AdminShell>;
}
