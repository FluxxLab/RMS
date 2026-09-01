"use client";

import { useActionState } from "react";
import { signIn, type SignInResult } from "@/app/(portal)/sign-in/actions";
import { Button, Card, Field, Input, MessageBar } from "@/components/fluent";

/** Participant sign-in. The API decides; this form only carries the answer. */
export function SignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<SignInResult | null, FormData>(signIn, null);

  return (
    <Card padding="lg" className="w-full max-w-[440px]">
      <form action={formAction} className="flex flex-col gap-5" noValidate>
        {state && !state.ok && !state.errors && (
          <MessageBar intent="error" live>
            {state.message}
          </MessageBar>
        )}

        <input type="hidden" name="next" value={next} />

        <Field label="Email address" error={state?.errors?.email}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              aria-describedby={describedBy}
              invalid={invalid}
              required
            />
          )}
        </Field>

        <Field label="Password" error={state?.errors?.password}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="password"
              type="password"
              autoComplete="current-password"
              aria-describedby={describedBy}
              invalid={invalid}
              required
            />
          )}
        </Field>

        <Button type="submit" variant="primary" size="lg" loading={pending}>
          Sign in
        </Button>
      </form>
    </Card>
  );
}
