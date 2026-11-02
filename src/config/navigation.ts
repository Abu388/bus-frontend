export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  iconName: string;
  badge?: string;
  category?: "fleet" | "operations" | "system";
}

export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    iconName: "layout-dashboard",
    category: "fleet",
  },
  {
    id: "live-fleet-map",
    label: "Live Fleet Map",
    href: "/fleet/map",
    iconName: "map-pin",
    badge: "Live",
    category: "fleet",
  },
  {
    id: "buses",
    label: "Buses",
    href: "/fleet/buses",
    iconName: "bus",
    category: "fleet",
  },
  {
    id: "routes",
    label: "Routes",
    href: "/routes",
    iconName: "git-branch",
    category: "operations",
  },
  {
    id: "fermatas",
    label: "Fermatas",
    href: "/fermatas",
    iconName: "signpost",
    category: "operations",
  },
  {
    id: "fares",
    label: "Fares",
    href: "/fares",
    iconName: "tag",
    category: "operations",
  },
  {
    id: "trips",
    label: "Trips",
    href: "/trips",
    iconName: "calendar-clock",
    category: "operations",
  },
  {
    id: "payments-and-revenue",
    label: "Payments and Revenue",
    href: "/payments",
    iconName: "credit-card",
    category: "operations",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    href: "/maintenance",
    iconName: "wrench",
    category: "fleet",
  },
  {
    id: "audit-logs",
    label: "Audit Logs",
    href: "/audit",
    iconName: "shield-alert",
    category: "system",
  },
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    iconName: "bar-chart",
    category: "system",
  },
  {
    id: "users-and-roles",
    label: "Users and Roles",
    href: "/users",
    iconName: "users",
    category: "system",
  },
];
