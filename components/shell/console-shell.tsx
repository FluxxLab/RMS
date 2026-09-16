import { Suspense, type ReactNode } from "react";
import { AppFooter } from "./app-footer";
import { AppRail, type RailItem } from "./app-rail";
import { NavBar } from "./nav-bar";
import { PageScroller } from "./page-scroller";
import { Wordmark } from "./wordmark";
import type { TopNavLink } from "./top-nav";

/** How the surfaces are reached: the Outlook app rail, or a horizontal bar. */
type Navigation =
  | {
      kind: "rail";
      primary: RailItem[];
      secondary?: RailItem[];
      bottom?: RailItem;
      exact?: string[];
      /** Rail width in px (Outlook frame: 49). */
      width?: number;
      /** Show labels under the rail icons (wide rails). */
      labels?: boolean;
    }
  | { kind: "top"; links: TopNavLink[]; exact?: string[] };

interface ConsoleShellProps {
  appName: string;
  userInitials: string;
  userName: string;
  searchPlaceholder: string;
  navigation: Navigation;
  /** The line the footer carries for this interface's audience. */
  footNote: ReactNode;
  /** The account menu behind the avatar: who is signed in, and the way out. */
  account: {
    caption: string;
    /** Omitted when nobody is signed in — there is then nothing to sign out of. */
    onSignOut?: () => void | Promise<void>;
    note?: ReactNode;
  };
  children: ReactNode;
}

/** The page gutter a top-navigated console aligns to. */
const PAGE_INSET = 24;

/**
 * The shared frame: brand bar on top, then either a vertical app rail beside
 * the view or a horizontal section bar above it. The view fills the rest and
 * scrolls on its own, so both consoles read as one product either way.
 */
export function ConsoleShell({
  appName,
  userInitials,
  userName,
  searchPlaceholder,
  navigation,
  account,
  footNote,
  children,
}: ConsoleShellProps) {
  // The brand name lines up with whatever sits below it: the rail, or the page gutter.
  const insetLeft = navigation.kind === "rail" ? (navigation.width ?? 49) + 14 : PAGE_INSET;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense
        fallback={
          <div className="flex h-[96px] shrink-0 items-center bg-brand text-white" style={{ paddingLeft: insetLeft }}>
            <Wordmark appName={appName} />
          </div>
        }
      >
        <NavBar
          appName={appName}
          userInitials={userInitials}
          userName={userName}
          searchPlaceholder={searchPlaceholder}
          insetLeft={insetLeft}
          sections={navigation.kind === "top" ? navigation.links : undefined}
          sectionsExact={navigation.exact}
          accountCaption={account.caption}
          onSignOut={account.onSignOut}
          accountNote={account.note}
        />
      </Suspense>

      <div className="flex min-h-0 flex-1">
        {navigation.kind === "rail" && (
          <AppRail
            primary={navigation.primary}
            secondary={navigation.secondary}
            bottom={navigation.bottom}
            exact={navigation.exact}
            width={navigation.width}
            labels={navigation.labels}
          />
        )}
        {/* The scroller is full width, so its scrollbar sits at the window edge;
            the capped box inside it only limits how wide the content runs. */}
        {/* Focusable because it scrolls: a region that cannot take focus cannot
            be scrolled from the keyboard, and on a charts-only page there is
            nothing else to tab to. The ring is inset so it reads as "this area
            is active". PageScroller is what puts focus here on arrival. */}
        <PageScroller
          /*
            * `overflow-x-clip` is deliberate, not decoration. Setting only
            * `overflow-y-auto` makes the other axis compute to `auto` as well,
            * so anything a few pixels too wide — a chart label, a table — gave
            * the whole console a horizontal scrollbar. Clipping x confines
            * scrolling to the vertical, and wide content that genuinely needs
            * to scroll does it inside its own container.
            */
          className="scroll-thin flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-clip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40"
        >
          <div className="mx-auto flex w-full max-w-shell flex-1 flex-col">{children}</div>
        </PageScroller>
      </div>

      <AppFooter note={footNote} />
    </div>
  );
}
