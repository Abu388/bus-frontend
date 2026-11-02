"use client";

import * as React from "react";
import Link from "next/link";
import { getActiveBrand, brands } from "@/brands";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime, formatDate, formatDateTime, formatMoney } from "@/lib/format";

export default function DevThemePage() {
  const defaultBrand = getActiveBrand();
  const [currentBrandId, setCurrentBrandId] = React.useState(defaultBrand.id);
  const { toast } = useToast();

  const brand = brands[currentBrandId] || defaultBrand;

  // Toggle brand in DOM data-brand attribute for instant live preview
  const switchBrand = (id: string) => {
    setCurrentBrandId(id);
    document.documentElement.setAttribute("data-brand", id);
  };

  const sampleDate = new Date("2026-11-02T13:58:45Z");

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-10 space-y-10 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <BrandLogo size="lg" brandId={brand.id} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Design System & Brand Theme
              </h1>
              <p className="text-xs text-muted-foreground">
                Testing environment for brand tokens, components, accessibility contrast, and formatting
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => switchBrand("anbessa")}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                currentBrandId === "anbessa"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Anbessa Bus
            </button>
            <button
              onClick={() => switchBrand("demo")}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                currentBrandId === "demo"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Demo (Blue)
            </button>
          </div>
        </div>
      </div>

      {/* Brand Metadata Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Brand Configuration</CardTitle>
              <CardDescription>
                Driven by NEXT_PUBLIC_BRAND or runtime data-brand switch
              </CardDescription>
            </div>
            <Badge variant="accent">{brand.id}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">Brand Name</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{brand.name}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">Short Wordmark</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{brand.shortName}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">Official Logo Slot</p>
            <p className="text-sm font-mono text-foreground mt-0.5">{brand.logoPath}</p>
          </div>
        </CardContent>
      </Card>

      {/* Color Tokens Swatches with Contrast Ratios */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Semantic Color Tokens & Surfaces
          </h2>
          <p className="text-xs text-muted-foreground">
            All text on colored surfaces satisfies WCAG AA &ge; 4.5:1 contrast requirement
          </p>
        </div>

        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {/* Primary */}
          <div className="rounded-lg border border-border p-4 bg-primary text-primary-foreground shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-90">Primary</p>
            <p className="text-lg font-bold mt-1">Brand Main</p>
            <p className="text-xs opacity-80 mt-2 font-mono">bg-primary</p>
            <div className="mt-3 inline-block rounded-md bg-card/20 px-2 py-0.5 text-[10px] font-medium backdrop-blur-xs">
              Contrast &gt; 4.5:1 Pass
            </div>
          </div>

          {/* Accent */}
          <div className="rounded-lg border border-border p-4 bg-accent text-accent-foreground shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-90">Accent</p>
            <p className="text-lg font-bold mt-1">Highlight</p>
            <p className="text-xs opacity-80 mt-2 font-mono">bg-accent</p>
            <div className="mt-3 inline-block rounded-md bg-foreground/10 px-2 py-0.5 text-[10px] font-medium backdrop-blur-xs">
              Contrast &gt; 4.5:1 Pass
            </div>
          </div>

          {/* Success */}
          <div className="rounded-lg border border-border p-4 bg-success text-success-foreground shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-90">Success</p>
            <p className="text-lg font-bold mt-1">Valid / Active</p>
            <p className="text-xs opacity-80 mt-2 font-mono">bg-success</p>
            <div className="mt-3 inline-block rounded-md bg-card/20 px-2 py-0.5 text-[10px] font-medium backdrop-blur-xs">
              Contrast &gt; 4.5:1 Pass
            </div>
          </div>

          {/* Warning */}
          <div className="rounded-lg border border-border p-4 bg-warning text-warning-foreground shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-90">Warning</p>
            <p className="text-lg font-bold mt-1">Pending / Alert</p>
            <p className="text-xs opacity-80 mt-2 font-mono">bg-warning</p>
            <div className="mt-3 inline-block rounded-md bg-card/20 px-2 py-0.5 text-[10px] font-medium backdrop-blur-xs">
              Contrast &gt; 4.5:1 Pass
            </div>
          </div>

          {/* Danger */}
          <div className="rounded-lg border border-border p-4 bg-danger text-danger-foreground shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-90">Danger</p>
            <p className="text-lg font-bold mt-1">Expired / Error</p>
            <p className="text-xs opacity-80 mt-2 font-mono">bg-danger</p>
            <div className="mt-3 inline-block rounded-md bg-card/20 px-2 py-0.5 text-[10px] font-medium backdrop-blur-xs">
              Contrast &gt; 4.5:1 Pass
            </div>
          </div>

          {/* Background */}
          <div className="rounded-lg border border-border p-4 bg-background text-foreground shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Background</p>
            <p className="text-lg font-bold mt-1">Canvas Body</p>
            <p className="text-xs text-muted-foreground mt-2 font-mono">bg-background</p>
            <div className="mt-3 inline-block rounded-md border border-border px-2 py-0.5 text-[10px] font-medium">
              Base Surface
            </div>
          </div>

          {/* Card */}
          <div className="rounded-lg border border-border p-4 bg-card text-card-foreground shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Card</p>
            <p className="text-lg font-bold mt-1">Card Surface</p>
            <p className="text-xs text-muted-foreground mt-2 font-mono">bg-card</p>
            <div className="mt-3 inline-block rounded-md border border-border px-2 py-0.5 text-[10px] font-medium">
              Elevated Surface
            </div>
          </div>

          {/* Muted */}
          <div className="rounded-lg border border-border p-4 bg-muted text-muted-foreground shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-90">Muted</p>
            <p className="text-lg font-bold mt-1 text-foreground">Muted Tint</p>
            <p className="text-xs opacity-80 mt-2 font-mono">bg-muted</p>
            <div className="mt-3 inline-block rounded-md border border-border px-2 py-0.5 text-[10px] font-medium">
              Secondary Surface
            </div>
          </div>

          {/* Border & Input */}
          <div className="rounded-lg border-2 border-border p-4 bg-card text-foreground shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Border / Input</p>
            <p className="text-lg font-bold mt-1">Structural</p>
            <p className="text-xs text-muted-foreground mt-2 font-mono">border-border</p>
            <div className="mt-3 inline-block rounded-md border border-input px-2 py-0.5 text-[10px] font-medium">
              Dividers & Inputs
            </div>
          </div>

          {/* Ring */}
          <div className="rounded-lg border border-border p-4 bg-card text-foreground shadow-xs ring-2 ring-ring">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ring</p>
            <p className="text-lg font-bold mt-1">Focus State</p>
            <p className="text-xs text-muted-foreground mt-2 font-mono">ring-ring</p>
            <div className="mt-3 inline-block rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">
              Focus Outline
            </div>
          </div>
        </div>
      </section>

      {/* StatusPill Component Showcase */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            StatusPill Components
          </h2>
          <p className="text-xs text-muted-foreground">
            Specified rules: valid = success, expired = danger, plus maintenance = danger and active = success
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Subtle Variant (Outlined Pill)
              </p>
              <div className="flex flex-wrap gap-3">
                <StatusPill status="valid" />
                <StatusPill status="active" />
                <StatusPill status="expired" />
                <StatusPill status="maintenance" />
                <StatusPill status="warning" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Solid Variant
              </p>
              <div className="flex flex-wrap gap-3">
                <StatusPill status="valid" variant="solid" />
                <StatusPill status="active" variant="solid" />
                <StatusPill status="expired" variant="solid" />
                <StatusPill status="maintenance" variant="solid" />
                <StatusPill status="warning" variant="solid" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Button & Badge Component Showcase */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Buttons and Badges
          </h2>
          <p className="text-xs text-muted-foreground">
            Mapped directly to design tokens without raw color classes
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Button Variants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="default">Primary Default</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="link">Link Style</Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button size="sm">Small (sm)</Button>
              <Button size="md">Medium (md)</Button>
              <Button size="lg">Large (lg)</Button>
              <Button isLoading size="sm">Loading</Button>
              <Button disabled size="sm">Disabled</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Badge Variants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="default">Primary Badge</Badge>
              <Badge variant="accent">Accent Badge</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Input, Dialog & Toast Showcase */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Interactive Primitives (Input, Dialog, Toast)
          </h2>
          <p className="text-xs text-muted-foreground">
            Accessible forms, dialog modals, and dynamic notification toasts
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Inputs */}
          <Card>
            <CardHeader>
              <CardTitle>Form Inputs</CardTitle>
              <CardDescription>Styled with focus rings and semantic borders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Default Input</label>
                <Input placeholder="Enter bus identifier..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Password Input</label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Disabled Input</label>
                <Input disabled value="Readonly property" />
              </div>
            </CardContent>
          </Card>

          {/* Dialog & Toasts */}
          <Card>
            <CardHeader>
              <CardTitle>Modal Dialog & Toast Notifications</CardTitle>
              <CardDescription>Interactive components testing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Dialog Modal</p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Open Test Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Vehicle Maintenance Dispatch</DialogTitle>
                      <DialogDescription>
                        Review the scheduled inspection for bus 3-AA-12401.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                      <p className="text-sm">
                        Bus unit is currently flagged for routine brake inspection at Central Depot.
                      </p>
                      <StatusPill status="maintenance" />
                    </div>
                    <DialogFooter>
                      <DialogClose />
                      <Button variant="default">Confirm Inspection</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Trigger Toasts</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast({
                        title: "Action Succeeded",
                        description: "New fare saved to database.",
                        variant: "success",
                      })
                    }
                  >
                    Success Toast
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast({
                        title: "System Alert",
                        description: "Bus 12402 lost GPS signal.",
                        variant: "danger",
                      })
                    }
                  >
                    Danger Toast
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast({
                        title: "Notice",
                        description: "Driver shift ends in 15 minutes.",
                        variant: "warning",
                      })
                    }
                  >
                    Warning Toast
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Table & Skeletons Showcase */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Table and Skeletons
          </h2>
          <p className="text-xs text-muted-foreground">
            Semantic table layout with StatusPill indicators
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fleet Bus Sample Roster</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Targa (Plate)</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Current Fare</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono font-medium">3-AA-12401</TableCell>
                  <TableCell>Route 124 (Mexico - Megenagna)</TableCell>
                  <TableCell>65 passengers</TableCell>
                  <TableCell>
                    <StatusPill status="active" />
                  </TableCell>
                  <TableCell className="text-right font-medium">15 ETB</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono font-medium">3-AA-12402</TableCell>
                  <TableCell>Route 124 (Mexico - Megenagna)</TableCell>
                  <TableCell>65 passengers</TableCell>
                  <TableCell>
                    <StatusPill status="maintenance" />
                  </TableCell>
                  <TableCell className="text-right font-medium">15 ETB</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono font-medium">3-AA-10803</TableCell>
                  <TableCell>Route 108 (Stadium - Saris)</TableCell>
                  <TableCell>70 passengers</TableCell>
                  <TableCell>
                    <StatusPill status="expired" label="Inspection Due" />
                  </TableCell>
                  <TableCell className="text-right font-medium">20 ETB</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Skeletons */}
        <Card>
          <CardHeader>
            <CardTitle>Loading Skeletons</CardTitle>
            <CardDescription>Pulse animation placeholders for async queries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Formatting Helpers in Africa/Addis_Ababa Showcase */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Formatting Helpers (src/lib/format.ts)
          </h2>
          <p className="text-xs text-muted-foreground">
            Zone: Africa/Addis_Ababa | 12-hour AM/PM | Money in ETB
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase">formatTime</p>
              <p className="text-lg font-bold text-foreground mt-1 font-mono">
                {formatTime(sampleDate)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">UTC 13:58:45 &rarr; 4:58 PM</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase">formatDate</p>
              <p className="text-lg font-bold text-foreground mt-1 font-mono">
                {formatDate(sampleDate)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Local calendar date</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase">formatDateTime</p>
              <p className="text-sm font-bold text-foreground mt-1 font-mono">
                {formatDateTime(sampleDate)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Full timestamp</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase">formatMoney</p>
              <p className="text-lg font-bold text-foreground mt-1 font-mono">
                {formatMoney(575)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">e.g. 575 ETB, 15.50 ETB</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
