import type { BuilderStop, DirectionKey, RouteBuilderDraft } from "./types";

export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function routeBuilderDraftKey(routeId?: string): string {
  return `anbessa:route-builder-draft:${routeId ?? "new"}`;
}

function getSessionStorage(): DraftStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isValidStop(value: unknown): value is BuilderStop {
  if (!value || typeof value !== "object") return false;
  const stop = value as Record<string, unknown>;
  return (
    typeof stop.key === "string" &&
    (stop.kind === "existing" || stop.kind === "new") &&
    typeof stop.name === "string" &&
    typeof stop.latitude === "number" &&
    typeof stop.longitude === "number"
  );
}

export function isRouteBuilderDraft(value: unknown): value is RouteBuilderDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  if (draft.version !== 1) return false;
  if (!Array.isArray(draft.stops) || !draft.stops.every(isValidStop)) return false;
  if (typeof draft.nextKey !== "number") return false;
  if (draft.direction !== "outbound" && draft.direction !== "inbound") return false;
  if (typeof draft.addMode !== "boolean") return false;
  if (!draft.form || typeof draft.form !== "object") return false;

  const form = draft.form as Record<string, unknown>;
  return (
    typeof form.publicBusNumber === "string" &&
    typeof form.name === "string" &&
    (form.status === "active" || form.status === "inactive") &&
    typeof form.nameEdited === "boolean"
  );
}

export function saveDraft(
  draft: RouteBuilderDraft,
  routeId?: string,
  storage: DraftStorage | null = getSessionStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(routeBuilderDraftKey(routeId), JSON.stringify(draft));
  } catch {
    // Storage may be unavailable (private mode/quota). Draft safety is best-effort.
  }
}

export function loadDraft(
  routeId?: string,
  storage: DraftStorage | null = getSessionStorage()
): RouteBuilderDraft | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(routeBuilderDraftKey(routeId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isRouteBuilderDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearDraft(
  routeId?: string,
  storage: DraftStorage | null = getSessionStorage()
): void {
  if (!storage) return;
  try {
    storage.removeItem(routeBuilderDraftKey(routeId));
  } catch {
    // ignore
  }
}

export function makeDraft(input: {
  publicBusNumber: string;
  name: string;
  status: "active" | "inactive";
  nameEdited: boolean;
  stops: BuilderStop[];
  nextKey: number;
  direction: DirectionKey;
  addMode: boolean;
}): RouteBuilderDraft {
  return {
    version: 1,
    form: {
      publicBusNumber: input.publicBusNumber,
      name: input.name,
      status: input.status,
      nameEdited: input.nameEdited,
    },
    stops: input.stops,
    nextKey: input.nextKey,
    direction: input.direction,
    addMode: input.addMode,
  };
}
