"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  Button,
  Input,
  StatusPill,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui";
import type { StatusType } from "@/shared/ui/status-pill";
import { BusIcon, WrenchIcon, RefreshIcon } from "@/shared/ui/icons";
import { formatETB, formatTime12h, formatDate } from "@/shared/lib/format";
import {
  useBuses,
  useCreateBus,
  useUpdateBus,
  useRetireBus,
  useSendToMaintenance,
  useResumeBus,
  useBusMaintenance,
  useBusTrips,
  type PhysicalBus,
  type CreateBusFormData,
  CreateBusSchema,
  type MaintenanceStartFormData,
  MaintenanceStartSchema,
} from "@/features/buses";
import { useRoutes } from "@/features/routes";

function BusesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters from URL
  const statusFilter = searchParams.get("status") || "all";
  const search = searchParams.get("search") || "";

  // Selected bus for Detail Drawer
  const [selectedBusId, setSelectedBusId] = React.useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editingBus, setEditingBus] = React.useState<PhysicalBus | null>(null);
  const [maintenanceBus, setMaintenanceBus] = React.useState<PhysicalBus | null>(null);
  const [retireConfirmBus, setRetireConfirmBus] = React.useState<PhysicalBus | null>(null);

  // Queries
  const queryParams = React.useMemo(() => {
    const p: { status?: string; search?: string } = {};
    if (statusFilter !== "all") p.status = statusFilter;
    if (search.trim()) p.search = search.trim();
    return p;
  }, [statusFilter, search]);

  const busesQuery = useBuses(queryParams);
  const routesQuery = useRoutes();

  // Mutations
  const createMutation = useCreateBus();
  const updateMutation = useUpdateBus();
  const retireMutation = useRetireBus();
  const maintenanceMutation = useSendToMaintenance();
  const resumeMutation = useResumeBus();

  // Active bus details for drawer
  const selectedBus = React.useMemo(() => {
    if (!selectedBusId || !busesQuery.data) return null;
    return busesQuery.data.find((b) => b.id === selectedBusId) ?? null;
  }, [selectedBusId, busesQuery.data]);

  const busMaintenanceQuery = useBusMaintenance(selectedBusId ?? undefined);
  const busTripsQuery = useBusTrips(selectedBusId ?? undefined);

  // Route map for fast lookup
  const routeMap = React.useMemo(() => {
    const map = new Map<string, { number: number; name: string }>();
    routesQuery.data?.forEach((r) => {
      if (r.id) map.set(r.id, { number: r.public_bus_number, name: r.name });
    });
    return map;
  }, [routesQuery.data]);

  const handleFilterChange = (newStatus: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newStatus === "all") {
      params.delete("status");
    } else {
      params.set("status", newStatus);
    }
    router.push(`?${params.toString()}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val.trim()) {
      params.set("search", val);
    } else {
      params.delete("search");
    }
    router.push(`?${params.toString()}`);
  };

  // Create Bus Form
  const createForm = useForm<CreateBusFormData>({
    resolver: zodResolver(CreateBusSchema),
    defaultValues: {
      targa: "",
      route: "",
      status: "active",
    },
  });

  const handleCreateSubmit = (data: CreateBusFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setCreateDialogOpen(false);
        createForm.reset();
      },
    });
  };

  // Maintenance Form
  const maintenanceForm = useForm<MaintenanceStartFormData>({
    resolver: zodResolver(MaintenanceStartSchema),
    defaultValues: {
      reason: "Scheduled routine maintenance",
      description: "",
    },
  });

  const handleMaintenanceSubmit = (data: MaintenanceStartFormData) => {
    if (!maintenanceBus?.id) return;
    maintenanceMutation.mutate(
      { busId: maintenanceBus.id, data },
      {
        onSuccess: () => {
          setMaintenanceBus(null);
          maintenanceForm.reset();
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Fleet Buses</span>
            <span className="text-sm font-normal text-muted-foreground font-mono">
              ({busesQuery.data?.length ?? 0} registered)
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage physical transit vehicles, route assignments, maintenance events, and retirement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => busesQuery.refetch()}
            disabled={busesQuery.isFetching}
            title="Refresh fleet list"
          >
            <RefreshIcon className={`h-3.5 w-3.5 ${busesQuery.isFetching ? "animate-spin" : ""}`} />
            <span className="sr-only sm:not-sr-only sm:ml-1">Refresh</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="font-semibold"
          >
            + Register New Bus
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border bg-card p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            {["all", "active", "maintenance", "retired"].map((s) => (
              <button
                key={s}
                onClick={() => handleFilterChange(s)}
                className={`rounded-md px-3 py-1.5 font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Input
              type="text"
              placeholder="Filter by plate number..."
              defaultValue={search}
              onChange={handleSearchChange}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Buses Table */}
      <Card className="border-border bg-card overflow-hidden">
        <CardContent className="p-0">
          {busesQuery.isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : busesQuery.isError ? (
            <div className="p-8 text-center text-xs text-danger">
              Failed to load buses: {busesQuery.error.message}
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={() => busesQuery.refetch()}>Retry</Button>
              </div>
            </div>
          ) : busesQuery.data?.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No buses found matching your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Plate Number (Targa)</th>
                    <th className="py-3 px-4 font-semibold">Assigned Route</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Last Updated</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {busesQuery.data?.map((bus) => {
                    const routeInfo = bus.route ? routeMap.get(bus.route) : null;
                    return (
                      <tr
                        key={bus.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          selectedBusId === bus.id ? "bg-muted/40" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setSelectedBusId(bus.id ?? null)}
                            className="text-left font-bold font-mono text-sm text-foreground hover:text-primary hover:underline flex items-center gap-1.5"
                          >
                            <BusIcon className="h-4 w-4 text-primary" />
                            <span>{bus.targa}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          {routeInfo ? (
                            <div>
                              <span className="font-semibold text-foreground">Line {routeInfo.number}</span>
                              <span className="text-muted-foreground ml-1.5 truncate text-[11px]">
                                {routeInfo.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <StatusPill status={bus.status as StatusType} />
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          <div>{formatTime12h(bus.updated_at)}</div>
                          <div className="text-[10px] opacity-75">{formatDate(bus.updated_at)}</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedBusId(bus.id ?? null)}
                              className="text-xs h-7 px-2"
                            >
                              Details
                            </Button>

                            {bus.status === "active" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMaintenanceBus(bus)}
                                className="text-xs h-7 px-2 text-warning hover:border-warning"
                              >
                                Service
                              </Button>
                            )}

                            {bus.status === "maintenance" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => bus.id && resumeMutation.mutate(bus.id)}
                                disabled={resumeMutation.isPending}
                                className="text-xs h-7 px-2 text-success hover:border-success"
                              >
                                Resume
                              </Button>
                            )}

                            {bus.status !== "retired" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRetireConfirmBus(bus)}
                                className="text-xs h-7 px-2 text-muted-foreground hover:text-danger"
                              >
                                Retire
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DETAIL DRAWER / SIDE SHEET */}
      {selectedBus && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-card border-l border-border shadow-2xl p-6 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <BusIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-mono text-foreground">{selectedBus.targa}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusPill status={selectedBus.status as StatusType} />
                  <span className="text-xs text-muted-foreground">
                    {selectedBus.route && routeMap.get(selectedBus.route)
                      ? `Line ${routeMap.get(selectedBus.route)!.number}`
                      : "No route"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedBusId(null)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>

          {/* Quick Lifecycle Actions */}
          <div className="py-4 border-b border-border flex items-center gap-2">
            {selectedBus.status === "active" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMaintenanceBus(selectedBus)}
                className="w-full text-xs text-warning border-warning/40 hover:bg-warning/10"
              >
                Send to Maintenance
              </Button>
            )}
            {selectedBus.status === "maintenance" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedBus.id && resumeMutation.mutate(selectedBus.id)}
                disabled={resumeMutation.isPending}
                className="w-full text-xs text-success border-success/40 hover:bg-success/10"
              >
                Restore to Active Service
              </Button>
            )}
            {selectedBus.status !== "retired" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRetireConfirmBus(selectedBus)}
                className="w-full text-xs text-danger border-danger/40 hover:bg-danger/10"
              >
                Retire Bus
              </Button>
            )}
          </div>

          {/* Maintenance History Section */}
          <div className="py-4 border-b border-border space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <WrenchIcon className="h-3.5 w-3.5 text-warning" />
              <span>Maintenance History</span>
            </h3>

            {busMaintenanceQuery.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : busMaintenanceQuery.data?.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No maintenance history recorded for this bus.</p>
            ) : (
              <div className="space-y-2">
                {busMaintenanceQuery.data?.map((m) => (
                  <div key={m.id} className="rounded-lg border border-border bg-muted/20 p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{m.reason}</span>
                      <span className={`text-[10px] font-semibold ${m.ended_at ? "text-success" : "text-warning"}`}>
                        {m.ended_at ? "Resolved" : "Open Service"}
                      </span>
                    </div>
                    {m.description && <p className="text-muted-foreground text-[11px]">{m.description}</p>}
                    <div className="text-[10px] text-muted-foreground flex justify-between pt-1">
                      <span>Started: {formatDate(m.started_at)} {formatTime12h(m.started_at)}</span>
                      {m.ended_at && <span>Ended: {formatDate(m.ended_at)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bus Trips Report Section */}
          <div className="py-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Vehicle Trips & Revenue Report
            </h3>

            {busTripsQuery.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : busTripsQuery.data?.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No historical trips found for this vehicle.</p>
            ) : (
              <div className="space-y-2">
                {busTripsQuery.data?.map((t) => (
                  <div key={t.id} className="rounded-lg border border-border bg-muted/20 p-2.5 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{t.summary_label || `Trip #${t.number}`}</p>
                      <p className="text-[11px] text-muted-foreground">Line {t.public_bus_number} • {t.route_name}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-mono text-primary">{formatETB(t.revenue)}</div>
                      <div className="text-[10px] text-muted-foreground">{t.passenger_count} passengers</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE BUS DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Physical Bus</DialogTitle>
            <DialogDescription>
              Enter vehicle license plate (targa) and optionally assign to an active transit line.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="targa" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Plate Number (Targa)
              </label>
              <Input
                id="targa"
                placeholder="e.g. 3-AA-12403"
                {...createForm.register("targa")}
                disabled={createMutation.isPending}
              />
              {createForm.formState.errors.targa && (
                <p className="text-xs text-danger">{createForm.formState.errors.targa.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="route" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Assigned Route (Optional)
              </label>
              <select
                id="route"
                {...createForm.register("route")}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">-- No Route Assigned --</option>
                {routesQuery.data?.map((r) => (
                  <option key={r.id} value={r.id}>
                    Line {r.public_bus_number}: {r.name}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" isLoading={createMutation.isPending}>
                Create Bus
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* SEND TO MAINTENANCE DIALOG */}
      <Dialog open={Boolean(maintenanceBus)} onOpenChange={(open) => !open && setMaintenanceBus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Bus to Maintenance</DialogTitle>
            <DialogDescription>
              Mark bus <span className="font-mono font-bold">{maintenanceBus?.targa}</span> for garage service.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={maintenanceForm.handleSubmit(handleMaintenanceSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reason" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Maintenance Reason
              </label>
              <Input
                id="reason"
                placeholder="e.g. Brake pad inspection, Oil leak"
                {...maintenanceForm.register("reason")}
                disabled={maintenanceMutation.isPending}
              />
              {maintenanceForm.formState.errors.reason && (
                <p className="text-xs text-danger">{maintenanceForm.formState.errors.reason.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Additional Notes
              </label>
              <Input
                id="description"
                placeholder="Mechanic or garage notes..."
                {...maintenanceForm.register("description")}
                disabled={maintenanceMutation.isPending}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMaintenanceBus(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" className="bg-warning text-warning-foreground hover:bg-warning/90" isLoading={maintenanceMutation.isPending}>
                Submit to Maintenance
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* RETIRE CONFIRMATION DIALOG */}
      <Dialog open={Boolean(retireConfirmBus)} onOpenChange={(open) => !open && setRetireConfirmBus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retire Vehicle</DialogTitle>
            <DialogDescription>
              Are you sure you want to retire bus <span className="font-mono font-bold">{retireConfirmBus?.targa}</span>?
              Retiring flags this vehicle as permanently decommissioned while preserving all past trip records.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRetireConfirmBus(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              className="bg-danger text-danger-foreground hover:bg-danger/90"
              isLoading={retireMutation.isPending}
              onClick={() => {
                if (retireConfirmBus?.id) {
                  retireMutation.mutate(retireConfirmBus.id, {
                    onSuccess: () => setRetireConfirmBus(null),
                  });
                }
              }}
            >
              Confirm Retirement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BusesPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading fleet...</div>}>
      <BusesContent />
    </React.Suspense>
  );
}
