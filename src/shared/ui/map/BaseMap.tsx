"use client";

import * as React from "react";
import L from "leaflet";
import { LeafletContext, createLeafletContext } from "@react-leaflet/core";
import { useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { TILE_URL, TILE_ATTRIBUTION, MAP_CENTER, MAP_ZOOM } from "@/shared/config/map";

export interface BaseMapProps {
  center?: [number, number];
  zoom?: number;
  bounds?: [[number, number], [number, number]];
  className?: string;
  mapClassName?: string;
  children?: React.ReactNode;
  tileUrl?: string;
  attribution?: string;
  scrollWheelZoom?: boolean;
  cursor?: string;
  onReady?: (map: L.Map) => void;
  invalidateDelayMs?: number;
}

function SafeTileLayer({
  url,
  attribution,
  maxZoom = 19,
}: {
  url: string;
  attribution: string;
  maxZoom?: number;
}) {
  const map = useMap();

  React.useEffect(() => {
    if (!map) return;
    try {
      const pane = map.getPane("tilePane");
      if (!pane) return;
    } catch {
      return;
    }

    const layer = L.tileLayer(url, {
      attribution,
      maxZoom,
    });

    layer.addTo(map);

    return () => {
      try {
        map.removeLayer(layer);
      } catch {
        // layer or map might already be disposed
      }
    };
  }, [map, url, attribution, maxZoom]);

  return null;
}

function SafeMapContainer({
  center,
  zoom,
  scrollWheelZoom,
  className,
  children,
}: {
  center: [number, number];
  zoom: number;
  scrollWheelZoom: boolean;
  className: string;
  children?: React.ReactNode;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [context, setContext] = React.useState<ReturnType<typeof createLeafletContext> | null>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Defensive check: If element already had a leaflet id attached from an aborted mount
    if ((el as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (el as unknown as { _leaflet_id?: number })._leaflet_id;
    }

    const map = L.map(el, {
      center,
      zoom,
      scrollWheelZoom,
    });

    const ctx = createLeafletContext(map);
    setContext(ctx);

    return () => {
      setContext(null);
      try {
        map.remove();
      } catch {
        // ignore errors during cleanup
      }
      if ((el as unknown as { _leaflet_id?: number })._leaflet_id) {
        delete (el as unknown as { _leaflet_id?: number })._leaflet_id;
      }
    };
  }, [center, zoom, scrollWheelZoom]);

  return (
    <div ref={containerRef} className={`leaflet-container ${className}`}>
      {context ? (
        <LeafletContext.Provider value={context}>
          {children}
        </LeafletContext.Provider>
      ) : null}
    </div>
  );
}

function MapLifecycleController({
  onReady,
  cursor,
  invalidateDelayMs = 180,
}: {
  onReady?: (map: L.Map) => void;
  cursor?: string;
  invalidateDelayMs?: number;
}) {
  const map = useMap();
  const onReadyRef = React.useRef(onReady);

  React.useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  React.useEffect(() => {
    let rafId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let observer: ResizeObserver | undefined;

    // Recalculate viewport so tiles fill the container without gaps
    rafId = requestAnimationFrame(() => {
      timeoutId = setTimeout(() => {
        try {
          map.invalidateSize();
          onReadyRef.current?.(map);
        } catch {
          // Map might have been unmounted
        }
      }, invalidateDelayMs);
    });

    const handleResize = () => {
      try {
        map.invalidateSize();
      } catch {
        // ignore
      }
    };
    window.addEventListener("resize", handleResize);

    if (typeof ResizeObserver !== "undefined") {
      try {
        const container = map.getContainer();
        if (container) {
          observer = new ResizeObserver(() => {
            try {
              map.invalidateSize();
            } catch {
              // ignore
            }
          });
          observer.observe(container);
        }
      } catch {
        // ignore
      }
    }

    return () => {
      cancelAnimationFrame(rafId);
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
      observer?.disconnect();
    };
  }, [map, invalidateDelayMs]);

  React.useEffect(() => {
    if (!cursor) return;
    try {
      const container = map.getContainer();
      if (container) {
        container.style.cursor = cursor;
        return () => {
          container.style.cursor = "";
        };
      }
    } catch {
      // ignore
    }
  }, [map, cursor]);

  return null;
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
      try {
        map.setView(center, zoom ?? map.getZoom());
      } catch {
        // ignore
      }
    }
  }, [map, center, zoom]);

  return null;
}

export function BaseMap({
  center = MAP_CENTER,
  zoom = MAP_ZOOM,
  bounds,
  className = "w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-border shadow-inner",
  mapClassName,
  children,
  tileUrl = TILE_URL,
  attribution = TILE_ATTRIBUTION,
  scrollWheelZoom = true,
  cursor,
  onReady,
  invalidateDelayMs,
}: BaseMapProps) {
  return (
    <div className={`relative ${className}`}>
      <SafeMapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={scrollWheelZoom}
        className={`w-full h-full z-0 ${mapClassName ?? ""}`}
      >
        <SafeTileLayer
          url={tileUrl}
          attribution={attribution}
          maxZoom={19}
        />
        <MapLifecycleController
          onReady={onReady}
          cursor={cursor}
          invalidateDelayMs={invalidateDelayMs}
        />
        {bounds && <BoundsController bounds={bounds} />}
        {center && !bounds && <CenterController center={center} zoom={zoom} />}
        {children}
      </SafeMapContainer>
    </div>
  );
}

export default BaseMap;
