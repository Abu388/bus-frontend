import { NextResponse } from "next/server";
import {
  applySessionCookie,
  getDjangoSession,
  isAuthenticated,
  upstreamErrorResponse,
} from "@/shared/api/django-server";
import { BuildRoutePayloadSchema } from "@/features/routes/builder/schemas";
import { updateRouteFromPayload } from "@/features/routes/server/build-route";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await getDjangoSession();

  if (!isAuthenticated(session)) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ message: "Route id is required" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = BuildRoutePayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid route build payload.",
        errors: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const route = await updateRouteFromPayload(session, id, parsed.data);
    return applySessionCookie(NextResponse.json(route), session);
  } catch (error) {
    return upstreamErrorResponse(error, session);
  }
}
