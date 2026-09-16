import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageScroller } from "@/components/shell/page-scroller";

/*
 * The frame for registration.
 *
 * Sign-in gets the split brand panel, because a two-field form leaves room for
 * it. Seven steps do not: the panel would take half the width from a wizard
 * that needs it, and push the form into a column of its own. So the brand
 * shrinks to a bar and the wizard gets the page.
 *
 * Still not the portal shell — the rail, the study search and the account menu
 * all act for someone who is signed in, and there is no account yet.
 */
export function RegisterShell({ children }: { children: ReactNode }) {
  return (
    /* Same reason as the console: body does not scroll, this does, so it has
       to take focus or the keyboard cannot move a seven-step wizard. */
    <PageScroller className="scroll-thin flex h-full min-h-0 flex-col overflow-y-auto bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40">
      {/* Sticky, not just first: the wizard is long enough to scroll the brand
          and the way back out of sight otherwise. `main` is the scroll
          container, so the bar sticks to its top rather than the viewport's. */}
      <header className="sticky top-0 z-10 flex shrink-0 items-center bg-brand px-6 py-4">
        <Link href="/" className="flex items-center gap-3 rounded-xs focus-ring">
          <Image
            src="/PIC-LOGO-white.png"
            alt=""
            width={40}
            height={40}
            priority
            className="size-10 shrink-0 object-contain"
          />
          <span className="text-[16px] font-medium leading-6 text-white">BIL Research</span>
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6 px-6 py-8">{children}</div>
    </PageScroller>
  );
}
