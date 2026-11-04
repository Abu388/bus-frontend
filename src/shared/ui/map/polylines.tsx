"use client";

import * as React from "react";
import { Polyline } from "react-leaflet";

export interface RoutePolylineProps {
  /**
   * Coordinates array. Can be either [latitude, longitude] or [longitude, latitude] pairs.
   * Auto-normalizes to [latitude, longitude] for Leaflet rendering.
   */
  positions: [number, number][];
  color?: string;
  weight?: number;
  opacity?: number;
  dashArray?: string;
}

/**
 * Normalizes coordinate pairs to [latitude, longitude]
 * In Ethiopia, Lat is ~3 to 15, Lon is ~33 to 48.
 */
export function normalizeCoordinatesToLatLng(coords: [number, number][]): [number, number][] {
  if (!coords || coords.length === 0) return [];

  return coords.map(([first, second]) => {
    // If the first coordinate is roughly Ethiopian longitude (~30-50) and second is latitude (~3-16)
    if (first > 25 && second < 25) {
      return [second, first];
    }
    return [first, second];
  });
}

export function RoutePolyline({
  positions,
  color = "var(--primary)",
  weight = 5,
  opacity = 0.85,
  dashArray,
}: RoutePolylineProps) {
  const normalizedPositions = React.useMemo(
    () => normalizeCoordinatesToLatLng(positions),
    [positions]
  );

  if (normalizedPositions.length < 2) {
    return null;
  }

  return (
    <Polyline
      positions={normalizedPositions}
      pathOptions={{
        color,
        weight,
        opacity,
        dashArray,
        lineCap: "round",
        lineJoin: "round",
      }}
    />
  );
}
