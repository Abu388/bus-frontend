"use client";

import * as React from "react";
import type { Map as LeafletMap } from "leaflet";
import { useMapEvents } from "react-leaflet";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDeleteDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
} from "@/shared/ui";
import { MapPinIcon, RefreshIcon } from "@/shared/ui/icons";
import { BaseMap, CoordinatePicker, FermataMarker } from "@/shared/ui/map";
import { formatDate } from "@/shared/lib/format";
import { MAP_CENTER } from "@/shared/config/map";
import { AppError } from "@/shared/api/errors";
import { useToast } from "@/shared/ui/toast";
import {
  useFermatas,
  useCreateFermata,
  useUpdateFermata,
  useDeleteFermata,
  type Fermata,
  type CreateFermataFormData,
  CreateFermataSchema,
} from "@/features/fermatas";
import { geoApi, useGeoSearch } from "@/features/geo";
import type { GeocodePlace, NearestRoadResult } from "@/features/geo";
import { deriveStopName } from "@/features/routes/builder";

/**
 * Binds a Leaflet click handler so the admin can create a fermata by clicking
 * anywhere on the map. Marker clicks stop propagation inside Leaflet, so
 * selecting an existing pin never opens the create dialog.
 */
function MapCreateHandler({
  onCreate,
}: {
  onCreate: (coords: [number, number]) => void;
}) {
  useMapEvents({
    click(event) {
      onCreate([
        Number(event.latlng.lat.toFixed(6)),
        Number(event.latlng.lng.toFixed(6)),
      ]);
    },
  });
  return null;
}

export default function FermatasPage() {
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingFermata, setEditingFermata] = React.useState<Fermata | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = React.useState<Fermata | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [mapCenter, setMapCenter] = React.useState<[number, number]>(MAP_CENTER);
  const [mainMap, setMainMap] = React.useState<LeafletMap | null>(null);
  const [dialogCenter, setDialogCenter] =
    React.useState<[number, number]>(MAP_CENTER);
  const [dialogMap, setDialogMap] = React.useState<LeafletMap | null>(null);

  const fermatasQuery = useFermatas();
  const createMutation = useCreateFermata();
  const updateMutation = useUpdateFermata();
  const deleteMutation = useDeleteFermata();

  const [placeQuery, setPlaceQuery] = React.useState("");
  const [debouncedPlace, setDebouncedPlace] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedPlace(placeQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [placeQuery]);

  const geoSearchQuery = useGeoSearch(
    debouncedPlace,
    debouncedPlace.length >= 2
  );

  const form = useForm<CreateFermataFormData>({
    resolver: zodResolver(CreateFermataSchema),
    defaultValues: {
      name: "",
      latitude: MAP_CENTER[0],
      longitude: MAP_CENTER[1],
    },
  });

  const currentLat = form.watch("latitude");
  const currentLng = form.watch("longitude");

  const markerPosition: [number, number] | null =
    Number.isFinite(currentLat) && Number.isFinite(currentLng)
      ? [currentLat, currentLng]
      : null;

  const formatCoord = (value: number | undefined) =>
    Number.isFinite(value) ? Number(value).toFixed(6) : "—";

  const pickCoords = React.useCallback(
    ([lat, lng]: [number, number]) => {
      form.setValue("latitude", Number(lat.toFixed(6)), {
        shouldValidate: true,
        shouldDirty: true,
      });
      form.setValue("longitude", Number(lng.toFixed(6)), {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [form]
  );

  const filteredFermatas = React.useMemo(() => {
    if (!fermatasQuery.data) return [];
    if (!searchTerm.trim()) return fermatasQuery.data;
    const term = searchTerm.toLowerCase();
    return fermatasQuery.data.filter((fermata) =>
      fermata.name.toLowerCase().includes(term)
    );
  }, [fermatasQuery.data, searchTerm]);

  const selectedFermata = React.useMemo(
    () =>
      fermatasQuery.data?.find((fermata) => fermata.id === selectedId) ?? null,
    [fermatasQuery.data, selectedId]
  );

  const selectFermata = React.useCallback(
    (fermata: Fermata) => {
      setSelectedId(fermata.id);
      const center: [number, number] = [fermata.latitude, fermata.longitude];
      setMapCenter(center);
      mainMap?.flyTo(center, Math.max(mainMap.getZoom(), 15), {
        duration: 0.6,
      });
    },
    [mainMap]
  );

  const nameRequestRef = React.useRef(0);

  const suggestNameFor = React.useCallback(
    async (coords: [number, number]) => {
      const requestId = ++nameRequestRef.current;

      const [reverseResult, nearestResult] = await Promise.allSettled([
        geoApi.reverseGeocode(coords[0], coords[1]),
        geoApi.snapToNearestRoad(coords[0], coords[1]),
      ]);

      if (requestId !== nameRequestRef.current) return;
      if (form.getValues("name").trim().length > 0) return;

      const reverse =
        reverseResult.status === "fulfilled"
          ? (reverseResult.value as GeocodePlace)
          : null;
      const nearest =
        nearestResult.status === "fulfilled"
          ? (nearestResult.value as NearestRoadResult)
          : null;

      const suggestion = deriveStopName(
        reverse
          ? {
              displayName: reverse.displayName,
              address: reverse.address,
            }
          : null,
        nearest,
        1
      );

      form.setValue("name", suggestion, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [form]
  );

  const openCreateAt = React.useCallback(
    ([lat, lng]: [number, number]) => {
      const latitude = Number(lat.toFixed(6));
      const longitude = Number(lng.toFixed(6));

      // Enter creation mode atomically: clear any selected pin and edit state
      // in the same update as opening the dialog so one click is enough.
      setSelectedId(null);
      setEditingFermata(null);
      setDeleteTarget(null);
      form.reset({ name: "", latitude, longitude });
      setPlaceQuery("");
      setDebouncedPlace("");
      setDialogCenter([latitude, longitude]);
      setDialogMap(null);
      setDialogOpen(true);
      void suggestNameFor([latitude, longitude]);
    },
    [form, suggestNameFor]
  );

  const openCreateDialog = React.useCallback(() => {
    const center = mainMap?.getCenter();
    openCreateAt(
      center
        ? [Number(center.lat.toFixed(6)), Number(center.lng.toFixed(6))]
        : mapCenter
    );
  }, [mainMap, mapCenter, openCreateAt]);

  const handlePlaceSelect = React.useCallback(
    (place: GeocodePlace) => {
      const coords: [number, number] = [
        Number(place.lat.toFixed(6)),
        Number(place.lon.toFixed(6)),
      ];

      pickCoords(coords);
      setDialogCenter(coords);

      if (!form.getValues("name").trim()) {
        form.setValue("name", place.displayName.split(",")[0].trim(), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }

      dialogMap?.flyTo(coords, 16, { duration: 0.8 });
      setPlaceQuery("");
      setDebouncedPlace("");
    },
    [dialogMap, form, pickCoords]
  );

  const openEditDialog = (fermata: Fermata) => {
    nameRequestRef.current += 1;
    setSelectedId(null);
    setEditingFermata(fermata);
    form.reset({
      name: fermata.name,
      latitude: fermata.latitude,
      longitude: fermata.longitude,
    });
    setPlaceQuery("");
    setDebouncedPlace("");
    setDialogCenter([fermata.latitude, fermata.longitude]);
    setDialogMap(null);
    setDialogOpen(true);
  };

  const handleFormSubmit = (data: CreateFermataFormData) => {
    if (editingFermata) {
      updateMutation.mutate(
        { id: editingFermata.id, data },
        {
          onSuccess: (updated) => {
            setDialogOpen(false);
            setEditingFermata(null);
            setSelectedId(updated.id);
            setMapCenter([updated.latitude, updated.longitude]);
          },
        }
      );
      return;
    }

    createMutation.mutate(data, {
      onSuccess: (created) => {
        setDialogOpen(false);
        form.reset();
        setSelectedId(created.id);
        setMapCenter([created.latitude, created.longitude]);
      },
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({
        title: "Fermata deleted",
        description: `“${deleteTarget.name}” was removed.`,
        variant: "success",
      });
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(
        error instanceof AppError
          ? error.message
          : "Failed to delete this fermata. It may still be used by a route."
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <MapPinIcon className="h-5 w-5 text-primary" />
            <span>Fermatas (Bus Stops)</span>
            <span className="font-mono text-sm font-normal text-muted-foreground">
              ({fermatasQuery.data?.length ?? 0})
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Every stop used by routes. Select a pin to inspect, or add a new
            boarding point on the map.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fermatasQuery.refetch()}
            disabled={fermatasQuery.isFetching}
            title="Refresh fermatas"
          >
            <RefreshIcon
              className={`h-3.5 w-3.5 ${
                fermatasQuery.isFetching ? "animate-spin" : ""
              }`}
            />
            <span className="sr-only sm:not-sr-only sm:ml-1">Refresh</span>
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={openCreateDialog}
            className="font-semibold"
          >
            + New Fermata
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-7">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-border p-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Stop Map
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Click the map to add a stop. Click a pin to select it, then
                  drag the pin to fine-tune its coordinates.
                </p>
              </div>
              {selectedFermata && (
                <Badge variant="outline" className="max-w-[55%] truncate">
                  {selectedFermata.name}
                </Badge>
              )}
            </div>

            <div className="h-[540px] w-full">
              {fermatasQuery.isLoading ? (
                <Skeleton className="h-full w-full rounded-none" />
              ) : (
                <BaseMap
                  center={mapCenter}
                  zoom={14}
                  onReady={setMainMap}
                  className="h-full w-full"
                >
                  <MapCreateHandler onCreate={openCreateAt} />
                  {fermatasQuery.data?.map((fermata) => {
                    const isSelected = selectedId === fermata.id;
                    return (
                      <FermataMarker
                        key={fermata.id}
                        position={[fermata.latitude, fermata.longitude]}
                        name={fermata.name}
                        onClick={() => selectFermata(fermata)}
                        draggable={isSelected}
                        onDragEnd={([lat, lng]) => {
                          if (updateMutation.isPending) return;
                          const latitude = Number(lat.toFixed(6));
                          const longitude = Number(lng.toFixed(6));
                          updateMutation.mutate(
                            {
                              id: fermata.id,
                              data: { latitude, longitude },
                            },
                            {
                              onSuccess: (updated) => {
                                setMapCenter([
                                  updated.latitude,
                                  updated.longitude,
                                ]);
                              },
                            }
                          );
                        }}
                      />
                    );
                  })}
                </BaseMap>
              )}
            </div>
          </Card>

          {selectedFermata && (
            <Card>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">
                    {selectedFermata.name}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {selectedFermata.latitude.toFixed(6)},{" "}
                    {selectedFermata.longitude.toFixed(6)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Created {formatDate(selectedFermata.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(selectedFermata)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:text-danger"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(selectedFermata);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-5">
          <Card className="flex h-full flex-col">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">All Fermatas</CardTitle>
              <CardDescription className="text-[11px]">
                Search and select a stop to focus it on the map.
              </CardDescription>
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name..."
                className="mt-2 h-8 text-xs"
              />
            </CardHeader>
            <CardContent className="max-h-[620px] flex-1 space-y-1.5 overflow-y-auto p-4 pt-1">
              {fermatasQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : fermatasQuery.isError ? (
                <div className="p-6 text-center text-xs text-danger">
                  Failed to load fermatas: {fermatasQuery.error.message}
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fermatasQuery.refetch()}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : filteredFermatas.length === 0 ? (
                <p className="p-6 text-center text-xs text-muted-foreground">
                  No fermatas match this search.
                </p>
              ) : (
                filteredFermatas.map((fermata) => {
                  const isSelected = selectedId === fermata.id;
                  return (
                    <div
                      key={fermata.id}
                      className={`flex items-start justify-between gap-2 rounded-lg border p-2.5 text-xs transition-colors ${
                        isSelected
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-card hover:bg-muted/20"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => selectFermata(fermata)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate font-semibold text-foreground">
                          {fermata.name}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {fermata.latitude.toFixed(4)},{" "}
                          {fermata.longitude.toFixed(4)}
                        </p>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[10px]"
                          onClick={() => openEditDialog(fermata)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-danger"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(fermata);
                          }}
                          aria-label={`Delete ${fermata.name}`}
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFermata
                ? "Edit Fermata Details"
                : "Register New Fermata (Stop)"}
            </DialogTitle>
            <DialogDescription>
              Click the map or drag the pin to fine-tune the stop, search a
              landmark in Ethiopia, or enter coordinates directly.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="text-xs font-semibold uppercase tracking-wider text-foreground"
              >
                Fermata Name
              </label>
              <Input
                id="name"
                placeholder="e.g. Mexico Square, Legehar, Megenagna"
                autoFocus={!editingFermata}
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-danger">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="relative space-y-1.5">
              <label
                htmlFor="place-search"
                className="text-xs font-semibold uppercase tracking-wider text-foreground"
              >
                Search Place / Landmark in Ethiopia
              </label>
              <Input
                id="place-search"
                type="text"
                placeholder="Type at least 2 letters to search places (e.g. Meskel, Stadium, Bole)..."
                value={placeQuery}
                onChange={(event) => setPlaceQuery(event.target.value)}
                autoComplete="off"
              />

              {debouncedPlace.length >= 2 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-card p-1 text-xs shadow-lg">
                  {geoSearchQuery.isFetching && (
                    <div className="flex items-center gap-2 p-2 text-muted-foreground">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Searching places in Ethiopia…
                    </div>
                  )}

                  {!geoSearchQuery.isFetching &&
                    geoSearchQuery.isError && (
                      <div className="p-2 text-danger">
                        Could not reach the place search service. Check the map
                        server and try again.
                      </div>
                    )}

                  {!geoSearchQuery.isFetching &&
                    !geoSearchQuery.isError &&
                    geoSearchQuery.data?.length === 0 && (
                      <div className="p-2 text-muted-foreground">
                        No places found for “{debouncedPlace}”. Try a town,
                        landmark, or street name.
                      </div>
                    )}

                  {geoSearchQuery.data?.map((place) => (
                    <button
                      key={place.placeId}
                      type="button"
                      onMouseDown={(event) => {
                        // Fires before the input blurs, so the suggestion is
                        // never lost to a closing dropdown on the first click.
                        event.preventDefault();
                        handlePlaceSelect(place);
                      }}
                      className="flex w-full flex-col gap-0.5 rounded p-2 text-left transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                    >
                      <span className="block truncate font-semibold text-foreground">
                        {place.displayName.split(",")[0]}
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {place.displayName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Pick On Map (Click or drag the pin)
                </span>
                <span className="font-mono text-[11px] font-bold text-primary">
                  {formatCoord(currentLat)}, {formatCoord(currentLng)}
                </span>
              </div>

              <div className="h-[420px] min-h-[360px] w-full overflow-hidden rounded-lg border border-border">
                <BaseMap
                  center={dialogCenter}
                  zoom={15}
                  cursor="crosshair"
                  onReady={setDialogMap}
                  className="h-full w-full min-h-[360px]"
                >
                  <CoordinatePicker
                    value={markerPosition}
                    onPick={pickCoords}
                    label={form.watch("name") || "Selected stop location"}
                  />
                </BaseMap>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Pinned
                  </span>
                  <span className="font-mono text-xs font-bold tabular-nums text-foreground">
                    {formatCoord(currentLat)}, {formatCoord(currentLng)}
                  </span>
                  <span className="hidden text-[10px] text-muted-foreground sm:inline">
                    Lat, Lng
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    markerPosition &&
                    dialogMap?.flyTo(markerPosition, 16, { duration: 0.6 })
                  }
                  disabled={!dialogMap || !markerPosition}
                >
                  Center on Pin
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="latitude"
                  className="text-xs text-muted-foreground"
                >
                  Latitude
                </label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  {...form.register("latitude", { valueAsNumber: true })}
                />
                {form.formState.errors.latitude && (
                  <p className="text-[10px] text-danger">
                    {form.formState.errors.latitude.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="longitude"
                  className="text-xs text-muted-foreground"
                >
                  Longitude
                </label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  {...form.register("longitude", { valueAsNumber: true })}
                />
                {form.formState.errors.longitude && (
                  <p className="text-[10px] text-danger">
                    {form.formState.errors.longitude.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                isLoading={
                  createMutation.isPending || updateMutation.isPending
                }
              >
                {editingFermata ? "Save Changes" : "Create Fermata"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!deleteMutation.isPending) {
            setDeleteTarget(open ? deleteTarget : null);
            if (!open) setDeleteError(null);
          }
        }}
        title="Delete fermata"
        itemName={deleteTarget?.name ?? ""}
        description="This permanently removes the stop from the map and from any route that uses it."
        warning="Fermatas still referenced by a route are protected by the backend and cannot be deleted."
        confirmLabel="Delete fermata"
        isPending={deleteMutation.isPending}
        error={deleteError}
        onConfirm={handleDelete}
      />
    </div>
  );
}
