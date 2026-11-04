import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { GEOCODE_URL } from "@/shared/config/map";
import { geoSearchCache, checkRateLimit } from "@/shared/lib/geo-cache";

const SearchQuerySchema = z.object({
  q: z.string().trim().min(2, "Search query must be at least 2 characters").max(100),
  limit: z.coerce.number().int().min(1).max(20).default(6),
});

export async function GET(request: NextRequest) {
  // 1. Session cookie authentication
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  // 2. Light rate limiting
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  if (!checkRateLimit(`geo_search_${ip}`)) {
    return NextResponse.json(
      { message: "Too many geocoding requests. Please slow down." },
      { status: 429 }
    );
  }

  // 3. Input validation
  const searchParams = request.nextUrl.searchParams;
  const parsed = SearchQuerySchema.safeParse({
    q: searchParams.get("q"),
    limit: searchParams.get("limit") ?? 6,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid search query", errors: parsed.error.format() },
      { status: 400 }
    );
  }

  const { q, limit } = parsed.data;
  const cacheKey = `search:${q.toLowerCase()}:${limit}`;
  const cached = geoSearchCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // 4. Request from backend Nominatim (scoped to Ethiopia via countrycodes=et)
  try {
    const url = `${GEOCODE_URL}/search?q=${encodeURIComponent(q)}&format=json&limit=${limit}&countrycodes=et`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "AnbessaBusStaffPortal/1.0",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { message: "Geocoding service unavailable" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const results = Array.isArray(data)
      ? data.map((item: Record<string, unknown>) => ({
          placeId: Number(item.place_id),
          displayName: String(item.display_name ?? ""),
          lat: parseFloat(String(item.lat)),
          lon: parseFloat(String(item.lon)),
        }))
      : [];

    geoSearchCache.set(cacheKey, results, 10 * 60 * 1000); // 10 min TTL
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to connect to geocoding service",
        error: error instanceof Error ? error.message : "Network error",
      },
      { status: 502 }
    );
  }
}
