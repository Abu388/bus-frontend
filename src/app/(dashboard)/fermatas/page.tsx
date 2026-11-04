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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Skeleton,
} from "@/shared/ui";
import { MapPinIcon, RefreshIcon } from "@/shared/ui/icons";
import { BaseMap, CoordinatePicker } from "@/shared/ui/map";
import { formatDate } from "@/shared/lib/format";
import {
  useFermatas,
  useCreateFermata,
  useUpdateFermata,
  useDeleteFermata,
  type Fermata,
  type CreateFermataFormData,
  CreateFermataSchema,
} from "@/features/fermatas";
import { useGeoSearch } from "@/features/geo";

export default function FermatasPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingFermata, setEditingFermata] = React.useState<Fermata | null>(null);
  const [deleteConfirmFermata, setDeleteConfirmFermata] = React.useState<Fermata | null>(null);

  // Queries & Mutations
  const fermatasQuery = useFermatas();
  const createMutation = useCreateFermata();
  const updateMutation = useUpdateFermata();
  const deleteMutation = useDeleteFermata();

  // Search places for Nominatim geocoding
  const [placeQuery, setPlaceQuery] = React.useState("");
  const [debouncedPlace, setDebouncedPlace] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPlace(placeQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [placeQuery]);

  const geoSearchQuery = useGeoSearch(debouncedPlace, debouncedPlace.length >= 3);

  // Form
  const form = useForm<CreateFermataFormData>({
    resolver: zodResolver(CreateFermataSchema),
    defaultValues: {
      name: "",
      latitude: 9.0155,
      longitude: 38.7636,
    },
  });

  const currentLat = form.watch("latitude");
  const currentLng = form.watch("longitude");

  const openCreateDialog = () => {
    setEditingFermata(null);
    form.reset({
      name: "",
      latitude: 9.0155,
      longitude: 38.7636,
    });
    setPlaceQuery("");
    setDialogOpen(true);
  };

  const openEditDialog = (fermata: Fermata) => {
    setEditingFermata(fermata);
    form.reset({
      name: fermata.name,
      latitude: fermata.latitude,
      longitude: fermata.longitude,
    });
    setPlaceQuery("");
    setDialogOpen(true);
  };

  const handleFormSubmit = (data: CreateFermataFormData) => {
    if (editingFermata) {
      updateMutation.mutate(
        { id: editingFermata.id, data },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setEditingFermata(null);
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setDialogOpen(false);
          form.reset();
        },
      });
    }
  };

  const filteredFermatas = React.useMemo(() => {
    if (!fermatasQuery.data) return [];
    if (!searchTerm.trim()) return fermatasQuery.data;
    const term = searchTerm.toLowerCase();
    return fermatasQuery.data.filter((f) => f.name.toLowerCase().includes(term));
  }, [fermatasQuery.data, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Fermatas (Bus Stops)</span>
            <span className="text-sm font-normal text-muted-foreground font-mono">
              ({fermatasQuery.data?.length ?? 0} total)
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage station stop points, geographic coordinates, and passenger boarding locations.
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
            <RefreshIcon className={`h-3.5 w-3.5 ${fermatasQuery.isFetching ? "animate-spin" : ""}`} />
            <span className="sr-only sm:not-sr-only sm:ml-1">Refresh</span>
          </Button>
          <Button variant="default" size="sm" onClick={openCreateDialog} className="font-semibold">
            + New Fermata
          </Button>
        </div>
      </div>

      {/* Search Input Bar */}
      <Card className="border-border bg-card p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Input
              type="text"
              placeholder="Search fermatas by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            Showing {filteredFermatas.length} stops
          </span>
        </div>
      </Card>

      {/* Fermatas Table */}
      <Card className="border-border bg-card overflow-hidden">
        <CardContent className="p-0">
          {fermatasQuery.isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : fermatasQuery.isError ? (
            <div className="p-8 text-center text-xs text-danger">
              Failed to load fermatas: {fermatasQuery.error.message}
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={() => fermatasQuery.refetch()}>Retry</Button>
              </div>
            </div>
          ) : filteredFermatas.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No fermatas found. Register a new stop to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Fermata Name</th>
                    <th className="py-3 px-4 font-semibold">Coordinates</th>
                    <th className="py-3 px-4 font-semibold">Created</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredFermatas.map((fermata) => (
                    <tr key={fermata.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                          <MapPinIcon className="h-4 w-4 text-accent" />
                          <span>{fermata.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {fermata.latitude.toFixed(5)}, {fermata.longitude.toFixed(5)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {formatDate(fermata.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(fermata)}
                            className="text-xs h-7 px-2.5"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmFermata(fermata)}
                            className="text-xs h-7 px-2 text-muted-foreground hover:text-danger"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE / EDIT FERMATA DIALOG WITH MAP PICKER & PLACE SEARCH */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFermata ? "Edit Fermata Details" : "Register New Fermata (Stop)"}
            </DialogTitle>
            <DialogDescription>
              Click directly on the map to set coordinates, or search a landmark in Ethiopia via Nominatim.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Fermata Name
              </label>
              <Input
                id="name"
                placeholder="e.g. Mexico Square, Legehar, Megenagna"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-danger">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Nominatim Place Search Box */}
            <div className="space-y-1.5 relative">
              <label htmlFor="place-search" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Search Place / Landmark in Ethiopia
              </label>
              <Input
                id="place-search"
                type="text"
                placeholder="Type at least 3 letters to search places (e.g. Meskel, Stadium, Bole)..."
                value={placeQuery}
                onChange={(e) => setPlaceQuery(e.target.value)}
              />

              {/* Suggestions dropdown */}
              {geoSearchQuery.data && geoSearchQuery.data.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg text-xs">
                  {geoSearchQuery.data.map((place) => (
                    <button
                      key={place.placeId}
                      type="button"
                      onClick={() => {
                        form.setValue("latitude", parseFloat(place.lat.toFixed(5)));
                        form.setValue("longitude", parseFloat(place.lon.toFixed(5)));
                        if (!form.getValues("name")) {
                          form.setValue("name", place.displayName.split(",")[0]);
                        }
                        setPlaceQuery("");
                      }}
                      className="w-full text-left p-2 rounded hover:bg-muted/50 transition-colors truncate"
                    >
                      <span className="font-semibold text-foreground block truncate">
                        {place.displayName.split(",")[0]}
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {place.displayName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Coordinate Picker BaseMap */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Pick On Map (Click to place marker)
                </span>
                <span className="text-[11px] font-mono text-primary font-bold">
                  {currentLat?.toFixed(4)}, {currentLng?.toFixed(4)}
                </span>
              </div>

              <div className="h-56 w-full rounded-lg overflow-hidden border border-border">
                <BaseMap
                  center={[currentLat ?? 9.0155, currentLng ?? 38.7636]}
                  zoom={14}
                  className="w-full h-full"
                >
                  <CoordinatePicker
                    value={currentLat && currentLng ? [currentLat, currentLng] : null}
                    onPick={([lat, lng]) => {
                      form.setValue("latitude", parseFloat(lat.toFixed(5)));
                      form.setValue("longitude", parseFloat(lng.toFixed(5)));
                    }}
                  />
                </BaseMap>
              </div>
            </div>

            {/* Coordinate Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="latitude" className="text-xs text-muted-foreground">Latitude</label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  {...form.register("latitude", { valueAsNumber: true })}
                />
                {form.formState.errors.latitude && (
                  <p className="text-[10px] text-danger">{form.formState.errors.latitude.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label htmlFor="longitude" className="text-xs text-muted-foreground">Longitude</label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  {...form.register("longitude", { valueAsNumber: true })}
                />
                {form.formState.errors.longitude && (
                  <p className="text-[10px] text-danger">{form.formState.errors.longitude.message}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                {editingFermata ? "Save Changes" : "Create Fermata"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={Boolean(deleteConfirmFermata)} onOpenChange={(open) => !open && setDeleteConfirmFermata(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Fermata</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete fermata <span className="font-bold text-foreground">{deleteConfirmFermata?.name}</span>?
              This action cannot be undone if this stop is currently linked to transit routes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmFermata(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              className="bg-danger text-danger-foreground hover:bg-danger/90"
              isLoading={deleteMutation.isPending}
              onClick={() => {
                if (deleteConfirmFermata?.id) {
                  deleteMutation.mutate(deleteConfirmFermata.id, {
                    onSuccess: () => setDeleteConfirmFermata(null),
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
