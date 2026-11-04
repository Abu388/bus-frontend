import { ComingSoonPage } from "@/components/coming-soon-page";

export default function AuditPage() {
  return (
    <ComingSoonPage
      title="Audit Logs"
      description="Inspect immutable audit event records tracking admin actions, fare updates, and system mutations."
      iconName="shield-alert"
      endpointHint="GET /api/admin/audit/"
    />
  );
}
