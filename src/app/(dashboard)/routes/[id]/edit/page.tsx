import { RouteBuilder } from "@/features/routes/components";

export const instant = false;

interface EditRoutePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRoutePage({ params }: EditRoutePageProps) {
  const { id } = await params;
  return <RouteBuilder routeId={id} />;
}
