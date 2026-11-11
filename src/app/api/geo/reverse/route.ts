import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { GEOCODE_URL } from "@/shared/config/map";
import { geoReverseCache, checkRateLimit } from "@/shared/lib/geo-cache";

const ReverseQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

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
  if (!checkRateLimit(`geo_reverse_${ip}`)) {
    return NextResponse.json(
      { message: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  // 3. Validation
  const searchParams = request.nextUrl.searchParams;
  const parsed = ReverseQuerySchema.safeParse({
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
  // Round to 5 decimal places (~1m precision) for a stable cache key.
  const roundLat = lat.toFixed(5);
  const roundLon = lon.toFixed(5);
  const cacheKey = `reverse:${roundLat},${roundLon}`;

  const cached = geoReverseCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // 4. Request from backend Nominatim
  try {
    const url =
      `${GEOCODE_URL}/reverse?lat=${roundLat}&lon=${roundLon}` +
      "&format=json&addressdetails=1&zoom=18&accept-language=en";
    const res = await fetch(url, {
      headers: {
        // Apache in front of this Nominatim instance returns 406 for a strict
        // JSON Accept header, so include a wildcard fallback.
        Accept: "application/json, text/plain, */*",
        "User-Agent": "AnbessaBusStaffPortal/1.0 (admin route builder)",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { message: "Reverse geocoding service unavailable" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const result = {
      placeId: Number(data.place_id ?? 0),
      displayName: String(data.display_name ?? ""),
      address: data.address ?? {},
      lat: parseFloat(String(data.lat ?? lat)),
      lon: parseFloat(String(data.lon ?? lon)),
    };

    geoReverseCache.set(cacheKey, result, 10 * 60 * 1000); // 10 min TTL
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to reverse geocode coordinate",
        error: error instanceof Error ? error.message : "Network error",
      },
      { status: 502 }
    );
  }
}
