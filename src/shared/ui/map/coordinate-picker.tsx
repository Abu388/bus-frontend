"use client";

import * as React from "react";
import { useMapEvents, Marker } from "react-leaflet";
import { createPickerIcon } from "./markers";

export interface CoordinatePickerProps {
  value?: [number, number] | null;
  onPick: (coords: [number, number]) => void;
  enabled?: boolean;
}

export function CoordinatePicker({
  value,
  onPick,
  enabled = true,
}: CoordinatePickerProps) {
  const icon = React.useMemo(() => createPickerIcon(), []);

  useMapEvents({
    click(e) {
      if (!enabled) return;
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });

  if (!value) return null;

  return <Marker position={value} icon={icon} />;
}
