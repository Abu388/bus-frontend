import { RouteDetail } from "@/features/routes/components";

export const instant = false;

interface RoutePageProps {
  params: Promise<{ id: string }>;
}

export default async function RoutePage({ params }: RoutePageProps) {
  const { id } = await params;
  return <RouteDetail routeId={id} />;
}
