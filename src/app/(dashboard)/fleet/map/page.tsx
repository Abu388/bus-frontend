"use client";

import * as React from "react";
import {
  BaseMap,
  BusMarker,
  FermataMarker,
  RoutePolyline,
  type BusMarkerState,
} from "@/shared/ui/map";
import { Card, CardHeader, CardTitle, CardContent, Input, Button, Badge, Skeleton } from "@/shared/ui";
import { BusIcon, RefreshIcon, MapPinIcon } from "@/shared/ui/icons";
import { formatSpeed, formatRelativeAge, formatTime12h, formatDistance } from "@/shared/lib/format";
import { useLiveBuses, useBusETA } from "@/features/tracking";
import { useBuses } from "@/features/buses";
import { useRoutes } from "@/features/routes";
import { useFermatas } from "@/features/fermatas";

export default function LiveFleetMapPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedBusId, setSelectedBusId] = React.useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(null);

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

  // Filter live buses by search query (plate or line number)
  const filteredBuses = React.useMemo(() => {
    if (!liveBusesQuery.data) return [];
    if (!searchQuery.trim()) return liveBusesQuery.data;

    const q = searchQuery.trim().toLowerCase();
    return liveBusesQuery.data.filter((bus) => {
      const info = busLookup.get(bus.bus);
      const plateMatch = info?.targa.toLowerCase().includes(q);
      const routeInfo = info?.routeId ? routeLookup.get(info.routeId) : undefined;
      const lineMatch = routeInfo?.publicNumber.toString().includes(q);
      const nameMatch = routeInfo?.name.toLowerCase().includes(q);
      return plateMatch || lineMatch || nameMatch;
    });
  }, [liveBusesQuery.data, searchQuery, busLookup, routeLookup]);

  // Selected route geometry
  const selectedRoute = React.useMemo(() => {
    if (!selectedRouteId) return null;
    return routesQuery.data?.find((r) => r.id === selectedRouteId) ?? null;
  }, [selectedRouteId, routesQuery.data]);

  const activePolylinePositions = React.useMemo<[number, number][]>(() => {
    if (!selectedRoute) return [];

    // 1. Try direction geometry
    const dir = selectedRoute.directions?.[0];
    if (dir?.geometry && Array.isArray(dir.geometry) && dir.geometry.length > 1) {
      return dir.geometry as [number, number][];
    }

    // 2. Fall back to straight polyline through ordered fermatas
    if (selectedRoute.stops && selectedRoute.stops.length > 1) {
      const sortedStops = [...selectedRoute.stops].sort(
        (a, b) => (a.sequence_number ?? 0) - (b.sequence_number ?? 0)
      );
      const fermataMap = new Map(fermatasQuery.data?.map((f) => [f.id, f]));
      const coords: [number, number][] = [];

      sortedStops.forEach((s) => {
        const f = s.fermata_detail || (s.fermata ? fermataMap.get(s.fermata) : null);
        if (f && typeof f.latitude === "number" && typeof f.longitude === "number") {
          coords.push([f.latitude, f.longitude]);
        }
      });
      return coords;
    }

    return [];
  }, [selectedRoute, fermatasQuery.data]);

  // Selected bus details
  const selectedBusLive = React.useMemo(() => {
    if (!selectedBusId || !liveBusesQuery.data) return null;
    return liveBusesQuery.data.find((b) => b.bus === selectedBusId) ?? null;
  }, [selectedBusId, liveBusesQuery.data]);

  const selectedBusInfo = selectedBusId ? busLookup.get(selectedBusId) : null;
  const selectedBusRoute = selectedBusInfo?.routeId ? routeLookup.get(selectedBusInfo.routeId) : null;

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

        <div className="flex items-center gap-2">
          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search bus plate or line #..."
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

          {/* Route selector dropdown */}
          <select
            value={selectedRouteId ?? ""}
            onChange={(e) => setSelectedRouteId(e.target.value || null)}
            className="h-8 rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Show All Routes</option>
            {routesQuery.data?.map((r) => (
              <option key={r.id} value={r.id}>
                Line {r.public_bus_number}: {r.name}
              </option>
            ))}
          </select>

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
            {/* Selected Route Polyline */}
            {activePolylinePositions.length > 0 && (
              <RoutePolyline positions={activePolylinePositions} />
            )}

            {/* Selected Route Fermata Markers */}
            {selectedRoute?.stops?.map((stop, idx) => {
              const f =
                stop.fermata_detail ||
                fermatasQuery.data?.find((item) => item.id === stop.fermata);
              if (!f) return null;
              return (
                <FermataMarker
                  key={stop.id ?? idx}
                  position={[f.latitude, f.longitude]}
                  name={f.name}
                  sequence={stop.sequence_number ?? idx + 1}
                />
              );
            })}

            {/* Live Bus Markers */}
            {filteredBuses.map((bus) => {
              const info = busLookup.get(bus.bus);
              const plate = info?.targa ?? "BUS";
              const routeInfo = info?.routeId ? routeLookup.get(info.routeId) : undefined;
              const routeLabel = routeInfo ? `Line ${routeInfo.publicNumber}` : undefined;

              // Marker state logic: active / stale / maintenance
              let state: BusMarkerState = "active";
              if (info?.status === "maintenance") {
                state = "maintenance";
              } else {
                const recordedTime = new Date(bus.recorded_at).getTime();
                const now = Date.now();
                const ageSeconds = (now - recordedTime) / 1000;
                if (ageSeconds > 120) {
                  state = "stale";
                }
              }

              return (
                <BusMarker
                  key={bus.bus}
                  position={[bus.latitude, bus.longitude]}
                  state={state}
                  plateNumber={plate}
                  speed={bus.speed}
                  routeLabel={routeLabel}
                  updatedAt={formatTime12h(bus.recorded_at)}
                  onClick={() => {
                    setSelectedBusId(bus.bus);
                    if (info?.routeId) {
                      setSelectedRouteId(info.routeId);
                    }
                  }}
                />
              );
            })}
          </BaseMap>

          {/* Quick status chips floating over map */}
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
              Showing {filteredBuses.length} online
            </span>
          </div>
        </div>

        {/* Side Panel: Selected Bus Details & ETA */}
        {selectedBusId && (
          <div className="w-full lg:w-80 shrink-0 bg-card border border-border rounded-lg shadow-md flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <BusIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {selectedBusInfo?.targa ?? "Bus Details"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedBusRoute ? `Line ${selectedBusRoute.publicNumber} • ${selectedBusRoute.name}` : "Unassigned Route"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBusId(null)}
                className="text-muted-foreground hover:text-foreground p-1 text-sm rounded-md"
                title="Close panel"
              >
                ✕
              </button>
            </div>

            {/* Metrics */}
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-border bg-muted/20 p-2.5">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Current Speed</span>
                  <span className="text-base font-bold font-mono text-foreground">
                    {formatSpeed(selectedBusLive?.speed)}
                  </span>
                </div>
                <div className="rounded-md border border-border bg-muted/20 p-2.5">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Position Age</span>
                  <span className="text-base font-bold text-foreground">
                    {formatRelativeAge(selectedBusLive?.recorded_at)}
                  </span>
                </div>
              </div>

              {selectedBusLive && (
                <div className="rounded-md border border-border bg-muted/20 p-2.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coordinates:</span>
                    <span className="font-mono text-foreground font-semibold">
                      {selectedBusLive.latitude.toFixed(4)}, {selectedBusLive.longitude.toFixed(4)}
                    </span>
                  </div>
                  {selectedBusLive.heading !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Heading:</span>
                      <span className="font-mono text-foreground">{selectedBusLive.heading}°</span>
                    </div>
                  )}
                  {selectedBusLive.distance_along_m !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Distance Along Route:</span>
                      <span className="font-mono text-foreground">{formatDistance(selectedBusLive.distance_along_m)}</span>
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
                    {/* Handle any shape of ETAs returned */}
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
                          <MapPinIcon className="h-3.5 w-3.5 text-accent shrink-0" />
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
        )}
      </div>
    </div>
  );
}
