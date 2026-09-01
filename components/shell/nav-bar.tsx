"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Button, Dialog, Menu } from "@/components/fluent";
import { Search, SignIn, SignOut } from "@/components/icons";
import { Wordmark } from "./wordmark";
import { TopNav, type TopNavLink } from "./top-nav";

interface NavBarProps {
  appName: string;
  userInitials: string;
  userName: string;
  searchPlaceholder?: string;
  /** Left inset in px so the brand name lines up with the page gutter. */
  insetLeft: number;
  /** Console sections, carried in the bar. Omitted when an app rail carries them. */
  sections?: TopNavLink[];
  sectionsExact?: string[];
  /** What the account holder is, under their name — "Participant", a staff role. */
  accountCaption: string;
  /** Ends the session. Confirmed first, since it is not obvious how to get back. */
  /** Omitted when nobody is signed in — there is then nothing to sign out of. */
  onSignOut?: () => void | Promise<void>;
  /** A closing line in the account menu, e.g. the vault notice. */
  accountNote?: ReactNode;
}

/**
 * The brand bar from the Outlook export: product name, the search field and
 * the account avatar. Search writes `?q=` to the URL so any console
 * view can react to it. The field itself is the app's standard input — same
 * 52px height, 8px corner and 16px value as every form — so the bar does not
 * introduce a second control language.
 */
export function NavBar({
  appName,
  userInitials,
  userName,
  searchPlaceholder = "Search",
  insetLeft,
  sections,
  sectionsExact,
  accountCaption,
  onSignOut,
  accountNote,
}: NavBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, startSignOut] = useTransition();

  // Debounce keystrokes into the URL; skip when already in sync.
  useEffect(() => {
    if (query === urlQuery) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (query) next.set("q", query);
      else next.delete("q");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 200);
    return () => clearTimeout(t);
  }, [query, urlQuery, params, pathname, router]);

  return (
    // Navigation Bar: row · space-between · #316AB7 (contents centred). The frame’s 8px
    // right padding was drawn for a 48px bar; at 96px the avatar needs the page gutter.
    <header className="h-[96px] shrink-0 bg-brand text-white">
      <div
        style={{ paddingLeft: insetLeft }}
        className="mx-auto grid h-full max-w-shell grid-cols-[1fr_auto_1fr] items-center gap-6 pr-6"
      >
      <Wordmark appName={appName} />

      {/* Centre track: the sections, or nothing at all when a rail carries them. */}
      <div className="flex h-full min-w-0 justify-center self-stretch">
        {sections && <TopNav links={sections} exact={sectionsExact} />}
      </div>

      <div className="flex h-[52px] min-w-0 items-center justify-end gap-6">
        {/* Half the frame’s 350px width, so the sections beside it keep their labels. */}
        <label className="flex h-[52px] w-[175px] min-w-0 items-center gap-3 rounded-lg bg-bg-1 pl-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-white">
          <Search size={20} className="shrink-0 -scale-x-100 text-field-label" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full bg-transparent pr-4 text-[16px] leading-[19px] text-fg-1 placeholder:text-field-placeholder focus:outline-none"
          />
        </label>

        {/* Frame 20: 32 × 32 · 1px white border · radius 32 · initials 14/14 regular #F4F4F4 */}
        <Menu
          label={`Account: ${userName}`}
          triggerTitle={userName}
          triggerClassName="flex size-8 items-center justify-center rounded-full border border-white pb-px text-[14px] font-normal leading-[14px] text-[#f4f4f4] hover:bg-white/15 focus-ring-inverse"
          trigger={userInitials}
          width={288}
          header={
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-[14px] leading-[14px] text-white"
              >
                {userInitials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[16px] leading-[19px] text-fg-1">{userName}</span>
                <span className="block text-[14px] leading-[17px] text-field-label">{accountCaption}</span>
              </span>
            </div>
          }
          items={
            onSignOut
              ? [{ label: "Sign out", icon: <SignOut />, onSelect: () => setConfirmSignOut(true) }]
              : [{ label: "Sign in", icon: <SignIn />, href: "/sign-in" }]
          }
          footer={accountNote}
        />
      </div>

      </div>

      <Dialog
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        title="Sign out?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmSignOut(false)} disabled={signingOut}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={signingOut}
              onClick={() =>
                startSignOut(async () => {
                  await onSignOut?.();
                })
              }
            >
              Sign out
            </Button>
          </>
        }
      >
        You will be signed out on this device and returned to the start page. Nothing you have saved is affected.
      </Dialog>
    </header>
  );
}
