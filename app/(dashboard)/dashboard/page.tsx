import * as React from "react";
import Link from "next/link";
import { getActiveBrand } from "@/brands";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { BusIcon, MapPinIcon, TripIcon, PaymentIcon } from "@/components/icons";

export default function DashboardPage() {
  const brand = getActiveBrand();

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Fleet Operations Center
              </h1>
              <Badge variant="accent" className="text-xs">
                {brand.shortName}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Welcome to the central monitoring and administration console for {brand.name}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/fleet/map">
              <Button variant="default" size="sm" className="gap-2">
                <MapPinIcon className="h-4 w-4" />
                <span>Live Fleet</span>
              </Button>
            </Link>
            <Link href="/dev/theme">
              <Button variant="outline" size="sm">
                Dev Theme
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Module Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Fleet</CardTitle>
            <BusIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2 Buses</div>
            <div className="flex items-center gap-2 mt-1">
              <StatusPill status="active" label="Route 124" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GPS Telemetry</CardTitle>
            <MapPinIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Live</div>
            <div className="flex items-center gap-2 mt-1">
              <StatusPill status="valid" label="Addis Ababa" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Standard Fare</CardTitle>
            <PaymentIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15 ETB</div>
            <p className="text-xs text-muted-foreground mt-1">Mexico - Megenagna</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <TripIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Operational</div>
            <div className="flex items-center gap-2 mt-1">
              <StatusPill status="valid" label="BFF Connected" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modules coming soon grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Management Modules</CardTitle>
          <CardDescription>
            Core navigation modules configured for this platform release
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {[
              { title: "Live Fleet Map", href: "/fleet/map", desc: "Real-time bus tracking on Mapbox/OSM" },
              { title: "Physical Buses", href: "/fleet/buses", desc: "Targa registry, status & maintenance" },
              { title: "Routes & Stops", href: "/routes", desc: "Ordered fermata sequences & polylines" },
              { title: "Fermatas", href: "/fermatas", desc: "Station coordinates & active stops" },
              { title: "Fare Matrix", href: "/fares", desc: "Configurable route fare schedules" },
              { title: "Daily Trips", href: "/trips", desc: "Trip lifecycle, QR code generation" },
              { title: "Payments & Revenue", href: "/payments", desc: "Chapa/Telebirr webhooks & reconciliation" },
              { title: "Fleet Maintenance", href: "/maintenance", desc: "Downtime records and resume workflows" },
              { title: "Audit Trail", href: "/audit", desc: "Immutable security & modification logs" },
            ].map((m) => (
              <Link
                key={m.title}
                href={m.href}
                className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary hover:bg-muted/40"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-foreground group-hover:text-primary">
                    {m.title}
                  </h4>
                  <Badge variant="secondary" className="text-[10px]">
                    Ready
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
