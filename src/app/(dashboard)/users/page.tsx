"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Button,
  Badge,
  Input,
  Skeleton,
  StatusPill,
} from "@/shared/ui";
import { UserPlusIcon, UserIcon, RefreshIcon, BusIcon } from "@/shared/ui/icons";
import { useCashers, CreateCasherModal } from "@/features/users";
import { useBuses, type PhysicalBus } from "@/features/buses";

export default function UsersPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "assigned" | "unassigned">("all");

  const cashersQuery = useCashers();
  const busesQuery = useBuses();

  const cashers = React.useMemo(() => cashersQuery.data ?? [], [cashersQuery.data]);
  const buses = React.useMemo(() => busesQuery.data ?? [], [busesQuery.data]);

  // Build map: casherId -> bus
  const casherToBusMap = React.useMemo(() => {
    const map = new Map<string, PhysicalBus>();
    for (const b of buses) {
      if (b.casher) {
        map.set(b.casher, b);
      }
    }
    return map;
  }, [buses]);

  // Filter cashers based on search query and status filter
  const filteredCashers = React.useMemo(() => {
    return cashers.filter((casher) => {
      const isAssigned = casherToBusMap.has(casher.id);
      if (statusFilter === "assigned" && !isAssigned) return false;
      if (statusFilter === "unassigned" && isAssigned) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = casher.full_name?.toLowerCase().includes(q);
      const emailMatch = casher.email?.toLowerCase().includes(q);
      const usernameMatch = casher.username?.toLowerCase().includes(q);
      const phoneMatch = casher.phone?.toLowerCase().includes(q);
      const busMatch = casherToBusMap.get(casher.id)?.targa?.toLowerCase().includes(q);

      return nameMatch || emailMatch || usernameMatch || phoneMatch || busMatch;
    });
  }, [cashers, casherToBusMap, searchQuery, statusFilter]);

  const assignedCount = React.useMemo(() => {
    return cashers.filter((c) => casherToBusMap.has(c.id)).length;
  }, [cashers, casherToBusMap]);

  const unassignedCount = cashers.length - assignedCount;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserIcon className="h-5 w-5" />
            </span>
            Users & Cashiers
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage operational cashier personnel, track bus assignments, and register new staff accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 shadow-sm font-semibold"
          >
            <UserPlusIcon className="h-4 w-4" />
            + Create Casher
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Cashiers
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {cashersQuery.isLoading ? <Skeleton className="h-8 w-16" /> : cashers.length}
              </h3>
            </div>
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <UserIcon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Assigned to Buses
              </p>
              <h3 className="text-2xl font-bold text-success mt-1">
                {cashersQuery.isLoading || busesQuery.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  assignedCount
                )}
              </h3>
            </div>
            <div className="rounded-xl bg-success/10 p-3 text-success">
              <BusIcon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Available / Standby
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {cashersQuery.isLoading || busesQuery.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  unassignedCount
                )}
              </h3>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-muted-foreground">
              <UserPlusIcon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cashers Table Card */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Registered Cashiers Directory
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Cashiers can be assigned to transit buses for fare collection and trip validation.
            </CardDescription>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search by name, email, bus..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "assigned" | "unassigned")}
              className="h-8 rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Status</option>
              <option value="assigned">Assigned Only</option>
              <option value="unassigned">Standby (Unassigned)</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                cashersQuery.refetch();
                busesQuery.refetch();
              }}
              disabled={cashersQuery.isFetching || busesQuery.isFetching}
              className="h-8 px-2.5"
              title="Refresh users and bus assignments"
            >
              <RefreshIcon className={`h-3.5 w-3.5 ${cashersQuery.isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {cashersQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredCashers.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="rounded-full bg-muted/30 p-3 text-muted-foreground mb-3">
                <UserIcon className="h-8 w-8" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">No cashiers found</h4>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "No cashiers match your filter criteria. Try clearing filters or search terms."
                  : "No cashier accounts have been registered yet. Add a new cashier to start assigning them to buses."}
              </p>
              <Button
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <UserPlusIcon className="h-4 w-4" />
                + Create Casher
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">Staff Member</TableHead>
                  <TableHead>Contact Information</TableHead>
                  <TableHead>Account Role</TableHead>
                  <TableHead>Assigned Vehicle</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCashers.map((casher) => {
                  const assignedBus = casherToBusMap.get(casher.id);
                  const initials = (casher.full_name || casher.username)
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <TableRow key={casher.id} className="hover:bg-muted/5">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {initials || "U"}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-xs">
                              {casher.full_name || casher.username}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              @{casher.username}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs text-foreground font-mono">
                          {casher.email}
                        </div>
                        {casher.phone && (
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {casher.phone}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="capitalize text-[11px] bg-primary/10 text-primary border-primary/20"
                        >
                          {casher.role || "casher"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {assignedBus ? (
                          <div className="flex items-center gap-2">
                            <span className="plate-badge text-[11px]">
                              {assignedBus.targa}
                            </span>
                            {assignedBus.route_number && (
                              <span className="text-[11px] text-muted-foreground">
                                Line {assignedBus.route_number}
                              </span>
                            )}
                          </div>
                        ) : (
                          <StatusPill status="inactive" label="Unassigned" />
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Link
                          href={`/fleet/buses?highlight=${assignedBus?.id || ""}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                        >
                          {assignedBus ? "Manage Bus" : "Assign to Bus"} →
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog */}
      <CreateCasherModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => {
          cashersQuery.refetch();
        }}
      />
    </div>
  );
}
