import type { ReactNode } from "react";
import { signOut } from "@/app/sign-out";
import { roleLabel, type ConsoleUser } from "@/lib/staff-user";
import { ConsoleShell } from "./console-shell";

// The console's sections, in the order a research assistant works through them.
// Only surfaces that exist are listed; the rest join the bar as they are built.
const SECTIONS = [
  { href: "/staff/dashboard", label: "Dashboard" },
  { href: "/staff/bookings", label: "Bookings" },
  { href: "/staff/slots", label: "Slots" },
  { href: "/staff/studies", label: "Studies" },
  { href: "/staff/participants", label: "Participants" },
  { href: "/staff/interests", label: "Interest leads" },
  { href: "/admin", label: "Admin" },
];

interface StaffShellProps {
  user: ConsoleUser | null;
  children: ReactNode;
}

export function StaffShell({ user, children }: StaffShellProps) {
  return (
    <ConsoleShell
      appName="BIL RMS"
      userInitials={user?.initials ?? "?"}
      userName={user?.name ?? "Not signed in"}
      searchPlaceholder="Search"
      navigation={{ kind: "top", links: SECTIONS }}
      account={{ caption: roleLabel(user?.role ?? null), onSignOut: signOut }}
      footNote="Participants appear by pseudonym only. Identity resolution is a separately authorised, audited operation."
    >
      {children}
    </ConsoleShell>
  );
}
