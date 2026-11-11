"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDeleteDialog,
  Skeleton,
  StatusPill,
} from "@/shared/ui";
import { BaseMap, FermataMarker, RoutePolyline } from "@/shared/ui/map";
import { formatDate, formatDistance } from "@/shared/lib/format";
import { AppError } from "@/shared/api/errors";
import { useToast } from "@/shared/ui/toast";
import { useDeleteRoute, useRoute } from "../hooks";
import type { DirectionKey } from "../builder/types";

function toLeafletGeometry(value: unknown): [number, number][] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (pair): pair is [number, number] =>
        Array.isArray(pair) &&
        pair.length >= 2 &&
        Number.isFinite(Number(pair[0])) &&
        Number.isFinite(Number(pair[1]))
    )
    .map(([lon, lat]) => [Number(lat), Number(lon)]);
}

function formatMinutes(seconds: number | null | undefined): string {
  if (!seconds || Number.isNaN(seconds)) return "—";
  return `${Math.round(seconds / 60)} min`;
}

export interface RouteDetailProps {
  routeId: string;
}

export function RouteDetail({ routeId }: RouteDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const routeQuery = useRoute(routeId);
  const deleteMutation = useDeleteRoute();

  const [direction, setDirection] = React.useState<DirectionKey>("outbound");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const route = routeQuery.data;

  const stops = React.useMemo(
    () =>
      [...(route?.stops ?? [])].sort(
        (a, b) => a.sequence_number - b.sequence_number
      ),
    [route?.stops]
  );

  const outboundRecord = route?.directions?.find(
    (item) => item.direction === "outbound"
  );
  const inboundRecord = route?.directions?.find(
    (item) => item.direction === "inbound"
  );
  const directionRecord =
    direction === "outbound" ? outboundRecord : inboundRecord;

  const geometry = React.useMemo(
    () => toLeafletGeometry(directionRecord?.geometry),
    [directionRecord?.geometry]
  );

  const otherGeometry = React.useMemo(
    () =>
      toLeafletGeometry(
        (direction === "outbound" ? inboundRecord : outboundRecord)?.geometry
      ),
    [direction, inboundRecord, outboundRecord]
  );

  const bounds = React.useMemo<[[number, number], [number, number]] | undefined>(
    () => {
      if (stops.length < 2) return undefined;
      const latitudes = stops.map((stop) => stop.fermata_detail.latitude);
      const longitudes = stops.map((stop) => stop.fermata_detail.longitude);
      return [
        [Math.min(...latitudes), Math.min(...longitudes)],
        [Math.max(...latitudes), Math.max(...longitudes)],
      ];
    },
    [stops]
  );

  const center = stops[0]
    ? ([
        stops[0].fermata_detail.latitude,
        stops[0].fermata_detail.longitude,
      ] as [number, number])
    : undefined;

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(routeId);
      toast({
        title: "Route deleted",
        description: "The route and its stops were removed.",
        variant: "success",
      });
      router.push("/routes");
    } catch (error) {
      setDeleteError(
        error instanceof AppError
          ? error.message
          : "Failed to delete this route. It may still be referenced."
      );
    }
  };

  if (routeQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  if (routeQuery.isError || !route) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-danger">
          Failed to load route: {routeQuery.error?.message ?? "Not found"}
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => routeQuery.refetch()}>
            Retry
          </Button>
          <Link href="/routes">
            <Button variant="outline" size="sm">
              Back to routes
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/routes"
            className="text-xs font-semibold text-muted-foreground hover:text-primary"
          >
            ← Routes
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Line #{route.public_bus_number}
            </h1>
            <StatusPill status={route.status ?? "active"} />
          </div>
          <p className="text-sm text-muted-foreground">{route.name}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Updated {formatDate(route.updated_at)} · {stops.length} stops
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/routes/${routeId}/edit`}>
            <Button size="sm" variant="default">
              Edit on Map
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="text-danger hover:border-danger/40"
            onClick={() => {
              setDeleteError(null);
              setDeleteOpen(true);
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
              <div className="flex overflow-hidden rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => setDirection("outbound")}
                  className={`px-2.5 py-1 text-[11px] font-semibold ${
                    direction === "outbound"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Outbound
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("inbound")}
                  className={`px-2.5 py-1 text-[11px] font-semibold ${
                    direction === "inbound"
                      ? "bg-accent text-accent-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Inbound
                </button>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{formatDistance(directionRecord?.distance_m)}</span>
                <span>·</span>
                <span>{formatMinutes(directionRecord?.duration_s)}</span>
              </div>
            </div>

            <div className="h-[460px] w-full">
              <BaseMap
                center={center}
                zoom={center ? 14 : undefined}
                bounds={bounds}
                className="h-full w-full"
              >
                {otherGeometry.length > 1 && (
                  <RoutePolyline
                    positions={otherGeometry}
                    variant="alternative"
                  />
                )}
                {geometry.length > 1 && (
                  <RoutePolyline positions={geometry} variant="active" />
                )}
                {stops.map((stop, index) => (
                  <FermataMarker
                    key={stop.id}
                    position={[
                      stop.fermata_detail.latitude,
                      stop.fermata_detail.longitude,
                    ]}
                    name={stop.fermata_detail.name}
                    sequence={
                      direction === "outbound"
                        ? index + 1
                        : stops.length - index
                    }
                    showLabel={true}
                  />
                ))}
              </BaseMap>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">
                Stop Sequence ({stops.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[460px] space-y-1.5 overflow-y-auto p-4 pt-1">
              {stops.map((stop, index) => (
                <div
                  key={stop.id}
                  className="flex items-start gap-2 rounded-lg border border-border bg-card p-2.5 text-xs"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-bold text-primary-foreground">
                    {direction === "outbound" ? index + 1 : stops.length - index}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {stop.fermata_detail.name}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {stop.fermata_detail.latitude.toFixed(6)},{" "}
                      {stop.fermata_detail.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleteMutation.isPending) {
            setDeleteOpen(open);
            if (!open) setDeleteError(null);
          }
        }}
        title="Delete route"
        itemName={`Line #${route.public_bus_number} — ${route.name}`}
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

export default RouteDetail;
