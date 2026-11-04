import { ComingSoonPage } from "@/components/coming-soon-page";

export default function ReportsPage() {
  return (
    <ComingSoonPage
      title="Reports & Analytics"
      description="Aggregated operational and financial metrics grouped by local Addis Ababa calendar day."
      iconName="bar-chart"
      endpointHint="GET /api/admin/reports/summary/ & GET /api/admin/buses/{id}/trips/"
    />
  );
}
