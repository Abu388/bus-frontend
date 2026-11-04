import { ComingSoonPage } from "@/components/coming-soon-page";

export default function BusesPage() {
  return (
    <ComingSoonPage
      title="Buses Management"
      description="Register and manage physical fleet inventory, plate numbers (Targa), seating capacities, and operational statuses."
      iconName="bus"
      endpointHint="GET /api/buses/ & POST /api/buses/"
    />
  );
}
