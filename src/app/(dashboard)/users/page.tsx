import { ComingSoonPage } from "@/components/coming-soon-page";

export default function UsersPage() {
  return (
    <ComingSoonPage
      title="Users and Roles"
      description="Manage staff credentials, dispatch cashier assignments, and monitor user roles (admin, casher, passenger)."
      iconName="users"
      endpointHint="POST /api/register/ & Auth System"
    />
  );
}
