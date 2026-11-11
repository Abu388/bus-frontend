export interface NominatimReverseLike {
  name?: string;
  displayName?: string;
  display_name?: string;
  address?: Record<string, unknown>;
}

export interface OsrmNearestLike {
  name?: string;
}

const POI_KEYS = [
  "bus_stop",
  "amenity",
  "shop",
  "tourism",
  "leisure",
  "building",
  "office",
  "historic",
  "man_made",
  "place",
  "house_name",
];

const ROAD_KEYS = [
  "road",
  "pedestrian",
  "footway",
  "path",
  "residential",
  "living_street",
  "cycleway",
  "service",
  "unclassified",
  "track",
];

const AREA_KEYS = [
  "suburb",
  "neighbourhood",
  "quarter",
  "city_district",
  "borough",
  "village",
  "town",
  "hamlet",
  "locality",
];

const GENERIC_VALUES = new Set([
  "yes",
  "no",
  "true",
  "false",
  "bus_stop",
  "bus stop",
  "bus_station",
  "platform",
  "stop",
]);

function readAddress(
  reverse?: NominatimReverseLike | null
): Record<string, unknown> {
  return reverse?.address ?? {};
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  if (!clean) return null;
  if (GENERIC_VALUES.has(clean.toLowerCase())) return null;
  return clean;
}

function firstAddressValue(
  address: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = readString(address[key]);
    if (value) return value;
  }
  return null;
}

export function extractPoiName(reverse?: NominatimReverseLike | null): string | null {
  const address = readAddress(reverse);
  const addressPoi = firstAddressValue(address, POI_KEYS);
  if (addressPoi) return addressPoi;

  return readString(reverse?.name);
}

export function extractRoadName(reverse?: NominatimReverseLike | null): string | null {
  return firstAddressValue(readAddress(reverse), ROAD_KEYS);
}

export function extractAreaName(reverse?: NominatimReverseLike | null): string | null {
  return firstAddressValue(readAddress(reverse), AREA_KEYS);
}

export function extractDisplayName(reverse?: NominatimReverseLike | null): string | null {
  const display = reverse?.displayName ?? reverse?.display_name;
  return readString(display);
}

function stripCountryRegionPostcode(value: string): string {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^\d{4,6}$/.test(part))
    .filter((part) => !/\bethiopia\b/i.test(part));

  return parts.join(", ");
}

export function sanitizeStopName(value: string, fallback = "Stop"): string {
  const cleaned = stripCountryRegionPostcode(value)
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:-]+|[\s,;:-]+$/g, "");

  if (!cleaned) return fallback;
  return cleaned.slice(0, 60).trim() || fallback;
}

export function deriveStopName(
  reverse: NominatimReverseLike | null | undefined,
  nearest: OsrmNearestLike | null | undefined,
  stopNumber: number
): string {
  const fallback = `Stop ${stopNumber}`;

  const poi = extractPoiName(reverse);
  if (poi) return sanitizeStopName(poi, fallback);

  const road = extractRoadName(reverse);
  const area = extractAreaName(reverse);
  if (road && area) return sanitizeStopName(`${road} - ${area}`, fallback);
  if (road) return sanitizeStopName(road, fallback);

  const nearestRoad = readString(nearest?.name);
  if (nearestRoad) return sanitizeStopName(nearestRoad, fallback);

  if (area) return sanitizeStopName(area, fallback);

  const display = extractDisplayName(reverse);
  if (display) {
    const stripped = stripCountryRegionPostcode(display);
    if (stripped) return sanitizeStopName(stripped, fallback);
  }

  return fallback;
}
