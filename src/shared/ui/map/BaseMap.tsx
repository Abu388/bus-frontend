"use client";

import * as React from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { TILE_URL, TILE_ATTRIBUTION, MAP_CENTER, MAP_ZOOM } from "@/shared/config/map";

export interface BaseMapProps {
  center?: [number, number];
  zoom?: number;
  bounds?: [[number, number], [number, number]];
  className?: string;
  children?: React.ReactNode;
  tileUrl?: string;
  attribution?: string;
  scrollWheelZoom?: boolean;
}

function BoundsController({ bounds }: { bounds?: [[number, number], [number, number]] }) {
  const map = useMap();

  React.useEffect(() => {
    if (bounds && bounds.length === 2) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } catch {
        // ignore invalid bounds
      }
    }
  }, [map, bounds]);

  return null;
}

function CenterController({ center, zoom }: { center?: [number, number]; zoom?: number }) {
  const map = useMap();

  React.useEffect(() => {
    if (center) {
      map.setView(center, zoom ?? map.getZoom());
    }
  }, [map, center, zoom]);

  return null;
}

export function BaseMap({
  center = MAP_CENTER,
  zoom = MAP_ZOOM,
  bounds,
  className = "w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-border shadow-inner",
  children,
  tileUrl = TILE_URL,
  attribution = TILE_ATTRIBUTION,
  scrollWheelZoom = true,
}: BaseMapProps) {
  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={scrollWheelZoom}
        className="w-full h-full z-0"
      >
        <TileLayer
          url={tileUrl}
          attribution={attribution}
          maxZoom={19}
        />
        {bounds && <BoundsController bounds={bounds} />}
        {center && !bounds && <CenterController center={center} zoom={zoom} />}
        {children}
      </MapContainer>
    </div>
  );
}

export default BaseMap;
