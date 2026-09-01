import type { ReactNode } from "react";
import { EmptyState } from "./empty-state";

interface ConsolePlaceholderProps {
  icon: ReactNode;
  title: string;
  hint: string;
}

/** Shell-consistent empty state for console views not yet wired to data. */
export function ConsolePlaceholder({ icon, title, hint }: ConsolePlaceholderProps) {
  return (
    <div className="m-4 flex min-h-0 flex-1 rounded-sm border-[0.25px] border-hairline bg-surface shadow-card">
      <EmptyState icon={icon} title={title} hint={hint} />
    </div>
  );
}
