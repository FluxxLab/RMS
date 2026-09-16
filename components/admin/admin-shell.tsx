import type { ReactNode } from "react";
import { signOut } from "@/app/sign-out";
import { ConsoleShell } from "@/components/shell/console-shell";
import { roleLabel, type ConsoleUser } from "@/lib/staff-user";

/*
 * Superadmin is its own interface, not a page of the console: separate route
 * group, separate navigation, and one place to gate the whole area when roles
 * are enforced.
 */
const SECTIONS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/studies", label: "Studies" },
  { href: "/admin/schedules", label: "Schedules" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/audit", label: "Audit log" },
];

interface AdminShellProps {
  user: ConsoleUser | null;
  children: ReactNode;
}

export function AdminShell({ user, children }: AdminShellProps) {
  return (
    <ConsoleShell
      appName="BIL Superadmin"
      userInitials={user?.initials ?? "?"}
      userName={user?.name ?? "Not signed in"}
      searchPlaceholder="Search"
      navigation={{ kind: "top", links: SECTIONS, exact: ["/admin"] }}
      account={{ caption: roleLabel(user?.role ?? null), onSignOut: signOut }}
      footNote="Superadmin actions are audited. Identity resolution remains a separately authorised operation."
    >
      {children}
    </ConsoleShell>
  );
}
