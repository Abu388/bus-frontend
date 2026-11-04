"use client";

import * as React from "react";
import { ComingSoonPage } from "@/shared/ui";

export default function UsersPage() {
  return (
    <ComingSoonPage
      title="Users & Roles"
      description="Manage staff accounts, assign operational roles, and set system permissions."
      iconName="users"
      badge="Needs backend endpoints"
      plannedFeatures={[
        "View registered staff, cashiers, and system admins",
        "Invite and register administrative personnel",
        "Role-based permission assignment and role change auditing",
        "Account suspension and security activity logs",
      ]}
      backendEndpoints={[
        "GET /api/accounts/users/ (Pending)",
        "POST /api/accounts/invite/ (Pending)",
        "PATCH /api/accounts/users/{id}/role/ (Pending)",
      ]}
    />
  );
}
