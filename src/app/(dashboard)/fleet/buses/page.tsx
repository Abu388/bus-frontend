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
import { BusIcon, WrenchIcon, RefreshIcon, UsersIcon } from "@/shared/ui/icons";
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
  useCashers,
  type PhysicalBus,
  type CreateBusFormData,
  CreateBusSchema,
  type MaintenanceStartFormData,
  MaintenanceStartSchema,
  busesApi,
} from "@/features/buses";
import { CreateCasherModal, type CasherUser } from "@/features/users";
import { useRoutes, type Route } from "@/features/routes";

interface BusDetailDrawerProps {
  bus: PhysicalBus;
  onClose: () => void;
  routeMap: Map<string, { number: number; name: string }>;
  casherAssignmentMap: Map<string, { busId: string; targa: string }>;
  cashers: CasherUser[];
  routes: Route[];
  onOpenMaintenance: (bus: PhysicalBus) => void;
  onOpenRetire: (bus: PhysicalBus) => void;
}

function BusDetailDrawer({
  bus,
  onClose,
  routeMap,
  casherAssignmentMap,
  cashers,
  routes,
  onOpenMaintenance,
  onOpenRetire,
}: BusDetailDrawerProps) {
  const updateMutation = useUpdateBus();
  const resumeMutation = useResumeBus();
  const busMaintenanceQuery = useBusMaintenance(bus.id);
  const busTripsQuery = useBusTrips(bus.id);

  const [targa, setTarga] = React.useState(bus.targa ?? "");
  const [route, setRoute] = React.useState(bus.route ?? "");
  const [casher, setCasher] = React.useState(bus.casher ?? "");
  const [status, setStatus] = React.useState<"active" | "maintenance" | "retired">(
    (bus.status as "active" | "maintenance" | "retired") ?? "active"
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUnassigning, setIsUnassigning] = React.useState(false);
  const [isCreateCasherModalOpen, setIsCreateCasherModalOpen] = React.useState(false);

  const isDirty =
    targa !== (bus.targa ?? "") ||
    route !== (bus.route ?? "") ||
    casher !== (bus.casher ?? "") ||
    status !== bus.status;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bus.id) return;
    setIsSaving(true);
    try {
      const newCasher = casher.trim() || null;
      if (newCasher && newCasher !== bus.casher) {
        const prev = casherAssignmentMap.get(newCasher);
        if (prev?.busId && prev.busId !== bus.id) {
          // Unassign from previous bus first so 1-to-1 unique constraint is preserved
          await busesApi.updateBus(prev.busId, { casher: null });
        }
      }

      await updateMutation.mutateAsync({
        id: bus.id,
        data: {
          targa: targa.trim(),
          route: route ? route : null,
          casher: newCasher,
          status,
        },
      });
    } catch {
      // Handled by toast in useUpdateBus
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickUnassignCasher = async () => {
    if (!bus.id) return;
    setIsUnassigning(true);
    try {
      await updateMutation.mutateAsync({
        id: bus.id,
        data: { casher: null },
      });
      setCasher("");
    } catch {
      // Handled by toast in useUpdateBus
    } finally {
      setIsUnassigning(false);
    }
  };

  return (
    <div className="livery-card fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-card border-l border-border shadow-2xl p-6 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <BusIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              <span className="plate-badge text-sm">{bus.targa}</span>
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusPill status={bus.status as StatusType} />
              <span className="text-xs text-muted-foreground">
                {bus.route_number != null || bus.route_name ? (
                  <>
                    <span className="bus-number-badge">{bus.route_number}</span>
                    <span>Bus {bus.route_number} — {bus.route_name}</span>
                  </>
                ) : bus.route && routeMap.get(bus.route) ? (
                  <>
                    <span className="bus-number-badge">
                      {routeMap.get(bus.route)!.number}
                    </span>
                    <span>line</span>
                  </>
                ) : (
                  "No route"
                )}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <UsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Casher:</span>
              {bus.casher_name ? (
                <span className="font-semibold text-foreground">{bus.casher_name}</span>
              ) : (
                <span className="italic text-muted-foreground">Unassigned</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {/* Configuration & Assignments Edit Section */}
      <div className="py-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Vehicle Settings & Assignments
          </h3>
          {isDirty && (
            <span className="text-[10px] text-amber-500 font-medium">Unsaved changes</span>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          {/* Targa Input */}
          <div className="space-y-1">
            <label htmlFor="drawer-targa" className="text-[11px] font-medium text-muted-foreground">
              Plate Number (Targa)
            </label>
            <Input
              id="drawer-targa"
              value={targa}
              onChange={(e) => setTarga(e.target.value)}
              className="h-8 text-xs font-mono"
              disabled={isSaving}
            />
          </div>

          {/* Route Selector */}
          <div className="space-y-1">
            <label htmlFor="drawer-route" className="text-[11px] font-medium text-muted-foreground">
              Assigned Route
            </label>
            <select
              id="drawer-route"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              disabled={isSaving}
              className="w-full h-8 rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">-- No Route Assigned --</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  Line {r.public_bus_number}: {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Casher Selector & Quick Unassign */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="drawer-casher" className="text-[11px] font-medium text-muted-foreground">
                Assigned Casher
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateCasherModalOpen(true)}
                  className="text-[10px] text-primary hover:underline font-medium flex items-center gap-0.5"
                >
                  + New Casher
                </button>
                {bus.casher && (
                  <button
                    type="button"
                    onClick={handleQuickUnassignCasher}
                    disabled={isUnassigning || isSaving}
                    className="text-[10px] text-danger hover:underline disabled:opacity-50"
                  >
                    {isUnassigning ? "Unassigning..." : "Unassign Casher"}
                  </button>
                )}
              </div>
            </div>
            <select
              id="drawer-casher"
              value={casher}
              onChange={(e) => setCasher(e.target.value)}
              disabled={isSaving || isUnassigning}
              className="w-full h-8 rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Unassigned (None)</option>
              {cashers.map((c) => {
                const assigned = casherAssignmentMap.get(c.id);
                const isAssignedToOther = assigned && assigned.busId !== bus.id;
                const isAssignedToThis = assigned && assigned.busId === bus.id;
                return (
                  <option key={c.id} value={c.id}>
                    {c.full_name || c.username}
                    {isAssignedToOther ? ` (Assigned to ${assigned.targa})` : ""}
                    {isAssignedToThis ? " (Current)" : ""}
                  </option>
                );
              })}
            </select>

            {/* Warning notice if casher is already assigned to another bus */}
            {casher &&
              casherAssignmentMap.get(casher) &&
              casherAssignmentMap.get(casher)?.busId !== bus.id && (
                <p className="text-[11px] text-warning-foreground bg-warning/10 border border-warning/20 rounded p-1.5 leading-tight">
                  ⚠️ Note: This casher is currently assigned to bus{" "}
                  <strong>{casherAssignmentMap.get(casher)?.targa}</strong>.
                  Saving will unassign them from {casherAssignmentMap.get(casher)?.targa} and assign them to this bus.
                </p>
              )}
          </div>

          {/* Status Selector */}
          <div className="space-y-1">
            <label htmlFor="drawer-status" className="text-[11px] font-medium text-muted-foreground">
              Operational Status
            </label>
            <select
              id="drawer-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "maintenance" | "retired")}
              disabled={isSaving}
              className="w-full h-8 rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring capitalize"
            >
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          <div className="pt-1">
            <Button
              type="submit"
              size="sm"
              disabled={!isDirty || isSaving}
              isLoading={isSaving}
              className="w-full text-xs font-semibold"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Quick Lifecycle Actions */}
      <div className="py-4 border-b border-border flex items-center gap-2">
        {bus.status === "active" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenMaintenance(bus)}
            className="w-full text-xs text-warning-foreground border-warning/50 hover:border-warning hover:bg-warning/10"
          >
            Send to Maintenance
          </Button>
        )}
        {bus.status === "maintenance" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => bus.id && resumeMutation.mutate(bus.id)}
            disabled={resumeMutation.isPending}
            className="w-full text-xs text-success border-success/40 hover:bg-success/10"
          >
            Restore to Active Service
          </Button>
        )}
        {bus.status !== "retired" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenRetire(bus)}
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

      <CreateCasherModal
        open={isCreateCasherModalOpen}
        onOpenChange={setIsCreateCasherModalOpen}
        onSuccess={(newCasher) => {
          setCasher(newCasher.id);
        }}
      />
    </div>
  );
}

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
  const [createSelectedCasher, setCreateSelectedCasher] = React.useState("");
  const [isSubmittingCreate, setIsSubmittingCreate] = React.useState(false);
  const [isCreateCasherModalOpen, setIsCreateCasherModalOpen] = React.useState(false);

  const [maintenanceBus, setMaintenanceBus] = React.useState<PhysicalBus | null>(null);
  const [retireConfirmBus, setRetireConfirmBus] = React.useState<PhysicalBus | null>(null);
  const [retireError, setRetireError] = React.useState<string | null>(null);

  // Queries
  const queryParams = React.useMemo(() => {
    const p: { status?: string; search?: string } = {};
    if (statusFilter !== "all") p.status = statusFilter;
    if (search.trim()) p.search = search.trim();
    return p;
  }, [statusFilter, search]);

  const busesQuery = useBuses(queryParams);
  const routesQuery = useRoutes();
  const cashersQuery = useCashers();

  // Mutations
  const createMutation = useCreateBus();
  const retireMutation = useRetireBus();
  const maintenanceMutation = useSendToMaintenance();
  const resumeMutation = useResumeBus();

  // Active bus details for drawer
  const selectedBus = React.useMemo(() => {
    if (!selectedBusId || !busesQuery.data) return null;
    return busesQuery.data.find((b) => b.id === selectedBusId) ?? null;
  }, [selectedBusId, busesQuery.data]);

  // Route map for fast lookup
  const routeMap = React.useMemo(() => {
    const map = new Map<string, { number: number; name: string }>();
    routesQuery.data?.forEach((r) => {
      if (r.id) map.set(r.id, { number: r.public_bus_number, name: r.name });
    });
    return map;
  }, [routesQuery.data]);

  // Casher assignment lookup across all buses: casherId -> { busId, targa }
  const casherAssignmentMap = React.useMemo(() => {
    const map = new Map<string, { busId: string; targa: string }>();
    busesQuery.data?.forEach((b) => {
      if (b.casher && b.id) {
        map.set(b.casher, { busId: b.id, targa: b.targa });
      }
    });
    return map;
  }, [busesQuery.data]);

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
      casher: "",
      status: "active",
    },
  });

  const handleCreateSubmit = async (data: CreateBusFormData) => {
    setIsSubmittingCreate(true);
    try {
      const selectedCasherId = data.casher?.trim() || null;
      if (selectedCasherId) {
        const prev = casherAssignmentMap.get(selectedCasherId);
        if (prev?.busId) {
          // Unassign from previous bus first to satisfy 1-to-1 unique constraint cleanly
          await busesApi.updateBus(prev.busId, { casher: null });
        }
      }

      await createMutation.mutateAsync({
        ...data,
        casher: selectedCasherId,
      });

      setCreateDialogOpen(false);
      createForm.reset({
        targa: "",
        route: "",
        casher: "",
        status: "active",
      });
      setCreateSelectedCasher("");
    } catch {
      // Handled by toast in useCreateBus
    } finally {
      setIsSubmittingCreate(false);
    }
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
            Manage physical transit vehicles, route assignments, casher allocations, and maintenance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              busesQuery.refetch();
              cashersQuery.refetch();
            }}
            disabled={busesQuery.isFetching || cashersQuery.isFetching}
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
                    <th className="py-3 px-4 font-semibold">Assigned Casher</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Last Updated</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {busesQuery.data?.map((bus) => {
                    const routeNum = bus.route_number ?? (bus.route ? routeMap.get(bus.route)?.number : null);
                    const routeName = bus.route_name ?? (bus.route ? routeMap.get(bus.route)?.name : null);

                    return (
                      <tr
                        key={bus.id}
                        className={`hover:bg-accent-soft/40 transition-colors ${
                          selectedBusId === bus.id ? "bg-accent-soft/60" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setSelectedBusId(bus.id ?? null)}
                            className="text-left font-bold font-mono text-sm text-foreground hover:text-primary hover:underline flex items-center gap-1.5"
                          >
                            <BusIcon className="h-4 w-4 text-primary" />
                            <span className="plate-badge">{bus.targa}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          {routeNum != null || routeName ? (
                            <div className="flex items-center gap-1.5">
                              <span className="bus-number-badge">{routeNum ?? "—"}</span>
                              <span className="font-medium text-foreground text-[11px] truncate">
                                Bus {routeNum} — {routeName}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted/60 text-muted-foreground">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {bus.casher_name ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-foreground text-xs">
                              <UsersIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="truncate max-w-[150px]">{bus.casher_name}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted/60 text-muted-foreground">
                              Unassigned
                            </span>
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
                                className="text-xs h-7 px-2 text-warning-foreground border-warning/50 hover:border-warning hover:bg-warning/10"
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
                                onClick={() => {
                                  setRetireError(null);
                                  setRetireConfirmBus(bus);
                                }}
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

      {/* DETAIL & EDIT DRAWER / SIDE SHEET */}
      {selectedBus && (
        <BusDetailDrawer
          key={selectedBus.id}
          bus={selectedBus}
          onClose={() => setSelectedBusId(null)}
          routeMap={routeMap}
          casherAssignmentMap={casherAssignmentMap}
          cashers={cashersQuery.data ?? []}
          routes={routesQuery.data ?? []}
          onOpenMaintenance={(b) => setMaintenanceBus(b)}
          onOpenRetire={(b) => {
            setRetireError(null);
            setRetireConfirmBus(b);
          }}
        />
      )}

      {/* CREATE BUS DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Physical Bus</DialogTitle>
            <DialogDescription>
              Enter vehicle license plate (targa) and optionally assign to an active transit line and casher.
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
                disabled={isSubmittingCreate || createMutation.isPending}
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
                disabled={isSubmittingCreate || createMutation.isPending}
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="create-casher" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Assigned Casher (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => setIsCreateCasherModalOpen(true)}
                  className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                >
                  + New Casher
                </button>
              </div>
              <select
                id="create-casher"
                {...createForm.register("casher", {
                  onChange: (e) => setCreateSelectedCasher(e.target.value),
                })}
                disabled={isSubmittingCreate || createMutation.isPending}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Unassigned (None)</option>
                {cashersQuery.data?.map((c) => {
                  const assigned = casherAssignmentMap.get(c.id);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.full_name || c.username}
                      {assigned ? ` (Assigned to ${assigned.targa})` : ""}
                    </option>
                  );
                })}
              </select>

              {createSelectedCasher && casherAssignmentMap.get(createSelectedCasher) && (
                <p className="text-[11px] text-warning-foreground bg-warning/10 border border-warning/20 rounded p-1.5 leading-tight">
                  ⚠️ Note: This casher is currently assigned to bus{" "}
                  <strong>{casherAssignmentMap.get(createSelectedCasher)?.targa}</strong>.
                  Registering will automatically unassign them from {casherAssignmentMap.get(createSelectedCasher)?.targa} and assign them to this new bus.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isSubmittingCreate || createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                isLoading={isSubmittingCreate || createMutation.isPending}
              >
                Create Bus
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QUICK CREATE CASHER MODAL */}
      <CreateCasherModal
        open={isCreateCasherModalOpen}
        onOpenChange={setIsCreateCasherModalOpen}
        onSuccess={(newCasher) => {
          createForm.setValue("casher", newCasher.id, {
            shouldValidate: true,
            shouldDirty: true,
          });
          setCreateSelectedCasher(newCasher.id);
        }}
      />

      {/* SEND TO MAINTENANCE DIALOG */}
      <Dialog open={Boolean(maintenanceBus)} onOpenChange={(open) => !open && setMaintenanceBus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Bus to Maintenance</DialogTitle>
            <DialogDescription>
              Mark bus <span className="plate-badge">{maintenanceBus?.targa}</span> for garage service.
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
      <Dialog
        open={Boolean(retireConfirmBus)}
        onOpenChange={(open) => {
          if (!retireMutation.isPending && !open) {
            setRetireConfirmBus(null);
            setRetireError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retire Vehicle</DialogTitle>
            <DialogDescription>
              Are you sure you want to retire bus <span className="plate-badge">{retireConfirmBus?.targa}</span>?
              Retiring flags this vehicle as permanently decommissioned while preserving all past trip records.
            </DialogDescription>
          </DialogHeader>

          {retireError && (
            <div
              role="alert"
              className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs leading-relaxed text-danger"
            >
              {retireError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRetireConfirmBus(null);
                setRetireError(null);
              }}
              disabled={retireMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              className="bg-danger text-danger-foreground hover:bg-danger/90"
              isLoading={retireMutation.isPending}
              onClick={async () => {
                if (!retireConfirmBus?.id) return;
                setRetireError(null);
                try {
                  await retireMutation.mutateAsync(retireConfirmBus.id);
                  setRetireConfirmBus(null);
                } catch (error) {
                  setRetireError(
                    error instanceof Error
                      ? error.message
                      : "Failed to retire this bus."
                  );
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
