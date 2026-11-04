"use client";

import * as React from "react";
import L from "leaflet";
import { Marker, Popup, Tooltip } from "react-leaflet";

export type BusMarkerState = "active" | "stale" | "maintenance";

/**
 * Creates custom divIcon for bus markers using theme classes
 */
export function createBusIcon(state: BusMarkerState, label?: string): L.DivIcon {
  const bgClass =
    state === "active"
      ? "bg-primary text-primary-foreground border-primary"
      : state === "maintenance"
      ? "bg-danger text-danger-foreground border-danger"
      : "bg-muted text-muted-foreground border-border";

  const pulseClass = state === "active" ? "animate-pulse" : "";

  const html = `
    <div class="relative flex items-center justify-center">
      <div class="flex items-center gap-1 px-1.5 py-0.5 rounded-md shadow-md border text-[11px] font-bold font-mono ${bgClass}">
        <span class="inline-block w-2 h-2 rounded-full ${state === "active" ? "bg-accent " + pulseClass : "bg-current opacity-70"}"></span>
        <span>${label ?? "BUS"}</span>
      </div>
      <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-current opacity-80"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-bus-marker",
    iconSize: [60, 26],
    iconAnchor: [30, 26],
    popupAnchor: [0, -26],
  });
}

/**
 * Creates custom divIcon for fermatas (stops)
 */
export function createFermataIcon(sequence?: number): L.DivIcon {
  const seqText = sequence !== undefined ? String(sequence) : "";
  const html = `
    <div class="flex items-center justify-center w-6 h-6 rounded-full bg-card text-foreground border-2 border-accent shadow-sm font-bold text-[11px] font-mono hover:scale-110 transition-transform">
      ${seqText || "•"}
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-fermata-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

/**
 * Creates custom divIcon for picking coordinates
 */
export function createPickerIcon(): L.DivIcon {
  const html = `
    <div class="flex items-center justify-center w-7 h-7 rounded-full bg-accent text-accent-foreground border-2 border-card shadow-lg animate-bounce">
      <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-picker-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

export interface BusMarkerProps {
  position: [number, number];
  state?: BusMarkerState;
  plateNumber: string;
  speed?: number;
  routeLabel?: string;
  updatedAt?: string;
  onClick?: () => void;
}

export function BusMarker({
  position,
  state = "active",
  plateNumber,
  speed,
  routeLabel,
  updatedAt,
  onClick,
}: BusMarkerProps) {
  const icon = React.useMemo(() => createBusIcon(state, plateNumber), [state, plateNumber]);

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(),
      }}
    >
      <Tooltip direction="top" offset={[0, -26]} opacity={0.95}>
        <div className="text-xs p-1">
          <div className="font-bold">{plateNumber}</div>
          {routeLabel && <div className="text-muted-foreground">{routeLabel}</div>}
          {speed !== undefined && <div>Speed: {speed} km/h</div>}
        </div>
      </Tooltip>
      <Popup>
        <div className="text-xs p-1">
          <div className="font-bold text-sm mb-1">{plateNumber}</div>
          <div className="space-y-0.5 text-muted-foreground">
            <div>Status: <span className="font-semibold text-foreground capitalize">{state}</span></div>
            {routeLabel && <div>Route: <span className="text-foreground">{routeLabel}</span></div>}
            {speed !== undefined && <div>Speed: <span className="text-foreground">{speed} km/h</span></div>}
            {updatedAt && <div>Last Ping: <span className="text-foreground">{updatedAt}</span></div>}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

export interface FermataMarkerProps {
  position: [number, number];
  name: string;
  sequence?: number;
  code?: string;
  onClick?: () => void;
}

export function FermataMarker({
  position,
  name,
  sequence,
  code,
  onClick,
}: FermataMarkerProps) {
  const icon = React.useMemo(() => createFermataIcon(sequence), [sequence]);

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(),
      }}
    >
      <Tooltip direction="top" offset={[0, -12]}>
        <div className="text-xs font-semibold">
          {sequence ? `#${sequence} ` : ""}{name}
        </div>
      </Tooltip>
      <Popup>
        <div className="text-xs p-1">
          <div className="font-bold text-sm">{name}</div>
          {sequence !== undefined && (
            <div className="text-muted-foreground">Stop Sequence: #{sequence}</div>
          )}
          {code && <div className="text-muted-foreground">Code: {code}</div>}
          <div className="font-mono text-[10px] text-muted-foreground mt-1">
            {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
