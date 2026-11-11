"use client";

import * as React from "react";
import L from "leaflet";
import { Marker, Popup, Tooltip } from "react-leaflet";
import { formatBusBadgeLabel } from "@/features/tracking/routes";

export type BusMarkerState = "active" | "stale" | "maintenance";

/**
 * Creates a miniature Anbessa bus badge for live fleet markers.
 * Crimson body, golden top cap, and the plate number in legible mono type.
 */
export function createBusIcon(state: BusMarkerState, label?: string): L.DivIcon {
  const displayLabel = label ?? "BUS";
  const bodyClass =
    state === "active"
      ? "bg-primary text-primary-foreground border-accent-strong"
      : state === "maintenance"
      ? "bg-danger text-danger-foreground border-accent-strong"
      : "bg-muted text-muted-foreground border-warning";

  const pulseClass = state === "active" ? "animate-pulse" : "";

  // Dynamic width based on label length so short bus numbers like "124" or "81" look compact and crisp
  const width = Math.max(54, Math.min(96, 32 + displayLabel.length * 9));
  const halfWidth = Math.round(width / 2);

  const html = `
    <div class="relative flex items-center justify-center">
      <div class="flex items-stretch overflow-hidden rounded-md border-2 shadow-lg ${bodyClass}">
        <div class="flex items-center justify-center bg-accent-strong px-1.5 text-accent-foreground shrink-0">
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z"></path>
            <path d="M4 10h16"></path>
            <path d="M12 4v6"></path>
            <path d="M6 18v2"></path>
            <path d="M18 18v2"></path>
          </svg>
        </div>
        <div class="flex items-center px-2 py-0.5 font-mono text-[11px] font-extrabold tracking-tight whitespace-nowrap">
          <span class="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-accent-strong ${pulseClass}"></span>
          <span>${displayLabel}</span>
        </div>
      </div>
      <div class="absolute -bottom-1 left-1/2 h-0 w-0 -translate-x-1/2 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-accent-strong"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-bus-marker",
    iconSize: [width, 32],
    iconAnchor: [halfWidth, 32],
    popupAnchor: [0, -32],
  });
}

/**
 * Creates a gold-on-charcoal stop pin for fermatas.
 */
export function createFermataIcon(sequence?: number): L.DivIcon {
  const seqText = sequence !== undefined ? String(sequence) : "";
  const html = `
    <div class="flex items-center justify-center w-6 h-6 rounded-full bg-accent-strong text-accent-foreground border-2 border-sidebar shadow-md font-extrabold text-[10px] font-mono hover:scale-110 transition-transform">
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
 * Creates a small, subtle marker for existing fermatas that can be added to a
 * route from the builder map.
 */
export function createGhostFermataIcon(): L.DivIcon {
  const html = `
    <div class="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-card border-2 border-primary/60 shadow-sm hover:scale-125 transition-transform">
      <span class="block h-1 w-1 rounded-full bg-primary"></span>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-fermata-marker",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8],
  });
}

/**
 * Ghost marker for an OpenStreetMap bus stop that is not yet a fermata.
 * Dashed amber outline distinguishes it from the project's fermata pins.
 */
export function createOsmStopIcon(): L.DivIcon {
  const html = `
    <div class="flex items-center justify-center w-4 h-4 rounded-full bg-card border-2 border-dashed border-warning shadow-sm hover:scale-125 transition-transform">
      <span class="block h-1.5 w-1.5 rounded-full bg-warning"></span>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-fermata-marker",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

/**
 * Numbered stop marker for the route builder. Existing fermatas are filled;
 * brand-new stops get a dashed outline and a NEW badge.
 */
export function createBuilderStopIcon(
  sequence: number,
  isNew: boolean,
  isFirst = false,
  isLast = false
): L.DivIcon {
  const boundary = isFirst ? "Start" : isLast ? "End" : "";
  const bodyClass = isNew
    ? "bg-card text-primary border-2 border-dashed border-primary"
    : "bg-primary text-primary-foreground border-2 border-accent-strong";

  const html = `
    <div class="relative flex flex-col items-center">
      <div class="flex items-center justify-center w-7 h-7 rounded-full shadow-md font-extrabold text-[11px] font-mono ${bodyClass}">
        ${sequence}
      </div>
      ${
        isNew
          ? '<span class="absolute -top-2 -right-3 rounded-full bg-accent-strong px-1 py-0.5 text-[8px] font-extrabold tracking-wide text-accent-foreground shadow">NEW</span>'
          : ""
      }
      ${
        boundary
          ? `<span class="mt-0.5 rounded bg-sidebar px-1 text-[8px] font-bold uppercase tracking-wide text-sidebar-foreground">${boundary}</span>`
          : ""
      }
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-fermata-marker",
    iconSize: [34, 40],
    iconAnchor: [17, 20],
    popupAnchor: [0, -20],
  });
}

/**
 * Creates custom divIcon for picking coordinates
 */
export function createPickerIcon(): L.DivIcon {
  const html = `
    <div class="flex items-center justify-center w-7 h-7 rounded-full bg-accent-strong text-accent-foreground border-2 border-sidebar shadow-lg animate-bounce">
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
  publicBusNumber?: number | string | null;
  badgeLabel?: string;
  routeName?: string | null;
  updatedAt?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

export function BusMarker({
  position,
  state = "active",
  plateNumber,
  speed,
  routeLabel,
  publicBusNumber,
  badgeLabel,
  routeName,
  updatedAt,
  onClick,
  children,
}: BusMarkerProps) {
  // Public Bus Number (e.g. "124", "81") takes precedence on the marker badge over targa
  const displayBadge =
    badgeLabel ??
    formatBusBadgeLabel({
      public_bus_number: publicBusNumber,
      targa: plateNumber,
    });

  const icon = React.useMemo(
    () => createBusIcon(state, displayBadge),
    [state, displayBadge]
  );

  if (
    !position ||
    typeof position[0] !== "number" ||
    typeof position[1] !== "number" ||
    isNaN(position[0]) ||
    isNaN(position[1])
  ) {
    return null;
  }

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(),
      }}
    >
      <Tooltip direction="top" offset={[0, -32]} opacity={0.95}>
        <div className="text-xs p-1">
          {publicBusNumber ? (
            <div className="font-bold text-foreground">
              Bus {publicBusNumber} • {plateNumber}{routeName ? ` • ${routeName}` : ""}
            </div>
          ) : (
            <div className="font-bold">{plateNumber}</div>
          )}
          {routeLabel && !publicBusNumber && <div className="text-muted-foreground">{routeLabel}</div>}
          {speed !== undefined && <div>Speed: {speed} km/h</div>}
        </div>
      </Tooltip>
      <Popup>
        <div className="text-xs p-1">
          <div className="font-bold text-sm mb-1 text-foreground">
            {publicBusNumber ? `Bus ${publicBusNumber} • ` : ""}{plateNumber}{routeName ? ` • ${routeName}` : ""}
          </div>
          <div className="space-y-0.5 text-muted-foreground">
            <div>
              Status:{" "}
              <span className="font-semibold text-foreground capitalize">
                {state}
              </span>
            </div>
            {(routeName || routeLabel) && (
              <div>
                Route: <span className="text-foreground">{routeName ?? routeLabel}</span>
              </div>
            )}
            {speed !== undefined && (
              <div>
                Speed: <span className="text-foreground">{speed} km/h</span>
              </div>
            )}
            {updatedAt && (
              <div>
                Last Ping: <span className="text-foreground">{updatedAt}</span>
              </div>
            )}
          </div>
        </div>
      </Popup>
      {children}
    </Marker>
  );
}

export interface FermataMarkerProps {
  position: [number, number];
  name: string;
  sequence?: number;
  code?: string;
  onClick?: () => void;
  draggable?: boolean;
  onDragEnd?: (coords: [number, number]) => void;
  variant?: "default" | "picker";
  showLabel?: boolean;
}

export function FermataMarker({
  position,
  name,
  sequence,
  code,
  onClick,
  draggable = false,
  onDragEnd,
  variant = "default",
  showLabel = false,
}: FermataMarkerProps) {
  const icon = React.useMemo(
    () => (variant === "picker" ? createPickerIcon() : createFermataIcon(sequence)),
    [sequence, variant]
  );

  if (
    !position ||
    typeof position[0] !== "number" ||
    typeof position[1] !== "number" ||
    isNaN(position[0]) ||
    isNaN(position[1])
  ) {
    return null;
  }

  return (
    <Marker
      position={position}
      icon={icon}
      draggable={draggable}
      eventHandlers={{
        click: () => onClick?.(),
        dragend: (event) => {
          const { lat, lng } = (event.target as L.Marker).getLatLng();
          onDragEnd?.([lat, lng]);
        },
      }}
    >
      <Tooltip direction="top" offset={[0, -12]} permanent={showLabel}>
        <div className="text-xs font-semibold">
          {sequence ? `#${sequence} ` : ""}
          {name}
        </div>
      </Tooltip>
      <Popup>
        <div className="text-xs p-1">
          <div className="font-bold text-sm">{name}</div>
          {sequence !== undefined && (
            <div className="text-muted-foreground">
              Stop Sequence: #{sequence}
            </div>
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
