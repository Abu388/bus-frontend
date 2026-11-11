"use client";

import { useMapEvents } from "react-leaflet";
import { FermataMarker } from "./markers";

export interface CoordinatePickerProps {
  value?: [number, number] | null;
  onPick: (coords: [number, number]) => void;
  enabled?: boolean;
  label?: string;
}

export function CoordinatePicker({
  value,
  onPick,
  enabled = true,
  label = "Selected stop location",
}: CoordinatePickerProps) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });

  if (!value) return null;

  return (
    <FermataMarker
      position={value}
      name={label}
      variant="picker"
      draggable={enabled}
      onDragEnd={onPick}
    />
  );
}
