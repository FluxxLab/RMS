"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn, type SignInResult } from "@/app/(auth)/sign-in/actions";
import { FIELD, FIELD_ERROR, LABEL, SUBMIT } from "@/components/auth/controls";
import { Button, MessageBar } from "@/components/fluent";
import { EyeClosed, EyeOpen } from "@/components/icons";

/*
 * Participant sign-in. The API decides; this form only carries the answer.
 *
 * It wears the same frame as staff sign-in — one front door, drawn once — and
 * differs only where the audience does: a participant may not have an account
 * yet, so registering is offered alongside.
 */
export function SignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<SignInResult | null, FormData>(signIn, null);
  const [reveal, setReveal] = useState(false);

  return (
    <form action={formAction} className="flex w-full max-w-[450px] flex-col gap-5" noValidate>
      <div className="text-center">
        <h1 className="text-[36px] font-semibold leading-[110%] text-[#424242]">Welcome back</h1>
        <p className="mt-2 text-[16px] leading-[140%] tracking-[0.2px] text-field-label">
          Use the email and password you chose when you registered
        </p>
      </div>

      {state && !state.ok && !state.errors && (
        <MessageBar intent="error" live>
          {state.message}
        </MessageBar>
      )}

      <input type="hidden" name="next" value={next} />

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={LABEL}>
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(state?.errors?.email) || undefined}
          aria-describedby={state?.errors?.email ? "email-error" : undefined}
          className={`${FIELD} ${state?.errors?.email ? "border-danger-fg" : "border-brand/80"}`}
        />
        {state?.errors?.email && (
          <p id="email-error" role="alert" className={FIELD_ERROR}>
            {state.errors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className={LABEL}>
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={reveal ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            aria-invalid={Boolean(state?.errors?.password) || undefined}
            aria-describedby={state?.errors?.password ? "password-error" : undefined}
            className={`${FIELD} pr-14 ${state?.errors?.password ? "border-danger-fg" : "border-[#BDBDBD]"}`}
          />
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? "Hide password" : "Show password"}
            aria-pressed={reveal}
            className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-sm text-field-label hover:text-fg-2 focus-ring [&>svg]:size-5"
          >
            {reveal ? <EyeClosed /> : <EyeOpen />}
          </button>
        </div>
        {state?.errors?.password && (
          <p id="password-error" role="alert" className={FIELD_ERROR}>
            {state.errors.password}
          </p>
        )}
      </div>

      <Button type="submit" variant="primary" loading={pending} className={SUBMIT}>
        Sign in
      </Button>

      <p className="text-center text-[16px] leading-[22px] tracking-[0.2px] text-field-label">
        New here?{" "}
        <Link href="/signup" className="rounded-xs font-medium text-brand hover:underline focus-ring">
          Register
        </Link>
      </p>
    </form>
  );
}
