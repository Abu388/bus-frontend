import { ComingSoonPage } from "@/components/coming-soon-page";

export default function RoutesPage() {
  return (
    <ComingSoonPage
      title="Routes"
      description="Configure public transit lines, sequence stop stops (Fermatas), and define outbound/inbound polyline geometry."
      iconName="git-branch"
      endpointHint="GET /api/routes/ & POST /api/routes/"
    />
  );
}
