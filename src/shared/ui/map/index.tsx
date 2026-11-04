import dynamic from "next/dynamic";
import type { BaseMapProps } from "./BaseMap";

// Dynamic import with ssr: false for client-side rendering
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

export * from "./markers";
export * from "./polylines";
export * from "./coordinate-picker";
