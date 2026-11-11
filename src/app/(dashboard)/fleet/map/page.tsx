"use client";

import * as React from "react";
import {
  BaseMap,
  BusMarker,
  FermataMarker,
  RoutePolyline,
  type BusMarkerState,
} from "@/shared/ui/map";
import { Input, Button, Badge, Skeleton } from "@/shared/ui";
import { BusIcon, RefreshIcon, MapPinIcon, RoutesIcon } from "@/shared/ui/icons";
import { MAP_ROUTE_COLORS } from "@/shared/config/map";
import { formatSpeed, formatRelativeAge, formatTime12h, formatDistance } from "@/shared/lib/format";
import {
  useLiveBuses,
  useBusETA,
  extractRouteCoordinates,
  formatLiveBusDisplay,
  getRouteColor,
} from "@/features/tracking";
import { useBuses } from "@/features/buses";
import { useRoutes, useRoute } from "@/features/routes";
import { useFermatas } from "@/features/fermatas";

let clockSnapshot = 0;

function subscribeToClock(callback: () => void) {
  const interval = setInterval(() => {
    clockSnapshot = Date.now();
    callback();
  }, 5000);
  return () => clearInterval(interval);
}

function getClockSnapshot() {
  if (clockSnapshot === 0) {
    clockSnapshot = Date.now();
  }
  return clockSnapshot;
}

function getClockServerSnapshot() {
  return 0;
}

export default function LiveFleetMapPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedBusId, setSelectedBusId] = React.useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(null);
  const [showAllRoutes, setShowAllRoutes] = React.useState(false);

  // Queries
  const liveBusesQuery = useLiveBuses({ pollIntervalMs: 5000 });
  const allBusesQuery = useBuses();
  const routesQuery = useRoutes();
  const fermatasQuery = useFermatas();

  // ETA Query for currently selected bus
  const etaQuery = useBusETA(selectedBusId ?? undefined);

  // Create lookup maps for fast enrichment
  const busLookup = React.useMemo(() => {
    const map = new Map<string, { targa: string; routeId?: string | null; status?: string }>();
    allBusesQuery.data?.forEach((b) => {
      if (b.id) {
        map.set(b.id, {
          targa: b.targa ?? "BUS",
          routeId: b.route,
          status: b.status,
        });
      }
    });
    return map;
  }, [allBusesQuery.data]);

  const routeLookup = React.useMemo(() => {
    const map = new Map<string, { publicNumber: number; name: string }>();
    routesQuery.data?.forEach((r) => {
      if (r.id) {
        map.set(r.id, {
          publicNumber: r.public_bus_number,
          name: r.name,
        });
      }
    });
    return map;
  }, [routesQuery.data]);

  // Filter live buses by search query (plate or line number or route name)
  const filteredBuses = React.useMemo(() => {
    if (!liveBusesQuery.data) return [];
    if (!searchQuery.trim()) return liveBusesQuery.data;

    const q = searchQuery.trim().toLowerCase();
    return liveBusesQuery.data.filter((bus) => {
      const details = formatLiveBusDisplay(bus, {
        routes: routesQuery.data,
        busLookup,
        routeLookup,
      });

      const plateMatch = details.targa.toLowerCase().includes(q);
      const lineMatch = details.publicBusNumber !== null && String(details.publicBusNumber).includes(q);
      const nameMatch = details.routeName ? details.routeName.toLowerCase().includes(q) : false;
      return plateMatch || lineMatch || nameMatch;
    });
  }, [liveBusesQuery.data, searchQuery, busLookup, routeLookup, routesQuery.data]);

  const currentTimestamp = React.useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getClockServerSnapshot
  );

  // Determine effective selected route (either explicitly selected or derived from selected bus)
  const effectiveSelectedRouteId = React.useMemo(() => {
    if (selectedRouteId) return selectedRouteId;
    if (selectedBusId) {
      const liveBus = liveBusesQuery.data?.find((b) => b.bus === selectedBusId);
      return liveBus?.route || busLookup.get(selectedBusId)?.routeId || null;
    }
    return null;
  }, [selectedRouteId, selectedBusId, liveBusesQuery.data, busLookup]);

  // Query single selected route details (GET /api/routes/<route_id>/ with full fermatas/coordinates)
  const selectedRouteDetailQuery = useRoute(effectiveSelectedRouteId ?? "");

  // Selected route object: prefers full GET /api/routes/<id>/ response, falls back to list
  const selectedRoute = React.useMemo(() => {
    if (!effectiveSelectedRouteId) return null;
    return (
      selectedRouteDetailQuery.data ??
      routesQuery.data?.find((r) => r.id === effectiveSelectedRouteId) ??
      null
    );
  }, [effectiveSelectedRouteId, selectedRouteDetailQuery.data, routesQuery.data]);

  // Selected route geometry / fallback polyline
  const activePolyline = React.useMemo<{
    positions: [number, number][];
    isFallback: boolean;
  }>(() => {
    if (!selectedRoute) return { positions: [], isFallback: false };

    const fermataMap = new Map(
      fermatasQuery.data?.map((f) => [f.id, { latitude: f.latitude, longitude: f.longitude }]) ?? []
    );

    const coords = extractRouteCoordinates(selectedRoute, fermataMap);
    const isFallback = Boolean(
      !selectedRoute.path_coordinates &&
      !(selectedRoute as unknown as { fermatas?: unknown[] }).fermatas &&
      (!selectedRoute.directions || selectedRoute.directions.length === 0)
    );

    return { positions: coords, isFallback };
  }, [selectedRoute, fermatasQuery.data]);

  // Normalized stops for the selected route (using fermata_detail, fermatasQuery lookup, or direct fermatas)
  const selectedRouteStops = React.useMemo(() => {
    if (!selectedRoute) return [];

    // 1. If route has stops array with fermata_detail or fermata IDs
    if (selectedRoute.stops && Array.isArray(selectedRoute.stops) && selectedRoute.stops.length > 0) {
      const fermataMap = new Map(fermatasQuery.data?.map((f) => [f.id, f]));
      return selectedRoute.stops
        .map((stop, idx) => {
          const detail =
            stop.fermata_detail ||
            (stop.fermata ? fermataMap.get(stop.fermata) : null);
          if (!detail || typeof detail.latitude !== "number" || typeof detail.longitude !== "number") {
            return null;
          }
          return {
            id: stop.id ?? detail.id ?? `stop-${idx}`,
            name: detail.name ?? `Stop ${idx + 1}`,
            position: [detail.latitude, detail.longitude] as [number, number],
            sequence: stop.sequence_number ?? idx + 1,
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);
    }

    // 2. Fallback: if route has direct fermatas array
    const directFermatas = (selectedRoute as unknown as {
      fermatas?: Array<{ id?: string; name?: string; latitude?: number; longitude?: number; sequence_number?: number }>;
    }).fermatas;
    if (Array.isArray(directFermatas) && directFermatas.length > 0) {
      return directFermatas
        .map((f, idx) => {
          if (!f || typeof f.latitude !== "number" || typeof f.longitude !== "number") {
            return null;
          }
          return {
            id: f.id ?? `fermata-${idx}`,
            name: f.name ?? `Stop ${idx + 1}`,
            position: [f.latitude, f.longitude] as [number, number],
            sequence: f.sequence_number ?? idx + 1,
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);
    }

    return [];
  }, [selectedRoute, fermatasQuery.data]);

  // Precomputed coordinates for all active routes (for "Show All Routes" toggle)
  const allRoutesWithCoordinates = React.useMemo(() => {
    const fermataMap = new Map(
      fermatasQuery.data?.map((f) => [f.id, { latitude: f.latitude, longitude: f.longitude }]) ?? []
    );

    const activeRoutes = routesQuery.data?.filter((r) => r.status !== "inactive") ?? [];
    return activeRoutes.map((route, idx) => {
      const coords = extractRouteCoordinates(route, fermataMap);
      const color = getRouteColor(idx);
      return {
        route,
        coords,
        color,
      };
    }).filter((item) => item.coords.length > 1);
  }, [routesQuery.data, fermatasQuery.data]);

  // Selected bus live details
  const selectedBusDetails = React.useMemo(() => {
    if (!selectedBusId || !liveBusesQuery.data) return null;
    const bus = liveBusesQuery.data.find((b) => b.bus === selectedBusId);
    if (!bus) return null;

    const formatted = formatLiveBusDisplay(bus, {
      routes: routesQuery.data,
      busLookup,
      routeLookup,
    });

    return {
      live: bus,
      ...formatted,
    };
  }, [selectedBusId, liveBusesQuery.data, routesQuery.data, busLookup, routeLookup]);

  // Selection handlers: toggles off when clicking the same bus again
  const handleSelectBus = (busId: string, routeId?: string | null) => {
    if (selectedBusId === busId) {
      // Toggle off / deselect
      setSelectedBusId(null);
      setSelectedRouteId(null);
    } else {
      setSelectedBusId(busId);
      if (routeId) {
        setSelectedRouteId(routeId);
      }
    }
  };

  const handleClearSelection = () => {
    setSelectedBusId(null);
    setSelectedRouteId(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Live Fleet Map</span>
            <Badge variant="accent" className="text-[10px] px-1.5 py-0">Auto-refresh 5s</Badge>
          </h1>
          <p className="text-xs text-muted-foreground">
            Real-time GPS tracking across Addis Ababa transit network.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative w-full sm:w-60">
            <Input
              type="text"
              placeholder="Search plate, line #, route..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Prominent Show All Routes toggle */}
          <Button
            variant={showAllRoutes ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAllRoutes((prev) => !prev)}
            className="h-8 text-xs font-semibold flex items-center gap-1.5"
            title="Toggle visibility of all transit routes"
          >
            <RoutesIcon className="h-3.5 w-3.5" />
            <span>{showAllRoutes ? "Hide All Routes" : "Show All Routes"}</span>
          </Button>

          {/* Route selector dropdown */}
          <select
            value={selectedRouteId ?? ""}
            onChange={(e) => setSelectedRouteId(e.target.value || null)}
            className="h-8 rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Filter by Route (All)</option>
            {routesQuery.data?.map((r) => (
              <option key={r.id} value={r.id}>
                Line {r.public_bus_number}: {r.name}
              </option>
            ))}
          </select>

          {/* Clear selection button in top bar when a bus or route is active */}
          {(selectedBusId || selectedRouteId) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="h-8 text-xs text-muted-foreground hover:text-foreground font-medium"
              title="Clear selected bus and route"
            >
              ✕ Clear Selection
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => liveBusesQuery.refetch()}
            disabled={liveBusesQuery.isFetching}
            className="h-8 px-2.5"
            title="Manual refresh"
          >
            <RefreshIcon className={`h-3.5 w-3.5 ${liveBusesQuery.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Main Map + Side Panel Layout */}
      <div className="relative flex flex-col lg:flex-row gap-4 h-[calc(100vh-210px)] min-h-[500px]">
        {/* Map Container */}
        <div className="flex-1 h-full min-h-[400px] rounded-lg overflow-hidden border border-border shadow-sm relative">
          <BaseMap className="w-full h-full min-h-full">
            {/* When Show All Routes is toggled ON: render all active route polylines simultaneously */}
            {showAllRoutes
              ? allRoutesWithCoordinates.map((item) => {
                  const isHighlighted = item.route.id === effectiveSelectedRouteId;
                  return (
                    <RoutePolyline
                      key={item.route.id}
                      positions={item.coords}
                      color={isHighlighted ? MAP_ROUTE_COLORS.primary : item.color}
                      casingColor={isHighlighted ? MAP_ROUTE_COLORS.casing : "rgba(15, 23, 42, 0.4)"}
                      weight={isHighlighted ? 6 : 4}
                      opacity={isHighlighted ? 1.0 : 0.85}
                      showCasing={true}
                      tooltipText={`Bus ${item.route.public_bus_number} — ${item.route.name}`}
                      eventHandlers={{
                        click: () => {
                          setSelectedRouteId(item.route.id);
                        },
                      }}
                    />
                  );
                })
              : /* When Show All Routes is OFF: highlight the single selected route polyline if any */
                activePolyline.positions.length > 1 && (
                  <RoutePolyline
                    positions={activePolyline.positions}
                    variant={activePolyline.isFallback ? "fallback" : "active"}
                    weight={6}
                    opacity={1.0}
                    showCasing={true}
                    tooltipText={
                      selectedRoute
                        ? `Bus ${selectedRoute.public_bus_number} — ${selectedRoute.name}`
                        : undefined
                    }
                  />
                )}

            {/* Selected Route Fermata Markers (highlighted stops of the selected route) */}
            {selectedRouteStops.map((stop) => (
              <FermataMarker
                key={stop.id}
                position={stop.position}
                name={stop.name}
                sequence={stop.sequence}
                showLabel={true}
              />
            ))}

            {/* Live Bus Markers */}
            {filteredBuses.map((bus) => {
              const details = formatLiveBusDisplay(bus, {
                routes: routesQuery.data,
                busLookup,
                routeLookup,
              });

              // Marker state logic: active / stale / maintenance
              let state: BusMarkerState = "active";
              if (busLookup.get(bus.bus)?.status === "maintenance") {
                state = "maintenance";
              } else if (bus.is_stale) {
                state = "stale";
              } else if (currentTimestamp > 0) {
                const recordedTime = new Date(bus.recorded_at).getTime();
                const ageSeconds = (currentTimestamp - recordedTime) / 1000;
                if (ageSeconds > 120) {
                  state = "stale";
                }
              }

              // Marker badge displays Public Bus Number (e.g., 124, 81), NOT the targa
              const badgeLabel =
                details.publicBusNumber !== null && details.publicBusNumber !== undefined
                  ? String(details.publicBusNumber)
                  : details.targa;

              return (
                <BusMarker
                  key={bus.bus}
                  position={[bus.latitude, bus.longitude]}
                  state={state}
                  plateNumber={details.targa}
                  publicBusNumber={details.publicBusNumber}
                  badgeLabel={badgeLabel}
                  routeName={details.routeName}
                  routeLabel={details.routeLabel}
                  speed={bus.speed}
                  updatedAt={formatTime12h(bus.recorded_at)}
                  onClick={() => handleSelectBus(bus.bus, details.routeId)}
                />
              );
            })}
          </BaseMap>

          {/* Floating Map Overlay: Status Chips */}
          <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-md border border-border shadow-md text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Active
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" /> Stale (&gt;2m)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-danger" /> Maintenance
            </span>
            <span className="text-muted-foreground ml-2">
              {filteredBuses.length} online
            </span>
          </div>

          {/* Floating Map Overlay: Prominent "Show All Routes" and "Clear Selection" Buttons */}
          <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
            {(selectedBusId || selectedRouteId) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                className="h-8 font-semibold text-xs shadow-md bg-card/95 backdrop-blur-md border border-border hover:bg-muted text-foreground flex items-center gap-1.5"
                title="Clear selected bus and route path"
                data-testid="clear-selection-btn"
              >
                <span>✕ Clear Selection</span>
              </Button>
            )}

            <Button
              variant={showAllRoutes ? "default" : "secondary"}
              size="sm"
              onClick={() => setShowAllRoutes((prev) => !prev)}
              className={`h-8 font-bold text-xs shadow-lg backdrop-blur-md transition-all flex items-center gap-1.5 ${
                showAllRoutes
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-card/95 text-foreground hover:bg-card border border-border"
              }`}
              data-testid="toggle-all-routes"
            >
              <RoutesIcon className="h-3.5 w-3.5" />
              <span>{showAllRoutes ? "Hide All Routes" : "Show All Routes"}</span>
            </Button>
          </div>
        </div>

        {/* Side Panel: Selected Bus Details & ETA, or Live Fleet List */}
        {selectedBusDetails ? (
          <div className="livery-card w-full lg:w-80 shrink-0 bg-card border border-border rounded-lg shadow-md flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header: Displays Bus <public_bus_number> • <targa> • <route_name> */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <BusIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground leading-tight">
                    {selectedBusDetails.displayText}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {selectedBusDetails.publicBusNumber !== null && (
                      <span className="bus-number-badge">
                        Line {selectedBusDetails.publicBusNumber}
                      </span>
                    )}
                    <span>{selectedBusDetails.routeName ?? "Unassigned Route"}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearSelection}
                  className="text-muted-foreground hover:text-foreground p-1 text-sm rounded-md"
                  title="Clear selection and back to fleet list"
                  data-testid="detail-close-btn"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-border bg-muted/20 p-2.5">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Current Speed</span>
                  <span className="text-base font-bold font-mono text-foreground">
                    {formatSpeed(selectedBusDetails.live?.speed)}
                  </span>
                </div>
                <div className="rounded-md border border-border bg-muted/20 p-2.5">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Position Age</span>
                  <span className="text-base font-bold text-foreground">
                    {formatRelativeAge(selectedBusDetails.live?.recorded_at)}
                  </span>
                </div>
              </div>

              {selectedBusDetails.live && (
                <div className="rounded-md border border-border bg-muted/20 p-2.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coordinates:</span>
                    <span className="font-mono text-foreground font-semibold">
                      {selectedBusDetails.live.latitude.toFixed(4)}, {selectedBusDetails.live.longitude.toFixed(4)}
                    </span>
                  </div>
                  {selectedBusDetails.live.heading !== null && selectedBusDetails.live.heading !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Heading:</span>
                      <span className="font-mono text-foreground">{selectedBusDetails.live.heading}°</span>
                    </div>
                  )}
                  {selectedBusDetails.live.distance_along_m !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Distance Along Route:</span>
                      <span className="font-mono text-foreground">{formatDistance(selectedBusDetails.live.distance_along_m)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ETAs per upcoming fermata */}
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Upcoming Fermatas (ETA)</span>
                  {etaQuery.isFetching && <span className="animate-spin text-[10px]">↻</span>}
                </h4>

                {etaQuery.isLoading ? (
                  <div className="space-y-1.5">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : etaQuery.isError || !etaQuery.data ? (
                  <div className="rounded-md border border-border p-3 text-center text-xs text-muted-foreground">
                    No active trip or ETA data available for this vehicle.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {(
                      etaQuery.data.etas ||
                      etaQuery.data.upcoming_stops ||
                      []
                    ).map((item, idx) => (
                      <div
                        key={item.fermata_id ?? idx}
                        className="flex items-center justify-between p-2 rounded-md border border-border bg-card hover:bg-muted/30 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <MapPinIcon className="h-3.5 w-3.5 text-warning shrink-0" />
                          <span className="font-medium text-foreground">{item.fermata_name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold font-mono text-primary">
                            {item.eta_formatted || (item.eta_seconds ? `${Math.round(item.eta_seconds / 60)} min` : "Upcoming")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* When no bus selected: sidebar list of active buses */
          <div className="livery-card w-full lg:w-80 shrink-0 bg-card border border-border rounded-lg shadow-md flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <BusIcon className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Live Fleet ({filteredBuses.length})
                </span>
              </div>
              <Badge variant="accent" className="text-[10px]">Live GPS</Badge>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {filteredBuses.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No online buses matching current filters.
                </div>
              ) : (
                filteredBuses.map((bus) => {
                  const details = formatLiveBusDisplay(bus, {
                    routes: routesQuery.data,
                    busLookup,
                    routeLookup,
                  });
                  return (
                    <button
                      key={bus.bus}
                      onClick={() => handleSelectBus(bus.bus, details.routeId)}
                      className="w-full text-left p-3 hover:bg-muted/40 transition-colors flex items-center justify-between text-xs group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-foreground truncate">
                          {details.displayText}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span>{formatSpeed(bus.speed)}</span>
                          <span>•</span>
                          <span>{formatTime12h(bus.recorded_at)}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-primary opacity-80 group-hover:opacity-100 shrink-0">
                        Track →
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
