import { ComingSoonPage } from "@/shared/ui/coming-soon-page";

export default function MaintenancePage() {
  return (
    <ComingSoonPage
      title="Fleet Maintenance"
      description="Record bus repair events, track vehicle downtime, and restore repaired vehicles back into active service."
      iconName="wrench"
      endpointHint="GET /api/maintenance/ & POST /api/buses/{id}/maintenance/"
    />
  );
}
