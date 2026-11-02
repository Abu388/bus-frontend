import { ComingSoonPage } from "@/components/coming-soon-page";

export default function TripsPage() {
  return (
    <ComingSoonPage
      title="Trips Dispatch"
      description="Monitor active driver runs, end-of-line route reversals, and trip-specific rotating QR tokens."
      iconName="calendar-clock"
      endpointHint="GET /api/trips/ & GET /api/admin/trips/"
    />
  );
}
