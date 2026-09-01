import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  /** Explains what action would populate the view. */
  hint: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-brand-tint text-brand [&>svg]:size-7">
        {icon}
      </div>
      <p className="text-base font-medium text-ink">{title}</p>
      <p className="max-w-sm text-icon">{hint}</p>
      {action}
    </div>
  );
}
