import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { consoleUser } from "@/lib/staff-user";

/**
 * Superadmin control. The session must be a staff one to get this far; the API
 * decides for itself whether the role may perform each operation, and refuses
 * the ones it may not.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await consoleUser();
  if (user === null) redirect("/login");

  return <AdminShell user={user}>{children}</AdminShell>;
}
