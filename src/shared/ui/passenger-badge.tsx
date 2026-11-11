import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { UserIcon } from "@/shared/ui/icons";
import { parsePassengerCount, formatPassengerCount } from "@/shared/lib/format";

export interface PassengerBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count?: number | string | null;
  /** Whether to capitalize the passenger noun: "6 Passengers" vs "6 passengers" (default: true) */
  capitalize?: boolean;
  /** Whether to display the user/group icon (default: true) */
  showIcon?: boolean;
  /** Size variant */
  size?: "sm" | "md";
  /** Optional unit fare to show in tooltip or alongside */
  unitFare?: number | string | null;
}

export function PassengerBadge({
  count,
  capitalize = true,
  showIcon = true,
  size = "md",
  unitFare,
  className,
  ...props
}: PassengerBadgeProps) {
  const n = parsePassengerCount(count);
  const isGroup = n > 1;
  const label = formatPassengerCount(n, { capitalize });

  const sizeClasses =
    size === "sm"
      ? "px-1.5 py-0.5 text-[10px] gap-1"
      : "px-2.5 py-0.5 text-xs gap-1.5";

  // Group pill (highlighted when passenger_count > 1) vs 1 passenger subtle pill
  const groupClasses = isGroup
    ? "border border-accent-strong/40 bg-accent-soft text-accent-foreground font-semibold shadow-xs"
    : "border border-border/70 bg-muted/70 text-muted-foreground font-medium";

  const tooltip = isGroup && unitFare
    ? `${label} (${unitFare} ETB each)`
    : label;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full transition-colors whitespace-nowrap",
        sizeClasses,
        groupClasses,
        className
      )}
      title={tooltip}
      data-passenger-count={n}
      data-is-group={isGroup ? "true" : "false"}
      {...props}
    >
      {showIcon && (
        <UserIcon
          className={cn(
            "shrink-0",
            size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
            isGroup ? "text-accent-foreground" : "text-muted-foreground"
          )}
        />
      )}
      <span>{label}</span>
    </span>
  );
}
