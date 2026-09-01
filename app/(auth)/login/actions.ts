"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminLogin, apiMessage, SESSION_COOKIE } from "@/lib/api";

/*
 * Sign-in against the research API. The API verifies the credential and issues
 * the session; this only carries the answer and stores the token in an
 * httpOnly cookie, so it is never readable from the browser.
 */

const Credentials = z.object({
  email: z.email("Enter the email address you registered with."),
  password: z.string().min(1, "Enter your password."),
});

export interface SignInResult {
  ok: boolean;
  message: string;
  /** Field-level messages, keyed by input name. */
  errors?: Partial<Record<"email" | "password", string>>;
}

export async function signIn(_prev: SignInResult | null, formData: FormData): Promise<SignInResult> {
  const parsed = Credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const errors: SignInResult["errors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "email" || field === "password") errors[field] = issue.message;
    }
    return { ok: false, message: "Check the details below.", errors };
  }

  const result = await adminLogin(parsed.data.email, parsed.data.password);

  if (!result.ok) {
    // A wrong credential must not say which half was wrong.
    if (result.error.kind === "unauthorised") {
      return { ok: false, message: "That email and password do not match an account." };
    }
    return { ok: false, message: apiMessage(result.error) };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, result.data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: result.data.maxAge,
  });

  redirect("/staff/dashboard");
}
