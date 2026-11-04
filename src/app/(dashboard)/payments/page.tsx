import { ComingSoonPage } from "@/shared/ui/coming-soon-page";

export default function PaymentsPage() {
  return (
    <ComingSoonPage
      title="Payments and Revenue"
      description="Track digital fare collections via Telebirr and Chapa, monitor webhook reconciliation, and review daily income."
      iconName="credit-card"
      endpointHint="GET /api/payments/{id}/ & GET /api/trips/{id}/payments/"
    />
  );
}
