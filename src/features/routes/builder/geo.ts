import type { BuilderStop, FermataLike, Point } from "./types";

const EARTH_RADIUS_METERS = 6_371_000;

export const SNAP_THRESHOLD_METERS = 30;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineDistanceMeters(a: Point, b: Point): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const v =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(v), Math.sqrt(1 - v));

  return EARTH_RADIUS_METERS * c;
}

export function findSnapCandidate(
  point: Point,
  fermatas: FermataLike[],
  stops: BuilderStop[] = [],
  thresholdMeters = SNAP_THRESHOLD_METERS
): FermataLike | null {
  const used = new Set(
    stops
      .filter((stop) => stop.kind === "existing" && stop.fermataId)
      .map((stop) => stop.fermataId)
  );

  let best: FermataLike | null = null;
  let bestDistance = thresholdMeters;

  for (const fermata of fermatas) {
    if (used.has(fermata.id)) continue;

    const distance = haversineDistanceMeters(point, {
      latitude: fermata.latitude,
      longitude: fermata.longitude,
    });

    if (distance <= bestDistance) {
      best = fermata;
      bestDistance = distance;
    }
  }

  return best;
}

export function straightLineGeometry(points: Point[]): [number, number][] {
  return points.map((point) => [point.latitude, point.longitude]);
}
