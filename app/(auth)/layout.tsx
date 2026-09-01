import type { ReactNode } from "react";

/**
 * Sign-in stands outside the three interfaces: no bar, no navigation, no
 * account menu — there is no account yet. Just the page.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-col overflow-hidden bg-bg-1">{children}</div>;
}
