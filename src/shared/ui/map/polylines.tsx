"use client";

import * as React from "react";
import type L from "leaflet";
import { Polyline, Tooltip } from "react-leaflet";
import { MAP_ROUTE_STYLE } from "@/shared/config/map";

export type RoutePolylineVariant = "active" | "fallback" | "alternative";

export interface RoutePolylineProps {
  /**
   * Coordinates array. Can be either [latitude, longitude] or [longitude, latitude] pairs.
   * Auto-normalizes to [latitude, longitude] for Leaflet rendering.
   */
  positions: [number, number][];
  variant?: RoutePolylineVariant;
  /** Optional override for the inner navigation stroke. */
  color?: string;
  /** Optional override for the outer casing stroke. */
  casingColor?: string;
  weight?: number;
  opacity?: number;
  dashArray?: string;
  showCasing?: boolean;
  tooltipText?: string;
  eventHandlers?: L.LeafletEventHandlerFnMap;
  children?: React.ReactNode;
}

/**
 * Normalizes coordinate pairs to [latitude, longitude]
 * In Ethiopia, Lat is ~3 to 15, Lon is ~33 to 48.
 */
export function normalizeCoordinatesToLatLng(
  coords: [number, number][]
): [number, number][] {
  if (!coords || coords.length === 0) return [];

  return coords.map(([first, second]) => {
    // If the first coordinate is roughly Ethiopian longitude (~30-50) and second is latitude (~3-16)
    if (first > 25 && second < 25) {
      return [second, first];
    }
    return [first, second];
  });
}

/**
 * Dual-layer Google Maps navigation style route path:
 *  1. Deep royal-blue casing underneath.
 *  2. Vibrant sky-blue inner line on top.
 *
 * Fallbacks and inactive alternatives render as a softer dashed blue.
 */
export function RoutePolyline({
  positions,
  variant = "active",
  color,
  casingColor,
  weight,
  opacity,
  dashArray,
  showCasing = true,
  tooltipText,
  eventHandlers,
  children,
}: RoutePolylineProps) {
  const normalizedPositions = React.useMemo(
    () => normalizeCoordinatesToLatLng(positions),
    [positions]
  );

  if (normalizedPositions.length < 2) {
    return null;
  }

  const styles = MAP_ROUTE_STYLE[variant];

  const lineOptions = {
    ...styles.line,
    ...(color ? { color } : {}),
    ...(weight !== undefined ? { weight } : {}),
    ...(opacity !== undefined ? { opacity } : {}),
    ...(dashArray !== undefined ? { dashArray } : {}),
  };

  const casingOptions = {
    ...styles.casing,
    interactive: false,
    ...(casingColor ? { color: casingColor } : {}),
    ...(weight !== undefined ? { weight: weight + 3 } : {}),
    ...(opacity !== undefined ? { opacity: Math.min(opacity, 0.85) } : {}),
  };

  return (
    <>
      {showCasing && <Polyline positions={normalizedPositions} pathOptions={casingOptions} />}
      <Polyline positions={normalizedPositions} pathOptions={lineOptions} eventHandlers={eventHandlers}>
        {tooltipText && (
          <Tooltip sticky direction="top" opacity={0.95}>
            <span className="font-semibold text-xs">{tooltipText}</span>
          </Tooltip>
        )}
        {children}
      </Polyline>
    </>
  );
}
