export const AUDIT_ACTION_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "accent" | "outline" | "secondary";
    className?: string;
  }
> = {
  "payment.initiated": {
    label: "Payment Initiated",
    variant: "outline",
    className: "border-amber-500/40 text-amber-600 bg-amber-500/10 font-medium",
  },
  "payment.succeeded": {
    label: "Payment Succeeded",
    variant: "accent",
    className: "border-emerald-500/40 text-emerald-600 bg-emerald-500/10 font-semibold",
  },
  "payment.failed": {
    label: "Payment Failed",
    variant: "outline",
    className: "border-danger/40 text-danger bg-danger/10 font-semibold",
  },
  "ticket.issued": {
    label: "Ticket Issued",
    variant: "default",
    className: "bg-primary text-primary-foreground font-semibold",
  },
  "ticket.validated": {
    label: "Ticket Validated",
    variant: "accent",
    className: "border-emerald-500/40 text-emerald-600 bg-emerald-500/10 font-medium",
  },
  "fare.changed": {
    label: "Fare Changed",
    variant: "accent",
  },
  "bus.maintenance_started": {
    label: "Maintenance Started",
    variant: "outline",
    className: "border-danger/30 text-danger",
  },
  "bus.maintenance_ended": {
    label: "Maintenance Ended",
    variant: "outline",
    className: "border-emerald-500/30 text-emerald-600",
  },
  "trip.started": {
    label: "Trip Started",
    variant: "default",
  },
  "trip.ended": {
    label: "Trip Ended",
    variant: "outline",
  },
  "route.updated": {
    label: "Route Updated",
    variant: "outline",
  },
  "user.role_changed": {
    label: "User Role Changed",
    variant: "outline",
  },
  "user.suspended": {
    label: "User Suspended",
    variant: "outline",
    className: "border-danger/30 text-danger",
  },
};

export function getAuditActionLabel(action: string): string {
  if (AUDIT_ACTION_CONFIG[action]) {
    return AUDIT_ACTION_CONFIG[action].label;
  }
  return action
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getAuditActionBadgeProps(action: string): {
  variant: "default" | "accent" | "outline" | "secondary";
  className?: string;
  label: string;
} {
  const config = AUDIT_ACTION_CONFIG[action];
  const label = getAuditActionLabel(action);

  if (config) {
    return {
      variant: config.variant,
      className: config.className,
      label,
    };
  }

  if (action.startsWith("payment.")) {
    return {
      variant: action.includes("succeeded") ? "accent" : action.includes("failed") ? "outline" : "default",
      className: action.includes("failed") ? "border-danger/40 text-danger bg-danger/10" : undefined,
      label,
    };
  }

  if (action.startsWith("ticket.")) {
    return {
      variant: "default",
      label,
    };
  }

  return {
    variant: "outline",
    label,
  };
}

export function isPaymentOrTicketAction(action: string): boolean {
  return (
    action === "payment.initiated" ||
    action === "payment.succeeded" ||
    action === "payment.failed" ||
    action === "ticket.issued" ||
    action === "ticket.validated" ||
    action.startsWith("payment.") ||
    action.startsWith("ticket.")
  );
}

