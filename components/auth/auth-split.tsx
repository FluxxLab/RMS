import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/*
 * The front door, shared by staff sign-in and by the participant's own sign-in
 * and registration: the brand panel on the left, the form on the right. The
 * panel carries the same indigo as the app's bar, so arriving here reads as the
 * front door of the same product. Below lg it collapses and the form leads.
 *
 * None of the three interfaces' navigation appears — there is no account yet to
 * navigate on behalf of.
 */
interface AuthSplitProps {
  /** The product name on the brand panel: the staff console and the participant portal name themselves differently. */
  wordmark: string;
  tagline: string;
  /** Where the brand panel's logo leads. Staff have no public home to return to. */
  homeHref?: string;
  children: ReactNode;
}

export function AuthSplit({ wordmark, tagline, homeHref, children }: AuthSplitProps) {
  const mark = (
    <span className="flex items-center gap-3">
      <Image
        src="/PIC-LOGO-white.png"
        alt=""
        width={72}
        height={72}
        priority
        className="size-[72px] shrink-0 object-contain"
      />
      <span className="text-base font-semibold leading-6">{wordmark}</span>
    </span>
  );

  return (
    <main className="grid h-full min-h-0 lg:grid-cols-2">
      <section className="hidden min-h-0 flex-col justify-between overflow-hidden bg-brand p-10 text-white lg:flex">
        {homeHref ? (
          <Link href={homeHref} className="w-fit rounded-xs focus-ring">
            {mark}
          </Link>
        ) : (
          mark
        )}

        <div className="max-w-md">
          <p className="text-[32px] font-semibold leading-[40px]">Behavioural Insights Lab</p>
          <p className="mt-4 text-[16px] leading-[24px] text-white/80">{tagline}</p>
        </div>

        <p className="text-[14px] leading-[20px] text-white/70">
          Participants are identified by pseudonym. Names and email addresses stay in the identity vault.
        </p>
      </section>

      <section className="scroll-thin flex min-h-0 items-center justify-center overflow-y-auto px-6 py-8">
        {children}
      </section>
    </main>
  );
}
