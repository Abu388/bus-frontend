import { ComingSoonPage } from "@/components/coming-soon-page";

export default function FermatasPage() {
  return (
    <ComingSoonPage
      title="Fermatas (Bus Stations)"
      description="Manage station codes, GPS coordinates across Addis Ababa, and stop connectivity indicators."
      iconName="signpost"
      endpointHint="GET /api/fermatas/ & POST /api/fermatas/"
    />
  );
}
