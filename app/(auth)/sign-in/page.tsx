import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Breadcrumb, ButtonLink, PageHeader } from "@/components/fluent";
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
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Studies", href: "/" }, { label: "Sign in" }]} />

      <PageHeader
        title="Sign in"
        description="Use the email and password you chose when you registered."
        actions={
          <ButtonLink href="/signup" variant="secondary">
            Register instead
          </ButtonLink>
        }
      />

      <SignInForm next={next} />
    </div>
  );
}
