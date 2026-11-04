import { ComingSoonPage } from "@/components/coming-soon-page";

export default function FleetMapPage() {
  return (
    <ComingSoonPage
      title="Live Fleet Map"
      description="Real-time GPS vehicle location tracking, route trajectory overlays, and live fermata ETA calculations."
      iconName="map-pin"
      endpointHint="GET /api/buses/live/ & GET /api/buses/{id}/eta/"
    />
  );
}
