import type { ReactNode } from "react";
import { initialsFor } from "@/components/fluent";
import { Book, Calendar, People, SignIn, Tag } from "@/components/icons";
import { ConsoleShell } from "@/components/shell/console-shell";
import { signOut } from "@/app/sign-out";

// The portal uses the same frame as the console: a wide, labelled rail carries its sections.
const BROWSE = { href: "/", label: "Studies", icon: <Book /> };

const SIGNED_IN = [
  BROWSE,
  { href: "/bookings", label: "Bookings", icon: <Calendar /> },
  { href: "/interests", label: "Interests", icon: <Tag /> },
  { href: "/profile", label: "Profile", icon: <People /> },
];

const SIGNED_OUT = [BROWSE, { href: "/signup", label: "Register", icon: <People /> }];

const SIGN_IN = { href: "/sign-in", label: "Sign in", icon: <SignIn /> };

interface PortalShellProps {
  /** The participant's pseudonym, or null when nobody is signed in. */
  pid: string | null;
  children: ReactNode;
}

export function PortalShell({ pid, children }: PortalShellProps) {
  return (
    <ConsoleShell
      appName="BIL Research"
      userInitials={pid ? initialsFor(pid) : "?"}
      userName={pid ?? "Not signed in"}
      searchPlaceholder="Search studies"
      navigation={{
        kind: "rail",
        primary: pid ? SIGNED_IN : SIGNED_OUT,
        bottom: pid ? undefined : SIGN_IN,
        exact: ["/"],
        width: 88,
        labels: true,
      }}
      account={{
        caption: pid ? "Participant" : "Browsing as a guest",
        onSignOut: pid ? signOut : undefined,
        note: pid
          ? "Your name and email stay in the vault. Staff only ever see this pseudonym."
          : "Sign in to book a session and to see your bookings.",
      }}
      footNote="Your name and email stay in the identity vault. Researchers see your pseudonym only."
    >
      <div className="flex flex-1 flex-col">
        {/* min-h-full fills a short page to the viewport without pinning a long one to it,
            so the last panel and the bottom padding stay inside the scrollable height. */}
        <div className="mx-auto flex min-h-full w-full max-w-[1120px] flex-col px-6 py-6 animate-rise">{children}</div>
      </div>
    </ConsoleShell>
  );
}
