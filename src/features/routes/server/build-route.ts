import {
  djangoFetch,
  djangoJson,
  UpstreamError,
  type DjangoSession,
} from "@/shared/api/django-server";
import type {
  BuildDirectionInput,
  BuildRoutePayload,
} from "../builder/schemas";

interface UpstreamFermata {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface UpstreamRouteStop {
  id: string;
  fermata: string;
  sequence_number: number;
  fermata_detail?: UpstreamFermata;
}

interface UpstreamRouteDirection {
  id: string;
  direction: "outbound" | "inbound";
  geometry?: unknown;
  stop_distances?: unknown;
  distance_m?: number | null;
  duration_s?: number | null;
}

export interface UpstreamRoute {
  id: string;
  public_bus_number: number;
  name: string;
  status: "active" | "inactive";
  stops?: UpstreamRouteStop[];
  directions?: UpstreamRouteDirection[];
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    body: JSON.stringify(body),
  };
}

async function createFermata(
  session: DjangoSession,
  stop: { name: string; latitude: number; longitude: number }
): Promise<UpstreamFermata> {
  const created = await djangoJson<UpstreamFermata>(
    session,
    "/api/fermatas/",
    jsonInit("POST", {
      name: stop.name,
      latitude: Number(stop.latitude.toFixed(6)),
      longitude: Number(stop.longitude.toFixed(6)),
    })
  );

  if (!created?.id) {
    throw new UpstreamError(502, {
      message: "Backend did not return a fermata id.",
    });
  }

  return created;
}

async function safeDelete(session: DjangoSession, path: string): Promise<void> {
  try {
    await djangoFetch(session, path, { method: "DELETE" });
  } catch {
    // Best-effort cleanup. Never mask the original failure.
  }
}

async function resolveFermataIds(
  session: DjangoSession,
  payload: BuildRoutePayload,
  createdFermataIds: string[]
): Promise<string[]> {
  const ids: string[] = [];

  for (const stop of payload.stops) {
    if ("fermata_id" in stop) {
      ids.push(stop.fermata_id);
      continue;
    }

    const created = await createFermata(session, stop.new);
    createdFermataIds.push(created.id);
    ids.push(created.id);
  }

  if (new Set(ids).size !== ids.length) {
    throw new UpstreamError(400, {
      detail: "The same fermata cannot appear more than once in a route.",
    });
  }

  return ids;
}

async function createStops(
  session: DjangoSession,
  routeId: string,
  fermataIds: string[]
): Promise<void> {
  for (let index = 0; index < fermataIds.length; index += 1) {
    await djangoJson(session, "/api/stops/", {
      ...jsonInit("POST", {
        route: routeId,
        fermata: fermataIds[index],
        sequence_number: index + 1,
      }),
    });
  }
}

async function createDirection(
  session: DjangoSession,
  routeId: string,
  direction: "outbound" | "inbound",
  input: BuildDirectionInput
): Promise<void> {
  await djangoJson(session, "/api/directions/", {
    ...jsonInit("POST", {
      route: routeId,
      direction,
      geometry: input.geometry,
      distance_m: input.distance_m ?? null,
      duration_s: input.duration_s ?? null,
    }),
  });
}

async function createDirections(
  session: DjangoSession,
  routeId: string,
  directions: BuildRoutePayload["directions"]
): Promise<void> {
  await createDirection(session, routeId, "outbound", directions.outbound);
  await createDirection(session, routeId, "inbound", directions.inbound);
}

async function deleteChildren(
  session: DjangoSession,
  route: UpstreamRoute
): Promise<void> {
  for (const direction of route.directions ?? []) {
    await safeDelete(session, `/api/directions/${direction.id}/`);
  }
  for (const stop of route.stops ?? []) {
    await safeDelete(session, `/api/stops/${stop.id}/`);
  }
}

async function fetchRoute(
  session: DjangoSession,
  routeId: string
): Promise<UpstreamRoute> {
  return djangoJson<UpstreamRoute>(session, `/api/routes/${routeId}/`);
}

function fallbackRoute(
  routeId: string,
  payload: BuildRoutePayload
): UpstreamRoute {
  return {
    id: routeId,
    public_bus_number: payload.public_bus_number,
    name: payload.name,
    status: payload.status,
    stops: [],
    directions: [],
  };
}

async function rollbackCreatedRoute(
  session: DjangoSession,
  routeId: string | null,
  createdFermataIds: string[]
): Promise<void> {
  // Deleting the route cascades RouteStop/RouteDirection children, which also
  // releases any PROTECTed fermatas so they can be cleaned up afterwards.
  if (routeId) {
    await safeDelete(session, `/api/routes/${routeId}/`);
  }

  for (const fermataId of [...createdFermataIds].reverse()) {
    await safeDelete(session, `/api/fermatas/${fermataId}/`);
  }
}

export async function createRouteFromPayload(
  session: DjangoSession,
  payload: BuildRoutePayload
): Promise<UpstreamRoute> {
  const createdFermataIds: string[] = [];
  let routeId: string | null = null;

  try {
    const fermataIds = await resolveFermataIds(session, payload, createdFermataIds);

    const route = await djangoJson<UpstreamRoute>(
      session,
      "/api/routes/",
      jsonInit("POST", {
        public_bus_number: payload.public_bus_number,
        name: payload.name,
        status: payload.status,
      })
    );

    routeId = route.id;
    await createStops(session, route.id, fermataIds);
    await createDirections(session, route.id, payload.directions);
  } catch (error) {
    await rollbackCreatedRoute(session, routeId, createdFermataIds);
    throw error;
  }

  try {
    return await fetchRoute(session, routeId as string);
  } catch {
    return fallbackRoute(routeId as string, payload);
  }
}

async function restoreRouteSnapshot(
  session: DjangoSession,
  routeId: string,
  snapshot: UpstreamRoute,
  createdFermataIds: string[]
): Promise<void> {
  try {
    const current = await fetchRoute(session, routeId);
    await deleteChildren(session, current);

    await djangoFetch(session, `/api/routes/${routeId}/`, {
      ...jsonInit("PATCH", {
        public_bus_number: snapshot.public_bus_number,
        name: snapshot.name,
        status: snapshot.status,
      }),
    });

    const stops = [...(snapshot.stops ?? [])].sort(
      (a, b) => a.sequence_number - b.sequence_number
    );
    for (const stop of stops) {
      await djangoFetch(session, "/api/stops/", {
        ...jsonInit("POST", {
          route: routeId,
          fermata: stop.fermata,
          sequence_number: stop.sequence_number,
        }),
      });
    }

    for (const direction of snapshot.directions ?? []) {
      await djangoFetch(session, "/api/directions/", {
        ...jsonInit("POST", {
          route: routeId,
          direction: direction.direction,
          geometry: direction.geometry ?? null,
          stop_distances: direction.stop_distances ?? {},
          distance_m: direction.distance_m ?? null,
          duration_s: direction.duration_s ?? null,
        }),
      });
    }
  } catch {
    // If restoration fails there is nothing else we can safely do.
  }

  for (const fermataId of [...createdFermataIds].reverse()) {
    await safeDelete(session, `/api/fermatas/${fermataId}/`);
  }
}

export async function updateRouteFromPayload(
  session: DjangoSession,
  routeId: string,
  payload: BuildRoutePayload
): Promise<UpstreamRoute> {
  const snapshot = await fetchRoute(session, routeId);
  const createdFermataIds: string[] = [];
  let childrenMutated = false;

  try {
    const fermataIds = await resolveFermataIds(session, payload, createdFermataIds);

    await djangoJson<UpstreamRoute>(
      session,
      `/api/routes/${routeId}/`,
      jsonInit("PATCH", {
        public_bus_number: payload.public_bus_number,
        name: payload.name,
        status: payload.status,
      })
    );

    childrenMutated = true;
    await deleteChildren(session, snapshot);
    await createStops(session, routeId, fermataIds);
    await createDirections(session, routeId, payload.directions);
  } catch (error) {
    if (childrenMutated) {
      await restoreRouteSnapshot(session, routeId, snapshot, createdFermataIds);
    } else {
      for (const fermataId of [...createdFermataIds].reverse()) {
        await safeDelete(session, `/api/fermatas/${fermataId}/`);
      }
    }
    throw error;
  }

  try {
    return await fetchRoute(session, routeId);
  } catch {
    return {
      ...fallbackRoute(routeId, payload),
      stops: snapshot.stops,
      directions: snapshot.directions,
    };
  }
}
