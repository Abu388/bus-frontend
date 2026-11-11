import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { GEOCODE_URL } from "@/shared/config/map";
import { geoSearchCache, checkRateLimit } from "@/shared/lib/geo-cache";

const SearchQuerySchema = z.object({
  q: z.string().trim().min(2, "Search query must be at least 2 characters").max(100),
  limit: z.coerce.number().int().min(1).max(20).default(8),
  // minLon,minLat,maxLon,maxLat — used for the bounded "OSM bus stops in view" search.
  viewbox: z
    .string()
    .trim()
    .max(120)
    .regex(
      /^-?\d{1,3}(\.\d+)?(,-?\d{1,3}(\.\d+)?){3}$/,
      "viewbox must be minLon,minLat,maxLon,maxLat"
    )
    .optional(),
  bounded: z.enum(["0", "1"]).optional(),
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
    limit: searchParams.get("limit") ?? 8,
    viewbox: searchParams.get("viewbox") ?? undefined,
    bounded: searchParams.get("bounded") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid search query", errors: parsed.error.format() },
      { status: 400 }
    );
  }

  const { q, limit, viewbox, bounded } = parsed.data;
  const cacheKey = `search:${q.toLowerCase()}:${limit}:${viewbox ?? ""}:${bounded ?? ""}`;
  const cached = geoSearchCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // 4. Request from backend Nominatim (scoped to Ethiopia via countrycodes=et)
  try {
    const params = new URLSearchParams({
      q,
      format: "jsonv2",
      limit: String(limit),
      countrycodes: "et",
      addressdetails: "1",
      "accept-language": "en",
    });
    if (viewbox) {
      params.set("viewbox", viewbox);
      params.set("bounded", bounded ?? "1");
    }

    const res = await fetchGeocodeSearch(params);
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
          address:
            item.address && typeof item.address === "object"
              ? (item.address as Record<string, unknown>)
              : undefined,
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

/**
 * Nominatim is mounted at the public host root (`/search`) on the OSM server.
 * Some environments expose it under `/nominatim/search`, and a configured
 * NEXT_PUBLIC_GEOCODE_URL may already include the full search path, so try the
 * known layouts in order and only fall through on a 404.
 */
async function fetchGeocodeSearch(params: URLSearchParams): Promise<Response> {
  const base = GEOCODE_URL.replace(/\/+$/, "");
  const candidates = /\/search$/.test(base)
    ? [base]
    : [`${base}/search`, `${base}/nominatim/search`];

  let lastResponse: Response | null = null;

  for (const candidate of candidates) {
    const res = await fetch(`${candidate}?${params.toString()}`, {
      headers: {
        // Some Apache/Nominatim deployments return 406 for a strict JSON Accept
        // header, so advertise JSON while still allowing the reverse proxy.
        Accept: "application/json, text/plain, */*",
        "User-Agent": "AnbessaBusStaffPortal/1.0 (admin route builder)",
      },
    });

    if (res.ok || res.status !== 404) return res;
    lastResponse = res;
  }

  return (
    lastResponse ??
    new Response(JSON.stringify({ message: "No geocoding endpoint found" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    })
  );
}
