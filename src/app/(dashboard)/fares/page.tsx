"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFares, useFareHistory, useCreateFare } from "@/features/fares";
import { useRoutes } from "@/features/routes";
import { CreateFareSchema, type CreateFareFormData } from "@/features/fares/schemas";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { StatusPill } from "@/shared/ui/status-pill";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { NavIcon } from "@/shared/ui/icons";
import { formatETB, formatDateTime } from "@/shared/lib/format";

export default function FaresPage() {
  const [selectedRouteFilter, setSelectedRouteFilter] = React.useState<string>("");
  const [isChangeDialogOpen, setIsChangeDialogOpen] = React.useState(false);

  // Queries
  const routesQuery = useRoutes();
  const routes = routesQuery.data || [];

  const faresQuery = useFares({ active: true });
  const activeFares = faresQuery.data || [];

  const historyQuery = useFareHistory(
    selectedRouteFilter ? { route: selectedRouteFilter } : undefined
  );
  const fareHistory = historyQuery.data || [];

  // Mutation
  const createFareMutation = useCreateFare();

  // Form
  const form = useForm<CreateFareFormData>({
    resolver: zodResolver(CreateFareSchema),
    defaultValues: {
      route: "",
      amount: 15,
    },
  });

  const handleOpenDialog = (preselectedRouteId?: string, currentAmount?: string) => {
    form.reset({
      route: preselectedRouteId || (routes[0]?.id ?? ""),
      amount: currentAmount ? parseFloat(currentAmount) : 15,
    });
    setIsChangeDialogOpen(true);
  };

  const onSubmit = (data: CreateFareFormData) => {
    createFareMutation.mutate(data, {
      onSuccess: () => {
        setIsChangeDialogOpen(false);
      },
    });
  };

  // Map route IDs to route names
  const routeMap = React.useMemo(() => {
    const map = new Map<string, { name: string; number: number }>();
    for (const r of routes) {
      if (r.id) {
        map.set(r.id, { name: r.name, number: r.public_bus_number });
      }
    }
    return map;
  }, [routes]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <NavIcon name="tag" className="h-5 w-5" />
            </span>
            Fares & Tariffs
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage flat rate and corridor tariffs in ETB. Historical trip totals and reports remain unaffected by tariff changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleOpenDialog()}
            className="flex items-center gap-2"
          >
            <span>+</span> Change Fare
          </Button>
        </div>
      </div>

      {/* Active Fares Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Current Active Tariffs
        </h2>
        {faresQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : activeFares.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground border-dashed">
            <p className="text-sm">No active fares configured. Click &quot;Change Fare&quot; to set up initial route pricing.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeFares.map((fare) => {
              const routeInfo = routeMap.get(fare.route);
              return (
                <Card key={fare.id} className="border-border bg-card p-4 space-y-3 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary ring-1 ring-inset ring-primary/20">
                        Line {routeInfo?.number ?? "—"}
                      </span>
                      <h3 className="text-sm font-semibold text-foreground mt-1 truncate">
                        {routeInfo?.name ?? "Route"}
                      </h3>
                    </div>
                    <Badge variant="accent" className="text-[10px]">Active</Badge>
                  </div>

                  <div>
                    <div className="text-2xl font-bold tracking-tight text-foreground">
                      {formatETB(fare.amount)}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Effective since {formatDateTime(fare.effective_from)}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleOpenDialog(fare.route, fare.amount)}
                    >
                      Update Rate
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Fare History Audit Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Tariff Version History</CardTitle>
              <CardDescription>
                Auditable historical log of all fare changes with start and end timestamps.
              </CardDescription>
            </div>
            {/* Filter by Route */}
            <div className="flex items-center gap-2">
              <label htmlFor="route-filter" className="text-xs text-muted-foreground whitespace-nowrap">
                Filter Route:
              </label>
              <select
                id="route-filter"
                value={selectedRouteFilter}
                onChange={(e) => setSelectedRouteFilter(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Routes</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    Line {r.public_bus_number} - {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {historyQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : fareHistory.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <p className="text-sm">No fare history records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route / Line</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Effective To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Configured By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fareHistory.map((item) => {
                    const isActive = !item.effective_to;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {item.public_bus_number ? `Line ${item.public_bus_number}` : "—"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {item.route_name || item.route}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-foreground">
                            {formatETB(item.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(item.effective_from)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {item.effective_to ? (
                            formatDateTime(item.effective_to)
                          ) : (
                            <span className="text-success font-medium">Ongoing (Current)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            status={isActive ? "active" : "inactive"}
                            label={isActive ? "Active" : "Archived"}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {item.configured_by_id ? item.configured_by_id.slice(0, 8) + "..." : "System"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Fare Dialog */}
      <Dialog open={isChangeDialogOpen} onOpenChange={setIsChangeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Route Tariff</DialogTitle>
            <DialogDescription>
              Adjust the passenger trip fare in Ethiopian Birr (ETB).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Route Selector */}
            <div className="space-y-1.5">
              <label htmlFor="route" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Target Route
              </label>
              <select
                id="route"
                {...form.register("route")}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select a corridor route...</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    Line {r.public_bus_number}: {r.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.route && (
                <p className="text-xs text-danger">{form.formState.errors.route.message}</p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label htmlFor="amount" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Fare Amount (ETB)
              </label>
              <Input
                id="amount"
                type="number"
                step="0.5"
                min="0.5"
                placeholder="e.g. 15.00"
                {...form.register("amount", { valueAsNumber: true })}
              />
              {form.formState.errors.amount && (
                <p className="text-xs text-danger">{form.formState.errors.amount.message}</p>
              )}
            </div>

            {/* Notice Callout */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <span>ℹ️</span> Immutable Historical Record
              </div>
              <p>
                Updating this tariff automatically sets the previous version&apos;s effective end date.
                Historical trip reports, tickets issued, and cashier transactions remain completely unchanged.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsChangeDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createFareMutation.isPending}
              >
                {createFareMutation.isPending ? "Updating Fare..." : "Save Tariff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
