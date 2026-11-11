"use client";

import * as React from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDeleteDialog,
  Input,
  Skeleton,
  StatusPill,
} from "@/shared/ui";
import { MapPinIcon, RefreshIcon, RoutesIcon } from "@/shared/ui/icons";
import { formatDate, formatDistance } from "@/shared/lib/format";
import { AppError } from "@/shared/api/errors";
import { useToast } from "@/shared/ui/toast";
import { useDeleteRoute, useRoutes, type Route } from "@/features/routes";

export default function RoutesPage() {
  const { toast } = useToast();
  const routesQuery = useRoutes();
  const deleteMutation = useDeleteRoute();

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "active" | "inactive"
  >("all");
  const [deleteTarget, setDeleteTarget] = React.useState<Route | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const filteredRoutes = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return (routesQuery.data ?? []).filter((route) => {
      const matchesSearch =
        !term ||
        route.name.toLowerCase().includes(term) ||
        String(route.public_bus_number).includes(term);
      const matchesStatus =
        statusFilter === "all" || (route.status ?? "active") === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [routesQuery.data, search, statusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({
        title: "Route deleted",
        description: `Line #${deleteTarget.public_bus_number} was removed.`,
        variant: "success",
      });
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(
        error instanceof AppError
          ? error.message
          : "Failed to delete this route. It may still be referenced."
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <RoutesIcon className="h-5 w-5 text-primary" />
            <span>Transit Routes</span>
            <span className="font-mono text-sm font-normal text-muted-foreground">
              ({routesQuery.data?.length ?? 0})
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Build routes by clicking stops on the map. New stops become fermatas
            automatically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => routesQuery.refetch()}
            disabled={routesQuery.isFetching}
          >
            <RefreshIcon
              className={`h-3.5 w-3.5 ${
                routesQuery.isFetching ? "animate-spin" : ""
              }`}
            />
            <span className="sr-only sm:not-sr-only sm:ml-1">Refresh</span>
          </Button>
          <Link href="/routes/new">
            <Button variant="default" size="sm" className="font-semibold">
              + Build New Route
            </Button>
          </Link>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by line number or name..."
            className="h-8 w-full text-xs sm:w-80"
          />
          <div className="flex items-center gap-1.5">
            {(["all", "active", "inactive"] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={statusFilter === value ? "default" : "outline"}
                className="h-7 text-[11px] capitalize"
                onClick={() => setStatusFilter(value)}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {routesQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      ) : routesQuery.isError ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-danger">
            Failed to load routes: {routesQuery.error.message}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => routesQuery.refetch()}
          >
            Retry
          </Button>
        </Card>
      ) : filteredRoutes.length === 0 ? (
        <Card className="p-12 text-center">
          <RoutesIcon className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-semibold text-foreground">
            {routesQuery.data?.length === 0
              ? "No routes configured yet."
              : "No routes match your filters."}
          </p>
          <p className="text-xs text-muted-foreground">
            {routesQuery.data?.length === 0
              ? "Build your first route by clicking stops on the map."
              : "Try a different search term or status."}
          </p>
          {routesQuery.data?.length === 0 && (
            <Link href="/routes/new">
              <Button size="sm" className="mt-3">
                + Build New Route
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredRoutes.map((route) => {
            const outbound = route.directions?.find(
              (direction) => direction.direction === "outbound"
            );
            return (
              <Card key={route.id} className="flex flex-col overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between gap-2 p-4 pb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="font-mono">
                        #{route.public_bus_number}
                      </Badge>
                      <StatusPill status={route.status ?? "active"} />
                    </div>
                    <CardTitle className="mt-1.5 truncate text-sm">
                      {route.name}
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Updated {formatDate(route.updated_at)}
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-muted-foreground hover:text-danger"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(route);
                    }}
                    aria-label={`Delete ${route.name}`}
                  >
                    ✕
                  </Button>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col justify-between gap-3 p-4 pt-1">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-md border border-border bg-muted/20 p-2">
                      <p className="font-semibold uppercase tracking-wider text-muted-foreground">
                        Stops
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 font-semibold text-foreground">
                        <MapPinIcon className="h-3 w-3 text-warning" />
                        {route.stops?.length ?? 0}
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 p-2">
                      <p className="font-semibold uppercase tracking-wider text-muted-foreground">
                        Outbound
                      </p>
                      <p className="mt-0.5 font-semibold text-foreground">
                        {formatDistance(outbound?.distance_m)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link href={`/routes/${route.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        View
                      </Button>
                    </Link>
                    <Link href={`/routes/${route.id}/edit`} className="flex-1">
                      <Button variant="default" size="sm" className="w-full">
                        Edit on Map
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!deleteMutation.isPending) {
            setDeleteTarget(open ? deleteTarget : null);
            if (!open) setDeleteError(null);
          }
        }}
        title="Delete route"
        itemName={
          deleteTarget
            ? `Line #${deleteTarget.public_bus_number} — ${deleteTarget.name}`
            : ""
        }
        description="This permanently deletes the route, its stop ordering, and both direction geometries."
        warning="Routes used by trips or other records may be protected by the backend."
        confirmLabel="Delete route"
        isPending={deleteMutation.isPending}
        error={deleteError}
        onConfirm={handleDelete}
      />
    </div>
  );
}
