import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ROUTE_URL } from "@/shared/config/map";
import { geoNearestCache, checkRateLimit } from "@/shared/lib/geo-cache";

const NearestQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

interface NearestResult {
  snapped: { lat: number; lon: number };
  name: string;
  distanceMeters: number;
}

export async function GET(request: NextRequest) {
  // 1. Session cookie authentication
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  // 2. Rate limiting
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  if (!checkRateLimit(`geo_nearest_${ip}`)) {
    return NextResponse.json(
      { message: "Too many routing requests. Please slow down." },
      { status: 429 }
    );
  }

  // 3. Validation
  const searchParams = request.nextUrl.searchParams;
  const parsed = NearestQuerySchema.safeParse({
    lat: searchParams.get("lat"),
    lon: searchParams.get("lon"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid latitude or longitude", errors: parsed.error.format() },
      { status: 400 }
    );
  }

  const { lat, lon } = parsed.data;
  const roundLat = lat.toFixed(5);
  const roundLon = lon.toFixed(5);
  const cacheKey = `nearest:${roundLon},${roundLat}`;

  const cached = geoNearestCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // 4. Query OSRM nearest road segment
  const osrmUrl = `${ROUTE_URL}/nearest/v1/driving/${roundLon},${roundLat}?number=1`;

  try {
    const res = await fetch(osrmUrl, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { message: "Routing service unavailable" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const waypoint = data?.waypoints?.[0];
    if (data?.code !== "Ok" || !waypoint?.location) {
      return NextResponse.json(
        { message: "No nearby road found" },
        { status: 404 }
      );
    }

    const [snappedLon, snappedLat] = waypoint.location as [number, number];
    const result: NearestResult = {
      snapped: { lat: Number(snappedLat), lon: Number(snappedLon) },
      name: String(waypoint.name ?? "").trim(),
      distanceMeters: Number(waypoint.distance ?? 0),
    };

    geoNearestCache.set(cacheKey, result, 10 * 60 * 1000);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to snap coordinate to a road",
        error: error instanceof Error ? error.message : "Network error",
      },
      { status: 502 }
    );
  }
}
