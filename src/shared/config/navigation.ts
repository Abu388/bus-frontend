export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  badge?: string;
  category?: "fleet" | "operations" | "system";
  disabled?: boolean;
}

export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: "layout-dashboard",
    category: "fleet",
  },
  {
    id: "live-fleet-map",
    label: "Live Fleet Map",
    href: "/fleet/map",
    icon: "map-pin",
    badge: "Live",
    category: "fleet",
  },
  {
    id: "buses",
    label: "Buses",
    href: "/fleet/buses",
    icon: "bus",
    category: "fleet",
  },
  {
    id: "routes",
    label: "Routes",
    href: "/routes",
    icon: "git-branch",
    category: "operations",
  },
  {
    id: "fermatas",
    label: "Fermatas",
    href: "/fermatas",
    icon: "signpost",
    category: "operations",
  },
  {
    id: "fares",
    label: "Fares",
    href: "/fares",
    icon: "tag",
    category: "operations",
  },
  {
    id: "trips",
    label: "Trips",
    href: "/trips",
    icon: "calendar-clock",
    category: "operations",
  },
  {
    id: "payments-and-revenue",
    label: "Payments and Revenue",
    href: "/payments",
    icon: "credit-card",
    category: "operations",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    href: "/maintenance",
    icon: "wrench",
    category: "fleet",
  },
  {
    id: "audit-logs",
    label: "Audit Logs",
    href: "/audit",
    icon: "shield-alert",
    category: "system",
  },
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    icon: "bar-chart",
    category: "system",
  },
  {
    id: "users-and-roles",
    label: "Users & Roles",
    href: "/users",
    icon: "users",
    category: "system",
    disabled: true,
    badge: "Needs backend endpoints",
  },
];
