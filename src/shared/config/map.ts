import { getActiveBrand } from "@/brands";

const BASE_URL =
  process.env.NEXT_PUBLIC_MAP_BASE_URL ?? "https://186.241.23.111.nip.io";

export const TILE_URL =
  process.env.NEXT_PUBLIC_TILE_URL ?? `${BASE_URL}/tile/{z}/{x}/{y}.png`;

export const GEOCODE_URL =
  process.env.NEXT_PUBLIC_GEOCODE_URL ?? BASE_URL;

export const ROUTE_URL =
  process.env.NEXT_PUBLIC_ROUTE_URL ?? BASE_URL;

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

export interface MapDefaults {
  center: [number, number];
  zoom: number;
  bounds?: [[number, number], [number, number]];
}

export function getMapDefaults(brandId?: string): MapDefaults {
  const brand = getActiveBrand(brandId);
  const brandCenter: [number, number] = brand.mapCenter ?? [9.0155, 38.7636];
  const brandZoom: number = brand.mapZoom ?? 13;

  const envLat = process.env.NEXT_PUBLIC_MAP_CENTER_LAT
    ? parseFloat(process.env.NEXT_PUBLIC_MAP_CENTER_LAT)
    : undefined;
  const envLng = process.env.NEXT_PUBLIC_MAP_CENTER_LNG
    ? parseFloat(process.env.NEXT_PUBLIC_MAP_CENTER_LNG)
    : undefined;
  const envZoom = process.env.NEXT_PUBLIC_MAP_ZOOM
    ? parseInt(process.env.NEXT_PUBLIC_MAP_ZOOM, 10)
    : undefined;

  const center: [number, number] =
    envLat !== undefined && !isNaN(envLat) && envLng !== undefined && !isNaN(envLng)
      ? [envLat, envLng]
      : brandCenter;

  const zoom: number = envZoom !== undefined && !isNaN(envZoom) ? envZoom : brandZoom;

  return {
    center,
    zoom,
    bounds: brand.mapBounds,
  };
}

export const MAP_CENTER: [number, number] = getMapDefaults().center;
export const MAP_ZOOM: number = getMapDefaults().zoom;
