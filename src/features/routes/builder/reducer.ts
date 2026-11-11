import { findSnapCandidate } from "./geo";
import type {
  BuilderAction,
  BuilderSnapshot,
  BuilderState,
  BuilderStop,
  FermataLike,
} from "./types";

export const MAX_STOPS = 50;

export const initialBuilderState: BuilderState = {
  stops: [],
  history: [],
  nextKey: 1,
};

function snapshot(state: BuilderState): BuilderSnapshot {
  return {
    stops: state.stops.map((stop) => ({ ...stop })),
    nextKey: state.nextKey,
  };
}

function withHistory(state: BuilderState, stops: BuilderStop[], nextKey: number): BuilderState {
  return {
    stops,
    nextKey,
    history: [...state.history, snapshot(state)],
  };
}

export function makeExistingStop(fermata: FermataLike): BuilderStop {
  return {
    key: `existing-${fermata.id}`,
    kind: "existing",
    fermataId: fermata.id,
    name: fermata.name,
    latitude: Number(fermata.latitude.toFixed(6)),
    longitude: Number(fermata.longitude.toFixed(6)),
    nameEdited: false,
  };
}

export function makeNewStop(
  nextKey: number,
  stop: { name: string; latitude: number; longitude: number }
): BuilderStop {
  return {
    key: `new-${nextKey}`,
    kind: "new",
    name: stop.name,
    latitude: Number(stop.latitude.toFixed(6)),
    longitude: Number(stop.longitude.toFixed(6)),
    nameEdited: false,
  };
}

export function hasFermata(stops: BuilderStop[], fermataId: string): boolean {
  return stops.some((stop) => stop.kind === "existing" && stop.fermataId === fermataId);
}

function insertAt(stops: BuilderStop[], stop: BuilderStop, index?: number): BuilderStop[] {
  const next = [...stops];
  const target = index === undefined ? next.length : Math.max(0, Math.min(index, next.length));
  next.splice(target, 0, stop);
  return next;
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "add": {
      if (state.stops.length >= MAX_STOPS) return state;

      if (action.stop.kind === "existing") {
        const fermataId = action.stop.fermataId;
        if (!fermataId || hasFermata(state.stops, fermataId)) return state;
        const stop: BuilderStop = {
          ...action.stop,
          key: `existing-${fermataId}`,
          latitude: Number(action.stop.latitude.toFixed(6)),
          longitude: Number(action.stop.longitude.toFixed(6)),
          nameEdited: false,
        };
        return withHistory(state, insertAt(state.stops, stop, action.index), state.nextKey);
      }

      const stop = makeNewStop(state.nextKey, {
        name: action.stop.name,
        latitude: action.stop.latitude,
        longitude: action.stop.longitude,
      });
      return withHistory(
        state,
        insertAt(state.stops, stop, action.index),
        state.nextKey + 1
      );
    }

    case "insert": {
      if (state.stops.length >= MAX_STOPS) return state;
      if (
        action.stop.kind === "existing" &&
        action.stop.fermataId &&
        hasFermata(state.stops, action.stop.fermataId)
      ) {
        return state;
      }
      return withHistory(
        state,
        insertAt(state.stops, { ...action.stop }, action.index),
        state.nextKey
      );
    }

    case "move": {
      const { from, to } = action;
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= state.stops.length ||
        to >= state.stops.length
      ) {
        return state;
      }
      const next = [...state.stops];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return withHistory(state, next, state.nextKey);
    }

    case "remove": {
      const index = state.stops.findIndex((stop) => stop.key === action.key);
      if (index === -1) return state;
      const next = state.stops.filter((stop) => stop.key !== action.key);
      return withHistory(state, next, state.nextKey);
    }

    case "replace": {
      const index = state.stops.findIndex((stop) => stop.key === action.key);
      if (index === -1) return state;
      const next = [...state.stops];
      next[index] = { ...action.stop };
      return withHistory(state, next, state.nextKey);
    }

    case "undo": {
      if (state.history.length === 0) return state;
      const previous = state.history[state.history.length - 1];
      return {
        stops: previous.stops.map((stop) => ({ ...stop })),
        nextKey: previous.nextKey,
        history: state.history.slice(0, -1),
      };
    }

    case "snap": {
      if (state.stops.length >= MAX_STOPS) return state;

      const candidate = findSnapCandidate(
        action.point,
        action.fermatas,
        state.stops,
        action.thresholdM ?? 30
      );

      if (candidate) {
        const stop = makeExistingStop(candidate);
        return withHistory(state, insertAt(state.stops, stop, action.index), state.nextKey);
      }

      const stop = makeNewStop(state.nextKey, {
        name: action.fallbackName ?? `Stop ${state.stops.length + 1}`,
        latitude: action.point.latitude,
        longitude: action.point.longitude,
      });
      return withHistory(
        state,
        insertAt(state.stops, stop, action.index),
        state.nextKey + 1
      );
    }

    case "update": {
      const index = state.stops.findIndex((stop) => stop.key === action.key);
      if (index === -1) return state;

      const next = state.stops.map((stop, i) => {
        if (i !== index) return stop;
        return {
          ...stop,
          ...action.changes,
          ...(action.changes.latitude !== undefined
            ? { latitude: Number(action.changes.latitude.toFixed(6)) }
            : {}),
          ...(action.changes.longitude !== undefined
            ? { longitude: Number(action.changes.longitude.toFixed(6)) }
            : {}),
        };
      });

      // Async enrichment (reverse-geocoded names, initial road snapping) must
      // never add a second undo entry for a single user action. Only explicit
      // user edits opt in via recordHistory.
      return action.recordHistory
        ? withHistory(state, next, state.nextKey)
        : { ...state, stops: next };
    }

    case "reset": {
      return {
        stops: (action.stops ?? []).map((stop) => ({ ...stop })),
        nextKey: action.nextKey ?? state.nextKey,
        history: [],
      };
    }

    default:
      return state;
  }
}
