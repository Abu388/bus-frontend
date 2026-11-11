import { describe, it, expect } from "vitest";
import {
  MAX_STOPS,
  buildRoutePayload,
  builderReducer,
  clearDraft,
  deriveStopName,
  findSnapCandidate,
  haversineDistanceMeters,
  initialBuilderState,
  isRouteBuilderDraft,
  loadDraft,
  makeDraft,
  saveDraft,
  type BuilderStop,
  type DraftStorage,
} from "@/features/routes/builder";

const fermataA = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Mexico Square",
  latitude: 9.0101,
  longitude: 38.7401,
};

const fermataB = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Megenagna",
  latitude: 9.0201,
  longitude: 38.8001,
};

function addExisting(
  state: ReturnType<typeof builderReducer>,
  fermata: typeof fermataA
) {
  return builderReducer(state, {
    type: "add",
    stop: {
      kind: "existing",
      fermataId: fermata.id,
      name: fermata.name,
      latitude: fermata.latitude,
      longitude: fermata.longitude,
    },
  });
}

function newStop(
  key: string,
  latitude: number,
  longitude: number,
  overrides: Partial<BuilderStop> = {}
): BuilderStop {
  return {
    key,
    kind: "new",
    name: "New stop",
    latitude,
    longitude,
    nameEdited: false,
    ...overrides,
  };
}

describe("route builder reducer", () => {
  it("adds existing fermatas and prevents duplicates", () => {
    const once = addExisting(initialBuilderState, fermataA);
    expect(once.stops).toHaveLength(1);
    expect(once.stops[0].key).toBe(`existing-${fermataA.id}`);

    const twice = addExisting(once, fermataA);
    expect(twice).toBe(once);
    expect(twice.stops).toHaveLength(1);
  });

  it("adds new stops and increments the stable key counter", () => {
    const state = builderReducer(initialBuilderState, {
      type: "add",
      stop: {
        kind: "new",
        name: "Stop 1",
        latitude: 9.01,
        longitude: 38.74,
      },
    });

    expect(state.stops).toHaveLength(1);
    expect(state.stops[0].key).toBe("new-1");
    expect(state.nextKey).toBe(2);
  });

  it("moves, removes, and undoes changes with history snapshots", () => {
    let state = addExisting(initialBuilderState, fermataA);
    state = addExisting(state, fermataB);

    state = builderReducer(state, { type: "move", from: 1, to: 0 });
    expect(state.stops.map((stop) => stop.name)).toEqual([
      "Megenagna",
      "Mexico Square",
    ]);

    state = builderReducer(state, { type: "remove", key: state.stops[0].key });
    expect(state.stops).toHaveLength(1);

    state = builderReducer(state, { type: "undo" });
    expect(state.stops).toHaveLength(2);
    expect(state.stops[0].name).toBe("Megenagna");

    state = builderReducer(state, { type: "undo" });
    expect(state.stops.map((stop) => stop.name)).toEqual([
      "Mexico Square",
      "Megenagna",
    ]);
  });

  it("updates readable names and rounds coordinates to six decimals", () => {
    const state = builderReducer(
      {
        ...initialBuilderState,
        stops: [newStop("new-1", 9.01, 38.74)],
        nextKey: 2,
      },
      {
        type: "update",
        key: "new-1",
        changes: { name: "Bole", nameEdited: true, latitude: 9.0123456789 },
      }
    );

    expect(state.stops[0].name).toBe("Bole");
    expect(state.stops[0].nameEdited).toBe(true);
    expect(state.stops[0].latitude).toBe(9.012346);
  });

  it("undoes a freshly added stop in one click after async name enrichment", () => {
    let state = builderReducer(initialBuilderState, {
      type: "add",
      stop: {
        kind: "new",
        name: "Stop 1",
        latitude: 9.01,
        longitude: 38.74,
      },
    });
    expect(state.history).toHaveLength(1);

    // Background reverse-geocoding / road-snapping updates the stop in place.
    state = builderReducer(state, {
      type: "update",
      key: "new-1",
      changes: { name: "Megenagna", latitude: 9.010001 },
    });

    expect(state.stops[0].name).toBe("Megenagna");
    expect(state.history).toHaveLength(1);

    state = builderReducer(state, { type: "undo" });
    expect(state.stops).toHaveLength(0);
    expect(state.history).toHaveLength(0);
  });

  it("records an explicit drag-end update as a single history entry", () => {
    let state = builderReducer(initialBuilderState, {
      type: "add",
      stop: {
        kind: "new",
        name: "Stop 1",
        latitude: 9.01,
        longitude: 38.74,
      },
    });

    state = builderReducer(state, {
      type: "update",
      key: "new-1",
      changes: { latitude: 9.02, longitude: 38.75 },
      recordHistory: true,
    });

    expect(state.history).toHaveLength(2);
    state = builderReducer(state, { type: "undo" });
    expect(state.stops[0].latitude).toBe(9.01);
  });

  it("replaces a pending stop with a snapped fermata in one undo step", () => {
    let state = builderReducer(initialBuilderState, {
      type: "add",
      stop: {
        kind: "new",
        name: "Stop 1",
        latitude: 9.01,
        longitude: 38.74,
      },
    });
    expect(state.history).toHaveLength(1);

    state = builderReducer(state, {
      type: "replace",
      key: "new-1",
      stop: {
        key: "new-1",
        kind: "existing",
        fermataId: fermataA.id,
        name: fermataA.name,
        latitude: fermataA.latitude,
        longitude: fermataA.longitude,
        nameEdited: false,
      },
    });

    expect(state.stops).toHaveLength(1);
    expect(state.stops[0].kind).toBe("existing");
    expect(state.history).toHaveLength(2);

    state = builderReducer(state, { type: "undo" });
    expect(state.stops).toHaveLength(1);
    expect(state.stops[0].kind).toBe("new");
  });

  it("enforces the maximum stop count", () => {
    let state = initialBuilderState;
    for (let index = 0; index < MAX_STOPS; index += 1) {
      state = builderReducer(state, {
        type: "add",
        stop: {
          kind: "new",
          name: `Stop ${index + 1}`,
          latitude: 9 + index * 0.0001,
          longitude: 38 + index * 0.0001,
        },
      });
    }

    expect(state.stops).toHaveLength(MAX_STOPS);
    const overflow = builderReducer(state, {
      type: "add",
      stop: {
        kind: "new",
        name: "Overflow",
        latitude: 10,
        longitude: 39,
      },
    });
    expect(overflow).toBe(state);
  });
});

describe("route builder geo helpers", () => {
  it("snaps to the nearest unused fermata within the threshold", () => {
    const near = findSnapCandidate(
      { latitude: fermataA.latitude + 0.0001, longitude: fermataA.longitude },
      [fermataA, fermataB]
    );
    expect(near?.id).toBe(fermataA.id);

    const used = findSnapCandidate(
      { latitude: fermataA.latitude, longitude: fermataA.longitude },
      [fermataA, fermataB],
      [newStop("existing", fermataA.latitude, fermataA.longitude, {
        kind: "existing",
        fermataId: fermataA.id,
      })],
      30
    );
    expect(used).toBeNull();
  });

  it("does not snap far-away points", () => {
    expect(
      findSnapCandidate(
        { latitude: 9.5, longitude: 38.9 },
        [fermataA, fermataB]
      )
    ).toBeNull();
  });

  it("measures distance with the haversine formula", () => {
    const distance = haversineDistanceMeters(
      { latitude: 9.0155, longitude: 38.7636 },
      { latitude: 9.0155, longitude: 38.7636 }
    );
    expect(distance).toBe(0);
    expect(
      haversineDistanceMeters(
        { latitude: 9.0, longitude: 38.0 },
        { latitude: 9.001, longitude: 38.0 }
      )
    ).toBeGreaterThan(100);
  });
});

describe("route builder naming", () => {
  it("prefers a point-of-interest name", () => {
    expect(
      deriveStopName(
        {
          displayName: "Bole, Addis Ababa, Ethiopia",
          address: { bus_stop: "Bole Bridge" },
        },
        { name: "Africa Avenue" },
        1
      )
    ).toBe("Bole Bridge");
  });

  it("combines road and area when there is no POI", () => {
    expect(
      deriveStopName(
        {
          displayName: "Somewhere, Addis Ababa, Ethiopia",
          address: { road: "Africa Avenue", suburb: "Bole" },
        },
        null,
        2
      )
    ).toBe("Africa Avenue - Bole");
  });

  it("falls back to the OSRM road name, then the stop number", () => {
    expect(
      deriveStopName({ address: {} }, { name: "Ring Road" }, 3)
    ).toBe("Ring Road");
    expect(deriveStopName(null, null, 4)).toBe("Stop 4");
  });

  it("strips country, region-like suffix, and truncates long names", () => {
    const name = deriveStopName(
      {
        displayName: "A".repeat(100),
        address: {},
      },
      null,
      1
    );
    expect(name.length).toBeLessThanOrEqual(60);
  });
});

describe("route builder payload", () => {
  const directions = {
    outbound: {
      geometry: [
        [9.010101, 38.740101],
        [9.020202, 38.800202],
      ] as [number, number][],
      distanceM: 2450.6,
      durationS: 320.4,
    },
    inbound: {
      geometry: [
        [9.020203, 38.800203],
        [9.010102, 38.740102],
      ] as [number, number][],
      distanceM: 2450.6,
      durationS: 320.4,
    },
  };

  it("converts Leaflet [lat, lng] geometry into Django [lng, lat]", () => {
    const payload = buildRoutePayload({
      publicBusNumber: 124,
      name: "Mexico -> Megenagna",
      status: "active",
      stops: [
        {
          key: `existing-${fermataA.id}`,
          kind: "existing",
          fermataId: fermataA.id,
          name: fermataA.name,
          latitude: fermataA.latitude,
          longitude: fermataA.longitude,
          nameEdited: false,
        },
        newStop("new-2", 9.020202, 38.800202, { name: "Megenagna" }),
      ],
      directions,
    });

    expect(payload.stops[0]).toEqual({ fermata_id: fermataA.id });
    expect(payload.stops[1]).toEqual({
      new: {
        name: "Megenagna",
        latitude: 9.020202,
        longitude: 38.800202,
      },
    });
    expect(payload.directions.outbound.geometry[0]).toEqual([
      38.740101, 9.010101,
    ]);
    expect(payload.directions.outbound.distance_m).toBe(2451);
    expect(payload.directions.outbound.duration_s).toBe(320);
  });

  it("requires both directions", () => {
    expect(() =>
      buildRoutePayload({
        publicBusNumber: 1,
        name: "Test route",
        status: "active",
        stops: [newStop("new-1", 9, 38), newStop("new-2", 9.1, 38.1)],
        directions: { outbound: directions.outbound, inbound: null },
      })
    ).toThrow(/Both outbound and inbound/);
  });
});

describe("route builder drafts", () => {
  function createStorage(): DraftStorage & { values: Map<string, string> } {
    const values = new Map<string, string>();
    return {
      values,
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    };
  }

  it("saves, loads, and clears a draft", () => {
    const storage = createStorage();
    const draft = makeDraft({
      publicBusNumber: "124",
      name: "Mexico -> Megenagna",
      status: "active",
      nameEdited: true,
      stops: [newStop("new-1", 9.01, 38.74)],
      nextKey: 2,
      direction: "inbound",
      addMode: false,
    });

    saveDraft(draft, "route-1", storage);
    expect(storage.values.size).toBe(1);

    const loaded = loadDraft("route-1", storage);
    expect(loaded).toEqual(draft);
    expect(isRouteBuilderDraft(loaded)).toBe(true);

    clearDraft("route-1", storage);
    expect(loadDraft("route-1", storage)).toBeNull();
  });

  it("ignores malformed or outdated drafts", () => {
    const storage = createStorage();
    storage.setItem("anbessa:route-builder-draft:new", "{not-json");
    expect(loadDraft(undefined, storage)).toBeNull();

    storage.setItem(
      "anbessa:route-builder-draft:new",
      JSON.stringify({ version: 2, stops: [] })
    );
    expect(loadDraft(undefined, storage)).toBeNull();
  });
});
