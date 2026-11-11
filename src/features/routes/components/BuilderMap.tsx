"use client";

import * as React from "react";
import type L from "leaflet";
import { Marker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { RoutePolyline } from "@/shared/ui/map/polylines";
import {
  createBuilderStopIcon,
  createGhostFermataIcon,
  createOsmStopIcon,
} from "@/shared/ui/map/markers";
import type {
  BuilderStop,
  DirectionKey,
  DirectionPreview,
  FermataLike,
  MapViewport,
  OsmStopLike,
  Point,
} from "../builder/types";

export interface BuilderMapProps {
  stops: BuilderStop[];
  fermatas: FermataLike[];
  osmStops?: OsmStopLike[];
  addMode: boolean;
  activeDirection: DirectionKey;
  outboundPath: DirectionPreview | null;
  inboundPath: DirectionPreview | null;
  focus?: [number, number] | null;
  onMapClick: (point: Point) => void;
  onExistingFermataClick: (fermata: FermataLike) => void;
  onOsmStopClick?: (stop: OsmStopLike) => void;
  onNewStopDragEnd: (key: string, point: Point) => void;
  onViewportChange?: (viewport: MapViewport) => void;
}

function FocusController({ focus }: { focus?: [number, number] | null }) {
  const map = useMap();

  React.useEffect(() => {
    if (!focus) return;
    map.flyTo(focus, Math.max(map.getZoom(), 15), { duration: 0.7 });
  }, [focus, map]);

  return null;
}

export function BuilderMap({
  stops,
  fermatas,
  osmStops,
  addMode,
  activeDirection,
  outboundPath,
  inboundPath,
  focus,
  onMapClick,
  onExistingFermataClick,
  onOsmStopClick,
  onNewStopDragEnd,
  onViewportChange,
}: BuilderMapProps) {
  const map = useMap();
  const [bounds, setBounds] = React.useState<L.LatLngBounds>(() =>
    map.getBounds()
  );
  const onViewportChangeRef = React.useRef(onViewportChange);

  React.useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  const pushViewport = React.useCallback(() => {
    const nextBounds = map.getBounds();
    setBounds(nextBounds);
    onViewportChangeRef.current?.({
      bounds: [
        [nextBounds.getSouth(), nextBounds.getWest()],
        [nextBounds.getNorth(), nextBounds.getEast()],
      ],
      zoom: map.getZoom(),
    });
  }, [map]);

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(pushViewport);
    return () => window.cancelAnimationFrame(frame);
  }, [pushViewport]);

  useMapEvents({
    moveend() {
      pushViewport();
    },
    zoomend() {
      pushViewport();
    },
    resize() {
      pushViewport();
    },
    click(event) {
      if (!addMode) return;
      onMapClick({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  const usedFermataIds = React.useMemo(
    () =>
      new Set(
        stops
          .filter((stop) => stop.kind === "existing" && stop.fermataId)
          .map((stop) => stop.fermataId as string)
      ),
    [stops]
  );

  const visibleFermatas = React.useMemo(() => {
    return fermatas
      .filter((fermata) => !usedFermataIds.has(fermata.id))
      .filter((fermata) =>
        bounds.contains([fermata.latitude, fermata.longitude])
      )
      .slice(0, 400);
  }, [fermatas, bounds, usedFermataIds]);

  const activePath =
    activeDirection === "outbound" ? outboundPath : inboundPath;

  return (
    <>
      <FocusController focus={focus} />

      {(osmStops ?? []).map((stop) => (
        <Marker
          key={`osm-${stop.placeId}-${stop.lat}-${stop.lon}`}
          position={[stop.lat, stop.lon]}
          icon={createOsmStopIcon()}
          eventHandlers={{
            click: (event) => {
              event.originalEvent?.stopPropagation();
              onOsmStopClick?.(stop);
            },
          }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <span className="text-[10px] font-semibold">
              {stop.displayName.split(",")[0]}
            </span>
          </Tooltip>
        </Marker>
      ))}

      {visibleFermatas.map((fermata) => (
        <Marker
          key={`ghost-${fermata.id}`}
          position={[fermata.latitude, fermata.longitude]}
          icon={createGhostFermataIcon()}
          eventHandlers={{
            click: (event) => {
              event.originalEvent?.stopPropagation();
              onExistingFermataClick(fermata);
            },
          }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <span className="text-[10px] font-semibold">{fermata.name}</span>
          </Tooltip>
        </Marker>
      ))}

      {activePath && activePath.geometry.length > 1 && (
        <RoutePolyline
          positions={activePath.geometry}
          variant={activePath.isFallback ? "fallback" : "active"}
        />
      )}

      {stops.map((stop, index) => {
        const sequence =
          activeDirection === "inbound" ? stops.length - index : index + 1;
        const isFirst = index === 0;
        const isLast = index === stops.length - 1;

        return (
          <Marker
            key={stop.key}
            position={[stop.latitude, stop.longitude]}
            icon={createBuilderStopIcon(
              sequence,
              stop.kind === "new",
              isFirst,
              isLast
            )}
            draggable={stop.kind === "new"}
            eventHandlers={{
              dragend: (event) => {
                const { lat, lng } = (event.target as L.Marker).getLatLng();
                onNewStopDragEnd(stop.key, {
                  latitude: lat,
                  longitude: lng,
                });
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -20]}>
              <span className="text-xs font-semibold">
                {sequence}. {stop.name}
              </span>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}

export default BuilderMap;
