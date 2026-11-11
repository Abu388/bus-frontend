import type { BuildRoutePayload, BuildStopInput } from "./schemas";
import type {
  BuilderStop,
  DirectionPaths,
  DirectionPreview,
} from "./types";

export function roundCoordinate(value: number): number {
  return Number(value.toFixed(6));
}

export function toDjangoGeometry(
  coordinates: [number, number][]
): [number, number][] {
  return coordinates.map(([latitude, longitude]) => [
    roundCoordinate(longitude),
    roundCoordinate(latitude),
  ]);
}

function stopToPayload(stop: BuilderStop): BuildStopInput {
  if (stop.kind === "existing" && stop.fermataId) {
    return { fermata_id: stop.fermataId };
  }

  return {
    new: {
      name: stop.name.trim(),
      latitude: roundCoordinate(stop.latitude),
      longitude: roundCoordinate(stop.longitude),
    },
  };
}

function directionToPayload(direction: DirectionPreview) {
  return {
    geometry: toDjangoGeometry(direction.geometry),
    distance_m: Math.round(direction.distanceM),
    duration_s: Math.round(direction.durationS),
  };
}

export interface BuildRoutePayloadInput {
  publicBusNumber: number;
  name: string;
  status: "active" | "inactive";
  stops: BuilderStop[];
  directions: DirectionPaths;
}

export function buildRoutePayload(
  input: BuildRoutePayloadInput
): BuildRoutePayload {
  const { outbound, inbound } = input.directions;

  if (!outbound || !inbound) {
    throw new Error("Both outbound and inbound directions are required.");
  }

  return {
    public_bus_number: input.publicBusNumber,
    name: input.name.trim(),
    status: input.status,
    stops: input.stops.map(stopToPayload),
    directions: {
      outbound: directionToPayload(outbound),
      inbound: directionToPayload(inbound),
    },
  };
}
