"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn, type SignInResult } from "@/app/(auth)/login/actions";
import { FIELD, LABEL, SUBMIT } from "@/components/auth/controls";
import { Button, MessageBar } from "@/components/fluent";
import { EyeClosed, EyeOpen } from "@/components/icons";

/*
 * "Login Screen" frame, right half: 450px column · label 18/25 medium #424242 ·
 * field 54px, 16px radius, 16/24 padding · button 57px in the accent · the OR
 * rule in #E0E0E0 · the federated button at 56px on a 0.8px #E0E0E0 outline.
 *
 * The frame's #6E6CDF becomes the brand indigo, and its 700/600 weights become
 * 600, the app-wide ceiling.
 */



export function LoginForm() {
  const [state, formAction, pending] = useActionState<SignInResult | null, FormData>(signIn, null);
  const [reveal, setReveal] = useState(false);

  return (
    <form action={formAction} className="flex w-full max-w-[450px] flex-col gap-5">
      <div className="text-center">
        <h1 className="text-[36px] font-semibold leading-[110%] text-[#424242]">Welcome back</h1>
        <p className="mt-2 text-[16px] leading-[140%] tracking-[0.2px] text-field-label">Please log in to your account</p>
      </div>

      {state && !state.ok && state.message && !state.errors && (
        <MessageBar intent="info" live>
          {state.message}
        </MessageBar>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={LABEL}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.ac.uk"
          aria-invalid={Boolean(state?.errors?.email) || undefined}
          aria-describedby={state?.errors?.email ? "email-error" : undefined}
          className={`${FIELD} ${state?.errors?.email ? "border-danger-fg" : "border-brand/80"}`}
        />
        {state?.errors?.email && (
          <p id="email-error" role="alert" className="text-[14px] leading-[20px] text-danger-fg">
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
          <p id="password-error" role="alert" className="text-[14px] leading-[20px] text-danger-fg">
            {state.errors.password}
          </p>
        )}
      </div>

      <Link
        href="/login"
        className="self-end rounded-xs text-[16px] font-medium leading-[22px] tracking-[0.2px] text-brand hover:underline focus-ring"
      >
        Forgot password
      </Link>

      <Button
        type="submit"
        variant="primary"
        loading={pending}
        className={SUBMIT}
      >
        Sign in
      </Button>
    </form>
  );
}
