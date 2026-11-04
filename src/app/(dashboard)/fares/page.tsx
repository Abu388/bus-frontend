import { ComingSoonPage } from "@/shared/ui/coming-soon-page";

export default function FaresPage() {
  return (
    <ComingSoonPage
      title="Fares Configuration"
      description="Set and schedule route pricing matrices in ETB with effective date auditing and automated versioning."
      iconName="tag"
      endpointHint="GET /api/ & POST /api/ & GET /api/admin/fares/history/"
    />
  );
}
