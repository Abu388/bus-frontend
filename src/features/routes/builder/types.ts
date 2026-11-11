export type BuilderStopKind = "existing" | "new";

export type DirectionKey = "outbound" | "inbound";

export interface FermataLike {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface OsmStopLike {
  placeId: number;
  displayName: string;
  lat: number;
  lon: number;
}

export interface MapViewport {
  bounds: [[number, number], [number, number]];
  zoom: number;
}

export interface BuilderStop {
  key: string;
  kind: BuilderStopKind;
  fermataId?: string;
  name: string;
  latitude: number;
  longitude: number;
  nameEdited: boolean;
}

export interface BuilderSnapshot {
  stops: BuilderStop[];
  nextKey: number;
}

export interface BuilderState {
  stops: BuilderStop[];
  history: BuilderSnapshot[];
  nextKey: number;
}

export interface Point {
  latitude: number;
  longitude: number;
}

export interface DirectionPreview {
  geometry: [number, number][];
  distanceM: number;
  durationS: number;
  isFallback?: boolean;
}

export interface DirectionPaths {
  outbound: DirectionPreview | null;
  inbound: DirectionPreview | null;
}

export interface BuilderFormState {
  publicBusNumber: string;
  name: string;
  status: "active" | "inactive";
  nameEdited: boolean;
}

export interface RouteBuilderDraft {
  version: 1;
  form: BuilderFormState;
  stops: BuilderStop[];
  nextKey: number;
  direction: DirectionKey;
  addMode: boolean;
}

export type BuilderStopInput =
  | {
      kind: "existing";
      fermataId: string;
      name: string;
      latitude: number;
      longitude: number;
    }
  | {
      kind: "new";
      name: string;
      latitude: number;
      longitude: number;
    };

export type BuilderAction =
  | { type: "add"; stop: BuilderStopInput; index?: number }
  | { type: "insert"; stop: BuilderStop; index: number }
  | { type: "move"; from: number; to: number }
  | { type: "remove"; key: string }
  | { type: "replace"; key: string; stop: BuilderStop }
  | { type: "undo" }
  | {
      type: "snap";
      point: Point;
      fermatas: FermataLike[];
      thresholdM?: number;
      fallbackName?: string;
      index?: number;
    }
  | {
      type: "update";
      key: string;
      changes: Partial<
        Pick<BuilderStop, "name" | "latitude" | "longitude" | "nameEdited">
      >;
      /**
       * Background enrichment (reverse geocoding, road snapping) updates the
       * stop in place. Only explicit user edits should opt into history.
       */
      recordHistory?: boolean;
    }
  | { type: "reset"; stops?: BuilderStop[]; nextKey?: number };
