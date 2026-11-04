import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ROUTE_URL } from "@/shared/config/map";
import { geoRouteCache, checkRateLimit } from "@/shared/lib/geo-cache";

const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

const RouteRequestSchema = z.object({
  points: z.array(LatLngSchema).min(2, "At least 2 points are required for routing"),
});

// Haversine distance in meters
function haversineDistanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371e3;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const v =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(v), Math.sqrt(1 - v));
  return R * c;
}

export async function POST(request: NextRequest) {
  // 1. Session cookie authentication
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  // 2. Rate limiting
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  if (!checkRateLimit(`geo_route_${ip}`)) {
    return NextResponse.json(
      { message: "Too many routing requests. Please slow down." },
      { status: 429 }
    );
  }

  // 3. Validation
  const rawBody = await request.json().catch(() => null);
  const parsed = RouteRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid routing coordinates", errors: parsed.error.format() },
      { status: 400 }
    );
  }

  const { points } = parsed.data;

  // Format OSRM coordinate string: lon,lat;lon,lat;...
  const coordString = points.map((p) => `${p.lon.toFixed(5)},${p.lat.toFixed(5)}`).join(";");
  const cacheKey = `route:${coordString}`;

  const cached = geoRouteCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // 4. Query OSRM routing engine
  const osrmUrl = `${ROUTE_URL}/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(osrmUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const result = {
          coordinates: route.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]),
          distanceMeters: Math.round(route.distance),
          durationSeconds: Math.round(route.duration),
        };

        geoRouteCache.set(cacheKey, result, 30 * 60 * 1000); // 30 min cache
        return NextResponse.json(result);
      }
    }
  } catch {
    // OSRM failed or unreachable, fall through to Haversine straight-segment calculation
  }

  // 5. Fallback multi-segment calculation
  let totalDistanceMeters = 0;
  const coordinates: [number, number][] = points.map((p) => [p.lat, p.lon]);
  for (let i = 0; i < points.length - 1; i++) {
    totalDistanceMeters += haversineDistanceMeters(points[i], points[i + 1]);
  }
  // Assume city bus avg speed ~30 km/h (8.33 m/s)
  const durationSeconds = Math.round(totalDistanceMeters / 8.33);

  const fallbackResult = {
    coordinates,
    distanceMeters: Math.round(totalDistanceMeters),
    durationSeconds,
    isFallback: true,
  };

  geoRouteCache.set(cacheKey, fallbackResult, 10 * 60 * 1000);
  return NextResponse.json(fallbackResult);
}
