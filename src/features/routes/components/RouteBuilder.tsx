"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDeleteDialog,
  Input,
  Skeleton,
} from "@/shared/ui";
import { BaseMap } from "@/shared/ui/map";
import { useToast } from "@/shared/ui/toast";
import { AppError } from "@/shared/api/errors";
import { MAP_CENTER, MAP_ZOOM } from "@/shared/config/map";
import { useFermatas } from "@/features/fermatas";
import { geoApi, useGeoSearch, useOsmBusStops } from "@/features/geo";
import type { GeocodePlace, NearestRoadResult } from "@/features/geo/schemas";
import { useBuildRoute, useRoute, useRoutes, useUpdateBuiltRoute } from "../hooks";
import {
  MAX_STOPS,
  SNAP_THRESHOLD_METERS,
  buildRoutePayload,
  builderReducer,
  clearDraft,
  deriveStopName,
  findSnapCandidate,
  haversineDistanceMeters,
  initialBuilderState,
  loadDraft,
  makeDraft,
  makeExistingStop,
  roundCoordinate,
  saveDraft,
} from "../builder";
import type {
  BuilderFormState,
  BuilderStop,
  DirectionKey,
  DirectionPaths,
  DirectionPreview,
  FermataLike,
  MapViewport,
  Point,
} from "../builder/types";
import { StopsList } from "./StopsList";

const BuilderMap = dynamic(
  () => import("./BuilderMap").then((mod) => mod.BuilderMap),
  { ssr: false }
);

const emptyForm: BuilderFormState = {
  publicBusNumber: "",
  name: "",
  status: "active",
  nameEdited: false,
};

function directionFromRoute(
  direction: { geometry?: unknown; distance_m?: number | null; duration_s?: number | null } | undefined
): DirectionPreview | null {
  if (!direction?.geometry || !Array.isArray(direction.geometry)) return null;
  const geometry = (direction.geometry as [number, number][])
    .filter((pair) => Array.isArray(pair) && pair.length >= 2)
    .map(([lon, lat]) => [Number(lat), Number(lon)] as [number, number]);

  if (geometry.length < 2) return null;

  return {
    geometry,
    distanceM: Number(direction.distance_m ?? 0),
    durationS: Number(direction.duration_s ?? 0),
  };
}

function straightDirection(points: Point[]): DirectionPreview {
  const geometry: [number, number][] = points.map((point) => [
    point.latitude,
    point.longitude,
  ]);
  let distanceM = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    distanceM += haversineDistanceMeters(points[index], points[index + 1]);
  }
  return {
    geometry,
    distanceM,
    durationS: distanceM / 8.33,
    isFallback: true,
  };
}

function formatKm(meters: number | undefined): string {
  if (meters === undefined || Number.isNaN(meters)) return "—";
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatMinutes(seconds: number | undefined): string {
  if (seconds === undefined || Number.isNaN(seconds)) return "—";
  return `${Math.round(seconds / 60)} min`;
}

function fieldErrorMessages(error: AppError): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const [key, value] of Object.entries(error.fieldErrors ?? {})) {
    if (value.length > 0) messages[key] = value[0];
  }
  return messages;
}

export interface RouteBuilderProps {
  routeId?: string;
}

export function RouteBuilder({ routeId }: RouteBuilderProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [state, dispatch] = React.useReducer(builderReducer, initialBuilderState);
  const stateRef = React.useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [form, setForm] = React.useState<BuilderFormState>(emptyForm);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [addMode, setAddMode] = React.useState(true);
  const [activeDirection, setActiveDirection] =
    React.useState<DirectionKey>("outbound");
  const [paths, setPaths] = React.useState<DirectionPaths>({
    outbound: null,
    inbound: null,
  });
  const [pathSignature, setPathSignature] = React.useState<string | null>(null);
  const [isRecomputing, setIsRecomputing] = React.useState(false);
  const [routeWarning, setRouteWarning] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [placeSearch, setPlaceSearch] = React.useState("");
  const [debouncedPlaceSearch, setDebouncedPlaceSearch] = React.useState("");
  const [viewport, setViewport] = React.useState<MapViewport | null>(null);
  const [showOsmStops, setShowOsmStops] = React.useState(false);
  const [focus, setFocus] = React.useState<[number, number] | null>(null);
  const [removeStop, setRemoveStop] = React.useState<BuilderStop | null>(null);
  const [initialized, setInitialized] = React.useState(false);
  const [restoredDraft, setRestoredDraft] = React.useState(false);

  const fermatasQuery = useFermatas();
  const routesQuery = useRoutes();
  const routeQuery = useRoute(routeId ?? "");
  React.useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedPlaceSearch(placeSearch.trim()),
      350
    );
    return () => clearTimeout(timer);
  }, [placeSearch]);
  const placeSearchQuery = useGeoSearch(
    debouncedPlaceSearch,
    debouncedPlaceSearch.length >= 2
  );
  const viewbox = React.useMemo(() => {
    if (!viewport) return undefined;
    const [[south, west], [north, east]] = viewport.bounds;
    return [west, south, east, north]
      .map((value) => value.toFixed(5))
      .join(",");
  }, [viewport]);
  const osmEnabled =
    showOsmStops && Boolean(viewbox) && (viewport?.zoom ?? 0) >= 15;
  const osmStopsQuery = useOsmBusStops(viewbox, osmEnabled);
  const buildMutation = useBuildRoute();
  const updateMutation = useUpdateBuiltRoute();

  const isEdit = Boolean(routeId);
  const isSaving = buildMutation.isPending || updateMutation.isPending;
  const fermatas = React.useMemo(
    () => fermatasQuery.data ?? [],
    [fermatasQuery.data]
  );

  // Load an existing route or restore a saved draft exactly once.
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (initialized) return;

    if (isEdit) {
      if (!routeQuery.data) return;

      const draft = loadDraft(routeId);
      if (draft) {
        dispatch({
          type: "reset",
          stops: draft.stops,
          nextKey: draft.nextKey,
        });
        setForm(draft.form);
        setAddMode(draft.addMode);
        setActiveDirection(draft.direction);
        setRestoredDraft(true);
        setInitialized(true);
        return;
      }

      const sorted = [...(routeQuery.data.stops ?? [])].sort(
        (a, b) => a.sequence_number - b.sequence_number
      );
      const stops: BuilderStop[] = sorted.map((stop, index) => {
        const detail = stop.fermata_detail;
        return {
          key: `existing-${stop.fermata}`,
          kind: "existing",
          fermataId: stop.fermata,
          name: detail?.name ?? `Stop ${index + 1}`,
          latitude: roundCoordinate(detail?.latitude ?? 0),
          longitude: roundCoordinate(detail?.longitude ?? 0),
          nameEdited: false,
        };
      });

      dispatch({
        type: "reset",
        stops,
        nextKey: stops.length + 1,
      });

      setForm({
        publicBusNumber: String(routeQuery.data.public_bus_number),
        name: routeQuery.data.name,
        status: routeQuery.data.status as "active" | "inactive",
        nameEdited: true,
      });

      const outbound = directionFromRoute(
        routeQuery.data.directions?.find((d) => d.direction === "outbound")
      );
      const inbound = directionFromRoute(
        routeQuery.data.directions?.find((d) => d.direction === "inbound")
      );
      if (outbound || inbound) {
        setPaths({ outbound, inbound });
      }

      setInitialized(true);
      return;
    }

    const draft = loadDraft();
    if (draft) {
      dispatch({
        type: "reset",
        stops: draft.stops,
        nextKey: draft.nextKey,
      });
      setForm(draft.form);
      setAddMode(draft.addMode);
      setActiveDirection(draft.direction);
      setRestoredDraft(true);
    }
    setInitialized(true);
  }, [initialized, isEdit, routeId, routeQuery.data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const restoredDraftToastShown = React.useRef(false);
  React.useEffect(() => {
    if (!restoredDraft || restoredDraftToastShown.current) return;
    restoredDraftToastShown.current = true;
    toast({
      title: "Draft restored",
      description: "Your unsaved route draft was restored from this session.",
    });
  }, [restoredDraft, toast]);

  // Persist draft (never tokens) so a refresh restores the work.
  React.useEffect(() => {
    if (!initialized) return;
    saveDraft(
      makeDraft({
        publicBusNumber: form.publicBusNumber,
        name: form.name,
        status: form.status,
        nameEdited: form.nameEdited,
        stops: state.stops,
        nextKey: state.nextKey,
        direction: activeDirection,
        addMode,
      }),
      routeId
    );
  }, [
    activeDirection,
    addMode,
    form,
    initialized,
    routeId,
    state.nextKey,
    state.stops,
  ]);

  // Recompute both directions along real roads, debounced, with stale request
  // cancellation. Keep the previous path visible while the new one is built.
  const stopSignature = state.stops
    .map((stop) => `${stop.latitude},${stop.longitude}`)
    .join("|");

  React.useEffect(() => {
    if (state.stops.length < 2) return;

    const controller = new AbortController();
    const points: Point[] = state.stops.map((stop) => ({
      latitude: stop.latitude,
      longitude: stop.longitude,
    }));

    const timer = setTimeout(async () => {
      setIsRecomputing(true);
      const outboundPoints = points.map((point) => ({
        lat: point.latitude,
        lon: point.longitude,
      }));
      const inboundPoints = [...outboundPoints].reverse();

      try {
        const [outbound, inbound] = await Promise.all([
          geoApi.calculateRoute(outboundPoints, controller.signal),
          geoApi.calculateRoute(inboundPoints, controller.signal),
        ]);

        if (controller.signal.aborted) return;

        const outboundPreview: DirectionPreview = {
          geometry: outbound.coordinates,
          distanceM: outbound.distanceMeters,
          durationS: outbound.durationSeconds,
          isFallback: outbound.isFallback,
        };
        const inboundPreview: DirectionPreview = {
          geometry: inbound.coordinates,
          distanceM: inbound.distanceMeters,
          durationS: inbound.durationSeconds,
          isFallback: inbound.isFallback,
        };

        setPaths({ outbound: outboundPreview, inbound: inboundPreview });
        setPathSignature(stopSignature);
        setRouteWarning(
          outbound.isFallback || inbound.isFallback
            ? "OSRM could not build a road path, so a straight-line estimate is shown."
            : null
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof AppError && error.code === "ABORTED") return;

        const outboundPreview = straightDirection(points);
        const inboundPreview = straightDirection([...points].reverse());
        setPaths({ outbound: outboundPreview, inbound: inboundPreview });
        setPathSignature(stopSignature);
        setRouteWarning(
          "OSRM routing failed, so a dashed straight-line estimate is shown."
        );
      } finally {
        if (!controller.signal.aborted) setIsRecomputing(false);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopSignature]);

  // Warn before leaving with unsaved work.
  React.useEffect(() => {
    if (!initialized) return;
    const hasWork =
      state.stops.length > 0 ||
      form.publicBusNumber.trim().length > 0 ||
      form.name.trim().length > 0;

    const handler = (event: BeforeUnloadEvent) => {
      if (!hasWork) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [form.name, form.publicBusNumber, initialized, state.stops.length]);

  // Ctrl+Z / Cmd+Z undo.
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      dispatch({ type: "undo" });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const addExistingFermata = React.useCallback(
    (fermata: FermataLike) => {
      if (stateRef.current.stops.length >= MAX_STOPS) {
        toast({
          title: "Stop limit reached",
          description: `A route can have at most ${MAX_STOPS} stops.`,
          variant: "warning",
        });
        return;
      }
      if (
        stateRef.current.stops.some(
          (stop) => stop.kind === "existing" && stop.fermataId === fermata.id
        )
      ) {
        toast({
          title: "Already in this route",
          description: `${fermata.name} is already one of the stops.`,
          variant: "warning",
        });
        return;
      }

      dispatch({
        type: "add",
        stop: {
          kind: "existing",
          fermataId: fermata.id,
          name: fermata.name,
          latitude: fermata.latitude,
          longitude: fermata.longitude,
        },
      });
    },
    [toast]
  );

  const addPlaceStop = React.useCallback(
    (place: GeocodePlace) => {
      if (stateRef.current.stops.length >= MAX_STOPS) {
        toast({
          title: "Stop limit reached",
          description: `A route can have at most ${MAX_STOPS} stops.`,
          variant: "warning",
        });
        return;
      }

      const point = { latitude: place.lat, longitude: place.lon };

      if (
        stateRef.current.stops.some(
          (stop) => haversineDistanceMeters(point, stop) < 2
        )
      ) {
        toast({
          title: "Already in this route",
          description: `A stop already exists at this location.`,
          variant: "warning",
        });
        return;
      }

      const candidate = findSnapCandidate(
        point,
        fermatas,
        stateRef.current.stops,
        SNAP_THRESHOLD_METERS
      );

      if (candidate) {
        addExistingFermata(candidate);
        setFocus([candidate.latitude, candidate.longitude]);
        toast({
          title: "Snapped to existing fermata",
          description: `Used “${candidate.name}” instead of creating a duplicate.`,
        });
        return;
      }

      const stopNumber = stateRef.current.stops.length + 1;
      dispatch({
        type: "add",
        stop: {
          kind: "new",
          name: deriveStopName(
            { displayName: place.displayName },
            null,
            stopNumber
          ),
          latitude: Number(place.lat.toFixed(6)),
          longitude: Number(place.lon.toFixed(6)),
        },
      });
      setPlaceSearch("");
      setFocus([Number(place.lat.toFixed(6)), Number(place.lon.toFixed(6))]);
    },
    [addExistingFermata, fermatas, toast]
  );

  const resolveNewStopName = React.useCallback(
    async (key: string, point: Point, stopNumber: number) => {
      const [reverseResult, nearestResult] = await Promise.allSettled([
        geoApi.reverseGeocode(point.latitude, point.longitude),
        geoApi.snapToNearestRoad(point.latitude, point.longitude),
      ]);

      const reverse =
        reverseResult.status === "fulfilled"
          ? (reverseResult.value as GeocodePlace)
          : null;
      const nearest =
        nearestResult.status === "fulfilled"
          ? (nearestResult.value as NearestRoadResult)
          : null;

      const name = deriveStopName(
        reverse
          ? {
              displayName: reverse.displayName,
              address: reverse.address,
            }
          : null,
        nearest,
        stopNumber
      );

      const current = stateRef.current.stops.find((stop) => stop.key === key);
      if (!current || current.nameEdited) return;

      const snapped = nearest?.snapped;
      const stillAtOriginalPoint =
        Math.abs(current.latitude - point.latitude) < 1e-7 &&
        Math.abs(current.longitude - point.longitude) < 1e-7;

      dispatch({
        type: "update",
        key,
        changes: {
          name,
          ...(snapped && stillAtOriginalPoint
            ? {
                latitude: Number(snapped.lat.toFixed(6)),
                longitude: Number(snapped.lon.toFixed(6)),
              }
            : {}),
        },
      });
    },
    []
  );

  const handleMapClick = React.useCallback(
    (point: Point) => {
      if (!addMode) return;

      if (stateRef.current.stops.length >= MAX_STOPS) {
        toast({
          title: "Stop limit reached",
          description: `A route can have at most ${MAX_STOPS} stops.`,
          variant: "warning",
        });
        return;
      }

      const candidate = findSnapCandidate(
        point,
        fermatas,
        stateRef.current.stops,
        SNAP_THRESHOLD_METERS
      );

      if (candidate) {
        addExistingFermata(candidate);
        toast({
          title: "Snapped to existing fermata",
          description: `Used “${candidate.name}” instead of creating a duplicate.`,
        });
        return;
      }

      const key = `new-${stateRef.current.nextKey}`;
      const stopNumber = stateRef.current.stops.length + 1;
      dispatch({
        type: "add",
        stop: {
          kind: "new",
          name: `Stop ${stopNumber}`,
          latitude: point.latitude,
          longitude: point.longitude,
        },
      });
      void resolveNewStopName(key, point, stopNumber);
    },
    [addExistingFermata, addMode, fermatas, resolveNewStopName, toast]
  );

  const handleNewStopDragEnd = React.useCallback(
    (key: string, point: Point) => {
      const currentStops = stateRef.current.stops;
      const stop = currentStops.find((item) => item.key === key);
      if (!stop) return;

      const candidate = findSnapCandidate(
        point,
        fermatas,
        currentStops,
        SNAP_THRESHOLD_METERS
      );

      if (candidate) {
        dispatch({
          type: "replace",
          key,
          stop: {
            ...makeExistingStop(candidate),
            key,
          },
        });
        toast({
          title: "Snapped to existing fermata",
          description: `Used “${candidate.name}” for this stop.`,
        });
        return;
      }

      dispatch({
        type: "update",
        key,
        changes: {
          latitude: point.latitude,
          longitude: point.longitude,
        },
        recordHistory: true,
      });

      if (!stop.nameEdited) {
        const stopNumber =
          currentStops.findIndex((item) => item.key === key) + 1;
        void resolveNewStopName(key, point, stopNumber);
      }
    },
    [fermatas, resolveNewStopName, toast]
  );

  const usedFermataIds = React.useMemo(
    () =>
      new Set(
        state.stops
          .filter((stop) => stop.kind === "existing" && stop.fermataId)
          .map((stop) => stop.fermataId as string)
      ),
    [state.stops]
  );

  const filteredFermatas = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return fermatas
      .filter((fermata) => !term || fermata.name.toLowerCase().includes(term))
      .slice(0, 60);
  }, [fermatas, search]);

  const suggestion =
    state.stops.length >= 2
      ? `${state.stops[0].name} -> ${state.stops[state.stops.length - 1].name}`
      : "";

  const hasEnoughStops = state.stops.length >= 2;
  const effectivePaths: DirectionPaths = hasEnoughStops
    ? paths
    : { outbound: null, inbound: null };
  const pathsAreStale = hasEnoughStops && pathSignature !== stopSignature;
  const visibleWarning = hasEnoughStops ? routeWarning : null;
  const showRecomputing = hasEnoughStops && (isRecomputing || pathsAreStale);

  const numericBusNumber = Number(form.publicBusNumber);
  const duplicateBusNumber = routesQuery.data?.some(
    (route) =>
      route.public_bus_number === numericBusNumber && route.id !== routeId
  );

  const handleSave = async () => {
    setGeneralError(null);
    setFormErrors({});

    const errors: Record<string, string> = {};
    const effectiveName = (form.name.trim() || suggestion).trim();

    if (!Number.isInteger(numericBusNumber) || numericBusNumber <= 0) {
      errors.public_bus_number = "Enter a positive bus line number.";
    } else if (duplicateBusNumber) {
      errors.public_bus_number =
        "This bus number is already used by another route.";
    }

    if (effectiveName.length < 3) {
      errors.name = "Route name must be at least 3 characters.";
    }

    if (state.stops.length < 2) {
      errors.stops = "Add at least 2 stops before saving.";
    } else if (state.stops.length > MAX_STOPS) {
      errors.stops = `A route can have at most ${MAX_STOPS} stops.`;
    }

    if (
      !effectivePaths.outbound ||
      !effectivePaths.inbound ||
      pathsAreStale
    ) {
      errors.directions = "Wait for both route directions to finish calculating.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const payload = buildRoutePayload({
        publicBusNumber: numericBusNumber,
        name: effectiveName,
        status: form.status,
        stops: state.stops,
        directions: effectivePaths,
      });

      const saved = isEdit
        ? await updateMutation.mutateAsync({ id: routeId as string, payload })
        : await buildMutation.mutateAsync(payload);

      clearDraft(routeId);
      toast({
        title: isEdit ? "Route updated" : "Route created",
        description: `Line ${saved.public_bus_number} — ${saved.name} saved successfully.`,
        variant: "success",
      });
      router.push(`/routes/${saved.id}`);
    } catch (error) {
      if (error instanceof AppError) {
        setFormErrors(fieldErrorMessages(error));
        setGeneralError(error.message);
      } else {
        setGeneralError(
          error instanceof Error ? error.message : "Failed to save route."
        );
      }
    }
  };

  if (isEdit && routeQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[520px] w-full" />
      </div>
    );
  }

  if (isEdit && routeQuery.isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-danger">
          Failed to load route: {routeQuery.error.message}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => routeQuery.refetch()}
        >
          Retry
        </Button>
      </Card>
    );
  }

  const activePath =
    activeDirection === "outbound"
      ? effectivePaths.outbound
      : effectivePaths.inbound;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/routes"
              className="text-xs font-semibold text-muted-foreground hover:text-primary"
            >
              ← Routes
            </Link>
            <Badge variant="outline">{isEdit ? "Edit" : "New"}</Badge>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {isEdit ? "Edit Route on Map" : "Build a Route on the Map"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Click places in order. New places become fermatas, existing ones can
            be picked from the map or list.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch({ type: "undo" })}
            disabled={state.history.length === 0}
            title="Undo last change (Ctrl+Z)"
          >
            Undo
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={state.stops.length < 2 || showRecomputing}
          >
            {isEdit ? "Save Changes" : "Create Route"}
          </Button>
        </div>
      </div>

      {generalError && (
        <div
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-danger"
        >
          {generalError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Route Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-1">
              <div className="space-y-1">
                <label
                  htmlFor="public_bus_number"
                  className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Public Bus Number
                </label>
                <Input
                  id="public_bus_number"
                  type="number"
                  min={1}
                  value={form.publicBusNumber}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      publicBusNumber: event.target.value,
                    }))
                  }
                  placeholder="e.g. 124"
                  className="h-9 text-sm"
                />
                {(formErrors.public_bus_number || duplicateBusNumber) && (
                  <p className="text-[11px] text-danger">
                    {formErrors.public_bus_number ??
                      "This bus number is already used by another route."}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="route_name"
                  className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Route Name
                </label>
                <Input
                  id="route_name"
                  value={form.nameEdited ? form.name : form.name || suggestion}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                      nameEdited: true,
                    }))
                  }
                  placeholder={suggestion || "e.g. Mexico -> Megenagna"}
                  className="h-9 text-sm"
                />
                {formErrors.name && (
                  <p className="text-[11px] text-danger">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="route_status"
                  className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Status
                </label>
                <select
                  id="route_status"
                  value={form.status}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      status: event.target.value as "active" | "inactive",
                    }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
              <CardTitle className="text-sm">
                Ordered Stops ({state.stops.length}/{MAX_STOPS})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => dispatch({ type: "undo" })}
                disabled={state.history.length === 0}
              >
                Undo
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-1">
              {state.stops.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Click the map to place stop 1, or add an existing fermata below.
                </div>
              ) : (
                <StopsList
                  stops={state.stops}
                  activeDirection={activeDirection}
                  onMove={(from, to) => dispatch({ type: "move", from, to })}
                  onRemove={(stop) => setRemoveStop(stop)}
                  onRename={(key, name) =>
                    dispatch({
                      type: "update",
                      key,
                      changes: { name, nameEdited: true },
                      recordHistory: true,
                    })
                  }
                  onFocus={(stop) => setFocus([stop.latitude, stop.longitude])}
                />
              )}

              {formErrors.stops && (
                <p className="text-[11px] text-danger">{formErrors.stops}</p>
              )}

              {state.stops.length >= MAX_STOPS && (
                <p className="rounded-md border border-warning/40 bg-warning/10 p-2 text-[11px] text-foreground">
                  Stop limit reached. Remove a stop to add another.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Search Places in Ethiopia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-1">
              <Input
                value={placeSearch}
                onChange={(event) => setPlaceSearch(event.target.value)}
                placeholder="Search a landmark or place (min 2 letters)..."
                className="h-8 text-xs"
                aria-label="Search places to add as a new stop"
              />
              <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                {placeSearchQuery.isFetching && (
                  <p className="p-2 text-center text-[11px] text-muted-foreground">
                    Searching OpenStreetMap...
                  </p>
                )}
                {!placeSearchQuery.isFetching &&
                  (placeSearchQuery.data ?? []).map((place) => (
                    <div
                      key={`${place.placeId}-${place.lat}-${place.lon}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-card p-2 text-xs"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left font-medium text-foreground hover:text-primary hover:underline"
                        onClick={() => setFocus([place.lat, place.lon])}
                        title={place.displayName}
                      >
                        {place.displayName.split(",")[0]}
                      </button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => addPlaceStop(place)}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                {!placeSearchQuery.isFetching &&
                  debouncedPlaceSearch.length >= 2 &&
                  (placeSearchQuery.data ?? []).length === 0 && (
                    <p className="p-2 text-center text-[11px] text-muted-foreground">
                      No places found. Try a different name, or click the map.
                    </p>
                  )}
                {placeSearch.trim().length < 2 && (
                  <p className="p-2 text-center text-[11px] text-muted-foreground">
                    Type a place name to add a brand-new stop without using the
                    map.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Add Existing Fermata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-1">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search fermatas by name..."
                className="h-8 text-xs"
              />
              <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                {filteredFermatas.map((fermata) => {
                  const used = usedFermataIds.has(fermata.id);
                  return (
                    <div
                      key={fermata.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-card p-2 text-xs"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left font-medium text-foreground hover:text-primary hover:underline"
                        onClick={() =>
                          setFocus([fermata.latitude, fermata.longitude])
                        }
                      >
                        {fermata.name}
                      </button>
                      <Button
                        size="sm"
                        variant={used ? "outline" : "secondary"}
                        className="h-6 px-2 text-[10px]"
                        disabled={used}
                        onClick={() => addExistingFermata(fermata)}
                      >
                        {used ? "Added" : "Add"}
                      </Button>
                    </div>
                  );
                })}
                {filteredFermatas.length === 0 && (
                  <p className="p-2 text-center text-[11px] text-muted-foreground">
                    No fermatas match this search.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 p-4 pt-1 text-xs">
              <div className="rounded-lg border border-border bg-muted/20 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Outbound
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {formatKm(effectivePaths.outbound?.distanceM)} ·{" "}
                  {formatMinutes(effectivePaths.outbound?.durationS)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Inbound
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {formatKm(effectivePaths.inbound?.distanceM)} ·{" "}
                  {formatMinutes(effectivePaths.inbound?.durationS)}
                </p>
              </div>
              <div className="col-span-2 text-[11px] text-muted-foreground">
                {state.stops.length} stops · distance and duration include both
                directions.
              </div>
              {formErrors.directions && (
                <p className="col-span-2 text-[11px] text-danger">
                  {formErrors.directions}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={addMode ? "default" : "outline"}
                  onClick={() => setAddMode((value) => !value)}
                  aria-pressed={addMode}
                >
                  {addMode ? "Add mode: ON" : "Add mode: OFF"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={showOsmStops ? "secondary" : "outline"}
                  onClick={() => setShowOsmStops((value) => !value)}
                  aria-pressed={showOsmStops}
                  disabled={
                    !showOsmStops && (!viewport || viewport.zoom < 15)
                  }
                  title={
                    viewport && viewport.zoom >= 15
                      ? "Toggle OpenStreetMap bus stops in this view"
                      : "Zoom in to level 15 or higher to load OSM bus stops"
                  }
                >
                  {showOsmStops ? "OSM stops: ON" : "OSM stops: OFF"}
                </Button>
                <div className="flex overflow-hidden rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() => setActiveDirection("outbound")}
                    className={`px-2.5 py-1 text-[11px] font-semibold ${
                      activeDirection === "outbound"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Outbound
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDirection("inbound")}
                    className={`px-2.5 py-1 text-[11px] font-semibold ${
                      activeDirection === "inbound"
                        ? "bg-accent text-accent-foreground"
                        : "bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Inbound
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {showRecomputing && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Recalculating path...
                  </span>
                )}
                {!showRecomputing && activePath && (
                  <span>
                    {formatKm(activePath.distanceM)} ·{" "}
                    {formatMinutes(activePath.durationS)}
                  </span>
                )}
              </div>
            </div>

            {showOsmStops && (
              <div className="border-b border-border bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
                {!viewport || viewport.zoom < 15
                  ? "Zoom in to level 15 or higher to load OSM bus stops."
                  : osmStopsQuery.isFetching
                    ? "Loading OSM bus stops in this view..."
                    : osmStopsQuery.isError
                      ? "Could not load OSM bus stops. This optional layer is unavailable right now."
                      : `Showing ${osmStopsQuery.data?.length ?? 0} OSM bus stops. Dashed amber dots are not yet fermatas — click one to add it as a new stop.`}
              </div>
            )}

            {visibleWarning && (
              <div className="border-b border-warning/40 bg-warning/10 px-3 py-2 text-[11px] text-foreground">
                {visibleWarning}
              </div>
            )}

            <div className="h-[560px] w-full">
              <BaseMap
                center={MAP_CENTER}
                zoom={MAP_ZOOM}
                cursor={addMode ? "crosshair" : undefined}
                className="h-full w-full"
              >
                <BuilderMap
                  stops={state.stops}
                  fermatas={fermatas}
                  osmStops={osmEnabled ? (osmStopsQuery.data ?? []) : []}
                  addMode={addMode}
                  activeDirection={activeDirection}
                  outboundPath={effectivePaths.outbound}
                  inboundPath={effectivePaths.inbound}
                  focus={focus}
                  onMapClick={handleMapClick}
                  onExistingFermataClick={addExistingFermata}
                  onOsmStopClick={addPlaceStop}
                  onNewStopDragEnd={handleNewStopDragEnd}
                  onViewportChange={setViewport}
                />
              </BaseMap>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={Boolean(removeStop)}
        onOpenChange={(open) => !open && setRemoveStop(null)}
        title="Remove stop from route"
        itemName={removeStop?.name ?? ""}
        description="This removes the stop from the draft. You can undo the change."
        warning="The route path will be recalculated without this stop."
        confirmLabel="Remove stop"
        onConfirm={() => {
          if (removeStop) dispatch({ type: "remove", key: removeStop.key });
          setRemoveStop(null);
        }}
      />
    </div>
  );
}

export default RouteBuilder;
