import * as React from "react";
import { cn } from "@/shared/lib/utils";

export type StatusType =
  | "valid"
  | "active"
  | "expired"
  | "maintenance"
  | "warning"
  | "ended"
  | "completed"
  | "retired"
  | "inactive";

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
      defaultLabel: "In Maintenance",
      solid: "bg-warning text-warning-foreground",
      subtle: "border border-warning text-foreground bg-accent-soft/60",
      dot: "bg-warning",
    },
    warning: {
      defaultLabel: "Warning",
      solid: "bg-warning text-warning-foreground",
      subtle: "border border-warning text-warning bg-card",
      dot: "bg-warning",
    },
    ended: {
      defaultLabel: "Ended",
      solid: "bg-muted text-muted-foreground",
      subtle: "border border-border text-muted-foreground bg-muted/40",
      dot: "bg-muted-foreground",
    },
    completed: {
      defaultLabel: "Completed",
      solid: "bg-muted text-muted-foreground",
      subtle: "border border-border text-muted-foreground bg-muted/40",
      dot: "bg-muted-foreground",
    },
    retired: {
      defaultLabel: "Retired",
      solid: "bg-danger text-danger-foreground",
      subtle: "border border-border text-muted-foreground bg-muted/40 line-through",
      dot: "bg-danger",
    },
    inactive: {
      defaultLabel: "Inactive",
      solid: "bg-muted text-muted-foreground",
      subtle: "border border-border text-muted-foreground bg-muted/40",
      dot: "bg-muted-foreground",
    },
  };

  const current = config[status] ?? config.active;
  const displayLabel = label ?? current.defaultLabel;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
        variant === "solid" ? current.solid : current.subtle,
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", current.dot)}
          aria-hidden="true"
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
}
