import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusType = "valid" | "active" | "expired" | "maintenance" | "warning";

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
  label?: string;
  variant?: "solid" | "subtle";
  showDot?: boolean;
}

export function StatusPill({
  status,
  label,
  variant = "subtle",
  showDot = true,
  className,
  ...props
}: StatusPillProps) {
  // Mapping as specified:
  // valid = success, active = success, expired = danger, maintenance = danger
  const config: Record<
    StatusType,
    { defaultLabel: string; solid: string; subtle: string; dot: string }
  > = {
    valid: {
      defaultLabel: "Valid",
      solid: "bg-success text-success-foreground",
      subtle: "border border-success text-success bg-card",
      dot: "bg-success",
    },
    active: {
      defaultLabel: "Active",
      solid: "bg-success text-success-foreground",
      subtle: "border border-success text-success bg-card",
      dot: "bg-success",
    },
    expired: {
      defaultLabel: "Expired",
      solid: "bg-danger text-danger-foreground",
      subtle: "border border-danger text-danger bg-card",
      dot: "bg-danger",
    },
    maintenance: {
      defaultLabel: "Maintenance",
      solid: "bg-danger text-danger-foreground",
      subtle: "border border-danger text-danger bg-card",
      dot: "bg-danger",
    },
    warning: {
      defaultLabel: "Warning",
      solid: "bg-warning text-warning-foreground",
      subtle: "border border-warning text-warning bg-card",
      dot: "bg-warning",
    },
  };

  const current = config[status] || config.active;
  const displayLabel = label || current.defaultLabel;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none",
        variant === "solid" ? current.solid : current.subtle,
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "solid" ? "bg-current" : current.dot
          )}
          aria-hidden="true"
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
}
