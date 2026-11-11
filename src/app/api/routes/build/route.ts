import { NextResponse } from "next/server";
import {
  applySessionCookie,
  getDjangoSession,
  isAuthenticated,
  upstreamErrorResponse,
} from "@/shared/api/django-server";
import { BuildRoutePayloadSchema } from "@/features/routes/builder/schemas";
import { createRouteFromPayload } from "@/features/routes/server/build-route";

export async function POST(request: Request) {
  const session = await getDjangoSession();

  if (!isAuthenticated(session)) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
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
    const route = await createRouteFromPayload(session, parsed.data);
    return applySessionCookie(NextResponse.json(route, { status: 201 }), session);
  } catch (error) {
    return upstreamErrorResponse(error, session);
  }
}
