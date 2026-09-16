import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthSplit } from "@/components/auth/auth-split";
import { SignInForm } from "@/components/portal/sign-in-form";
import { isParticipant, readSession } from "@/lib/api";

export const metadata: Metadata = { title: "Sign in · BIL Research" };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  if (isParticipant(await readSession())) redirect("/bookings");

  const next = first((await searchParams).next);

  return (
    <AuthSplit
      wordmark="BIL Research"
      tagline="Take part in a supervised session, see exactly who each study is for before you book, and get paid for your time."
      homeHref="/"
    >
      <SignInForm next={next} />
    </AuthSplit>
  );
}
