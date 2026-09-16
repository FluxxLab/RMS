import type { Metadata } from "next";
import { AuthSplit } from "@/components/auth/auth-split";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in · BIL RMS" };

/** Staff sign-in. The frame is shared with the participant's front door. */
export default function LoginPage() {
  return (
    <AuthSplit
      wordmark="BIL RMS"
      tagline="Research Management System. Studies, sessions and bookings in one place."
    >
      <LoginForm />
    </AuthSplit>
  );
}
