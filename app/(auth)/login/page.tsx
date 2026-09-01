import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in · BIL RMS" };

/**
 * A split screen: the brand panel on the left, the form on the right. The
 * panel carries the same indigo as the app's bar, so signing in reads as the
 * front door of the same product. Below lg it collapses and the form leads.
 */
export default function LoginPage() {
  return (
    <main className="grid h-full min-h-0 lg:grid-cols-2">
      <section className="hidden min-h-0 flex-col justify-between overflow-hidden bg-brand p-10 text-white lg:flex">
        <span className="flex items-center gap-3">
          <Image src="/PIC-LOGO-white.png" alt="" width={72} height={72} priority className="size-[72px] shrink-0 object-contain" />
          <span className="text-base font-semibold leading-6">BIL RMS</span>
        </span>

        <div className="max-w-md">
          <p className="text-[32px] font-semibold leading-[40px]">Behavioural Insights Lab</p>
          <p className="mt-4 text-[16px] leading-[24px] text-white/80">
            Research Management System. Studies, sessions and bookings in one place.
          </p>
        </div>

        <p className="text-[14px] leading-[20px] text-white/70">
          Participants are identified by pseudonym. Names and email addresses stay in the identity vault.
        </p>
      </section>

      <section className="scroll-thin flex min-h-0 items-center justify-center overflow-y-auto px-6 py-8">
        <LoginForm />
      </section>
    </main>
  );
}
