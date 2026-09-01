import type { ReactNode } from "react";
import { CheckmarkCircle, Dismiss, Info, LockClosed, Warning } from "@/components/icons";

export type MessageIntent = "info" | "success" | "warning" | "error" | "privacy";

const INTENT: Record<MessageIntent, { className: string; icon: ReactNode; iconClass: string }> = {
  info: { className: "border-brand-tint bg-brand-tint-2", icon: <Info />, iconClass: "text-brand" },
  success: { className: "border-success-stroke bg-success-bg", icon: <CheckmarkCircle />, iconClass: "text-success-fg" },
  warning: { className: "border-warning-stroke bg-warning-bg", icon: <Warning />, iconClass: "text-warning-fg" },
  error: { className: "border-danger-stroke bg-danger-bg", icon: <Dismiss />, iconClass: "text-danger-fg" },
  privacy: { className: "border-brand-tint bg-brand-tint-2", icon: <LockClosed />, iconClass: "text-brand" },
};

interface MessageBarProps {
  intent?: MessageIntent;
  title?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Screen readers announce errors immediately, everything else politely. */
  live?: boolean;
}

/** Fluent MessageBar: tinted surface, 1px stroke, leading intent icon. */
export function MessageBar({ intent = "info", title, children, actions, className = "", live = false }: MessageBarProps) {
  const meta = INTENT[intent];
  return (
    <div
      role={live ? (intent === "error" ? "alert" : "status") : undefined}
      className={`flex items-start gap-3 rounded-md border px-4 py-3 text-fg-1 ${meta.className} ${className}`}
    >
      <span className={`mt-0.5 shrink-0 [&>svg]:size-5 ${meta.iconClass}`}>{meta.icon}</span>
      <div className="min-w-0 flex-1 type-body">
        {title && <p className="type-body-strong">{title}</p>}
        <div className={title ? "text-fg-2" : ""}>{children}</div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
