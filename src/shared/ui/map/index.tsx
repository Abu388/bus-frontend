import dynamic from "next/dynamic";
import type { BaseMapProps } from "./BaseMap";
import type { BusMarkerProps, FermataMarkerProps } from "./markers";
import type { RoutePolylineProps } from "./polylines";
import type { CoordinatePickerProps } from "./coordinate-picker";

// Dynamic imports with ssr: false for client-side rendering
export const BaseMap = dynamic<BaseMapProps>(() => import("./BaseMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-card text-muted-foreground border border-border rounded-lg animate-pulse">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Loading Map...</span>
      </div>
    </div>
  ),
});

export const BusMarker = dynamic<BusMarkerProps>(
  () => import("./markers").then((mod) => mod.BusMarker),
  { ssr: false }
);

export const FermataMarker = dynamic<FermataMarkerProps>(
  () => import("./markers").then((mod) => mod.FermataMarker),
  { ssr: false }
);

export const RoutePolyline = dynamic<RoutePolylineProps>(
  () => import("./polylines").then((mod) => mod.RoutePolyline),
  { ssr: false }
);

export const CoordinatePicker = dynamic<CoordinatePickerProps>(
  () => import("./coordinate-picker").then((mod) => mod.CoordinatePicker),
  { ssr: false }
);

export type { BusMarkerState, BusMarkerProps, FermataMarkerProps } from "./markers";
export type { RoutePolylineProps } from "./polylines";
export type { CoordinatePickerProps } from "./coordinate-picker";
