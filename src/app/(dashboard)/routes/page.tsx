"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  StatusPill,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Skeleton,
} from "@/shared/ui";
import { RoutesIcon, MapPinIcon, RefreshIcon, ArrowRightIcon } from "@/shared/ui/icons";
import { BaseMap, FermataMarker, RoutePolyline } from "@/shared/ui/map";
import {
  useRoutes,
  useRoute,
  useCreateRoute,
  useUpdateRoute,
  useDeleteRoute,
  type Route,
  type CreateRouteFormData,
  CreateRouteSchema,
} from "@/features/routes";
import { useFermatas } from "@/features/fermatas";
import { useStops, useCreateStop, useUpdateStop, useDeleteStop, type RouteStop } from "@/features/stops";
import { useDirections, useUpdateDirection } from "@/features/directions";
import { useCalculateRoute } from "@/features/geo";
import { useToast } from "@/shared/ui/toast";

export default function RoutesPage() {
  const { toast } = useToast();
  const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editingRoute, setEditingRoute] = React.useState<Route | null>(null);
  const [deleteConfirmRoute, setDeleteConfirmRoute] = React.useState<Route | null>(null);
  const [addFermataId, setAddFermataId] = React.useState("");

  // Queries
  const routesQuery = useRoutes();
  const fermatasQuery = useFermatas();
  const selectedRouteQuery = useRoute(selectedRouteId ?? "");
  const stopsQuery = useStops(selectedRouteId ?? undefined);
  const directionsQuery = useDirections(selectedRouteId ?? undefined);

  // Mutations
  const createRouteMutation = useCreateRoute();
  const updateRouteMutation = useUpdateRoute();
  const deleteRouteMutation = useDeleteRoute();
  const createStopMutation = useCreateStop();
  const updateStopMutation = useUpdateStop();
  const deleteStopMutation = useDeleteStop();
  const updateDirectionMutation = useUpdateDirection();
  const calculateRouteMutation = useCalculateRoute();

  // Create/Edit Route Form
  const routeForm = useForm<CreateRouteFormData>({
    resolver: zodResolver(CreateRouteSchema),
    defaultValues: {
      public_bus_number: 1,
      name: "",
      status: "active",
    },
  });

  const handleRouteSubmit = (data: CreateRouteFormData) => {
    if (editingRoute?.id) {
      updateRouteMutation.mutate(
        { id: editingRoute.id, data },
        {
          onSuccess: () => {
            setCreateDialogOpen(false);
            setEditingRoute(null);
          },
        }
      );
    } else {
      createRouteMutation.mutate(data, {
        onSuccess: (newR) => {
          setCreateDialogOpen(false);
          routeForm.reset();
          if (newR.id) setSelectedRouteId(newR.id);
        },
      });
    }
  };

  const openCreateDialog = () => {
    setEditingRoute(null);
    routeForm.reset({
      public_bus_number: (routesQuery.data?.length ?? 0) + 1,
      name: "",
      status: "active",
    });
    setCreateDialogOpen(true);
  };

  const openEditDialog = (route: Route) => {
    setEditingRoute(route);
    routeForm.reset({
      public_bus_number: route.public_bus_number,
      name: route.name,
      status: route.status as "active" | "inactive",
    });
    setCreateDialogOpen(true);
  };

  // Stops ordering logic (no gaps in sequence_number)
  const sortedStops = React.useMemo(() => {
    if (!stopsQuery.data) return [];
    return [...stopsQuery.data].sort((a, b) => (a.sequence_number ?? 0) - (b.sequence_number ?? 0));
  }, [stopsQuery.data]);

  const fermataMap = React.useMemo(() => {
    return new Map(fermatasQuery.data?.map((f) => [f.id, f]));
  }, [fermatasQuery.data]);

  const handleMoveStop = async (index: number, direction: "up" | "down") => {
    if (!selectedRouteId || sortedStops.length < 2) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedStops.length) return;

    const currentStop = sortedStops[index];
    const targetStop = sortedStops[targetIndex];

    if (!currentStop.id || !targetStop.id) return;

    const currentSeq = currentStop.sequence_number ?? index + 1;
    const targetSeq = targetStop.sequence_number ?? targetIndex + 1;

    try {
      // Swap sequence numbers ensuring contiguous numbering
      await updateStopMutation.mutateAsync({
        id: currentStop.id,
        routeId: selectedRouteId,
        data: { sequence_number: targetSeq },
      });
      await updateStopMutation.mutateAsync({
        id: targetStop.id,
        routeId: selectedRouteId,
        data: { sequence_number: currentSeq },
      });
      toast({
        title: "Stop Sequence Updated",
        description: "Contiguous stop ordering maintained.",
      });
    } catch {
      toast({
        title: "Reordering Error",
        description: "Failed to update sequence.",
        variant: "destructive",
      });
    }
  };

  const handleAddStopToRoute = () => {
    if (!selectedRouteId || !addFermataId) return;
    const nextSeq = sortedStops.length + 1;
    createStopMutation.mutate(
      {
        route: selectedRouteId,
        fermata: addFermataId,
        sequence_number: nextSeq,
      },
      {
        onSuccess: () => setAddFermataId(""),
      }
    );
  };

  // Geometry display
  const directionRecord = directionsQuery.data?.[0];
  const polylineCoords = React.useMemo<[number, number][]>(() => {
    if (directionRecord?.geometry && Array.isArray(directionRecord.geometry) && directionRecord.geometry.length > 1) {
      return directionRecord.geometry as [number, number][];
    }
    // Fall back to straight segments between stops
    const coords: [number, number][] = [];
    sortedStops.forEach((s) => {
      const f = s.fermata_detail || (s.fermata ? fermataMap.get(s.fermata) : null);
      if (f && typeof f.latitude === "number" && typeof f.longitude === "number") {
        coords.push([f.latitude, f.longitude]);
      }
    });
    return coords;
  }, [directionRecord, sortedStops, fermataMap]);

  // Recalculate route geometry via OSRM
  const handleRecalculateOSRM = async () => {
    if (!selectedRouteId || sortedStops.length < 2) {
      toast({
        title: "Insufficient Stops",
        description: "At least 2 ordered fermatas are required to calculate OSRM road geometry.",
        variant: "warning",
      });
      return;
    }

    const points: { lat: number; lon: number }[] = [];
    for (const stop of sortedStops) {
      const f = stop.fermata_detail || (stop.fermata ? fermataMap.get(stop.fermata) : null);
      if (f && typeof f.latitude === "number" && typeof f.longitude === "number") {
        points.push({ lat: f.latitude, lon: f.longitude });
      }
    }

    if (points.length < 2) return;

    try {
      const routeResult = await calculateRouteMutation.mutateAsync(points);
      // Django stores RouteDirection.geometry as [lon, lat] pairs
      const djangoGeometry = routeResult.coordinates.map(([lat, lon]) => [lon, lat]);

      if (directionRecord?.id) {
        await updateDirectionMutation.mutateAsync({
          id: directionRecord.id,
          routeId: selectedRouteId,
          data: {
            geometry: djangoGeometry,
            distance_m: routeResult.distanceMeters,
            duration_s: routeResult.durationSeconds,
          },
        });
      }

      toast({
        title: "OSRM Route Geometry Updated",
        description: `Calculated ${Math.round(routeResult.distanceMeters / 1000)} km road path.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Routing Calculation Failed",
        description: err instanceof Error ? err.message : "Failed to calculate road route",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Transit Routes</span>
            <span className="text-sm font-normal text-muted-foreground font-mono">
              ({routesQuery.data?.length ?? 0} active lines)
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure public line numbers, fermata stop sequences, and road geometries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => routesQuery.refetch()}
            disabled={routesQuery.isFetching}
          >
            <RefreshIcon className={`h-3.5 w-3.5 ${routesQuery.isFetching ? "animate-spin" : ""}`} />
            <span className="sr-only sm:not-sr-only sm:ml-1">Refresh</span>
          </Button>
          <Button variant="default" size="sm" onClick={openCreateDialog} className="font-semibold">
            + New Route
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Routes Table (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border bg-card overflow-hidden">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-sm font-semibold">Active Lines</CardTitle>
              <CardDescription className="text-xs">Select a line to view and edit its stops & map</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {routesQuery.isLoading ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : routesQuery.data?.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No routes configured yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {routesQuery.data?.map((route) => {
                    const isSelected = selectedRouteId === route.id;
                    return (
                      <div
                        key={route.id}
                        onClick={() => setSelectedRouteId(route.id ?? null)}
                        className={`p-3.5 cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-muted/30"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-sm text-primary">
                              #{route.public_bus_number}
                            </span>
                            <span className="font-semibold text-xs text-foreground">{route.name}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {route.stops?.length ?? 0} stops configured
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => openEditDialog(route)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-danger"
                            onClick={() => setDeleteConfirmRoute(route)}
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Route Detail, Stop-ordering editor & BaseMap (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedRouteQuery.data ? (
            <Card className="border-border bg-card">
              <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-primary/20 px-2 py-0.5 font-mono font-bold text-xs text-primary">
                      Line #{selectedRouteQuery.data.public_bus_number}
                    </span>
                    <CardTitle className="text-base font-bold text-foreground">
                      {selectedRouteQuery.data.name}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Sequence stops and align road geometry
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecalculateOSRM}
                  disabled={calculateRouteMutation.isPending || updateDirectionMutation.isPending}
                  className="text-xs gap-1"
                >
                  <span>Recalculate Path (OSRM)</span>
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Map Display */}
                <div className="h-64 w-full rounded-lg overflow-hidden border border-border shadow-inner">
                  <BaseMap className="w-full h-full min-h-full">
                    {polylineCoords.length > 0 && <RoutePolyline positions={polylineCoords} />}
                    {sortedStops.map((stop, idx) => {
                      const f = stop.fermata_detail || (stop.fermata ? fermataMap.get(stop.fermata) : null);
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
                  </BaseMap>
                </div>

                {/* Stop Ordering Editor */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Ordered Fermata Stops ({sortedStops.length})
                    </h3>
                  </div>

                  {/* Add Stop selector */}
                  <div className="flex items-center gap-2">
                    <select
                      value={addFermataId}
                      onChange={(e) => setAddFermataId(e.target.value)}
                      className="flex-1 h-8 rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">-- Choose Fermata to append --</option>
                      {fermatasQuery.data?.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.latitude.toFixed(3)}, {f.longitude.toFixed(3)})
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={handleAddStopToRoute}
                      disabled={!addFermataId || createStopMutation.isPending}
                      className="h-8 text-xs font-semibold"
                    >
                      + Add Stop
                    </Button>
                  </div>

                  {/* Ordered Stops List */}
                  {sortedStops.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                      No stops added to this route yet. Choose a fermata above to begin the sequence.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {sortedStops.map((stop, idx) => {
                        const f = stop.fermata_detail || (stop.fermata ? fermataMap.get(stop.fermata) : null);
                        const isFirst = idx === 0;
                        const isLast = idx === sortedStops.length - 1;

                        return (
                          <div
                            key={stop.id ?? idx}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card hover:bg-muted/20 text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 font-bold text-accent font-mono text-[10px]">
                                {stop.sequence_number ?? idx + 1}
                              </span>
                              <div>
                                <p className="font-semibold text-foreground">{f?.name ?? "Unknown Fermata"}</p>
                                <p className="text-[10px] font-mono text-muted-foreground">
                                  {f ? `${f.latitude.toFixed(4)}, ${f.longitude.toFixed(4)}` : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Move Up */}
                              <button
                                onClick={() => handleMoveStop(idx, "up")}
                                disabled={isFirst || updateStopMutation.isPending}
                                className="h-6 w-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
                                title="Move stop up"
                              >
                                ↑
                              </button>
                              {/* Move Down */}
                              <button
                                onClick={() => handleMoveStop(idx, "down")}
                                disabled={isLast || updateStopMutation.isPending}
                                className="h-6 w-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
                                title="Move stop down"
                              >
                                ↓
                              </button>
                              {/* Delete Stop */}
                              <button
                                onClick={() =>
                                  stop.id &&
                                  deleteStopMutation.mutate({ id: stop.id, routeId: selectedRouteId || undefined })
                                }
                                disabled={deleteStopMutation.isPending}
                                className="h-6 w-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-muted ml-1"
                                title="Remove stop from route"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card p-12 text-center text-xs text-muted-foreground">
              Select a route from the left to edit stops and inspect road geometry.
            </Card>
          )}
        </div>
      </div>

      {/* CREATE / EDIT ROUTE DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoute ? "Edit Route" : "Create New Route"}</DialogTitle>
            <DialogDescription>
              Assign the public line number and corridor name (e.g. Mexico - Megenagna).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={routeForm.handleSubmit(handleRouteSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="public_bus_number" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Public Bus Line Number
              </label>
              <Input
                id="public_bus_number"
                type="number"
                placeholder="e.g. 124"
                {...routeForm.register("public_bus_number", { valueAsNumber: true })}
              />
              {routeForm.formState.errors.public_bus_number && (
                <p className="text-xs text-danger">{routeForm.formState.errors.public_bus_number.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Corridor Name
              </label>
              <Input
                id="name"
                placeholder="e.g. Mexico - Megenagna"
                {...routeForm.register("name")}
              />
              {routeForm.formState.errors.name && (
                <p className="text-xs text-danger">{routeForm.formState.errors.name.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" isLoading={createRouteMutation.isPending || updateRouteMutation.isPending}>
                {editingRoute ? "Save Changes" : "Create Line"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE ROUTE CONFIRMATION DIALOG */}
      <Dialog open={Boolean(deleteConfirmRoute)} onOpenChange={(open) => !open && setDeleteConfirmRoute(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Route</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete line <span className="font-bold text-foreground">#{deleteConfirmRoute?.public_bus_number} ({deleteConfirmRoute?.name})</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmRoute(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              className="bg-danger text-danger-foreground hover:bg-danger/90"
              isLoading={deleteRouteMutation.isPending}
              onClick={() => {
                if (deleteConfirmRoute?.id) {
                  deleteRouteMutation.mutate(deleteConfirmRoute.id, {
                    onSuccess: () => {
                      if (selectedRouteId === deleteConfirmRoute.id) setSelectedRouteId(null);
                      setDeleteConfirmRoute(null);
                    },
                  });
                }
              }}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
