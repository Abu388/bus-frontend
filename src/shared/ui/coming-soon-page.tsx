"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { NavIcon } from "./icons";

interface ComingSoonPageProps {
  title: string;
  description: string;
  iconName: string;
  badge?: string;
  plannedFeatures?: string[];
  backendEndpoints?: string[];
}

export function ComingSoonPage({
  title,
  description,
  iconName,
  badge = "Feature In Progress",
  plannedFeatures = [],
  backendEndpoints = [],
}: ComingSoonPageProps) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <NavIcon name={iconName} className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div>
          <Badge variant="accent" className="font-semibold text-xs px-2.5 py-1">
            {badge}
          </Badge>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Under Development</CardTitle>
          <CardDescription>
            This administrative domain will be connected to live endpoints in Part B.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {plannedFeatures.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Planned Capabilities</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                {plannedFeatures.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {backendEndpoints.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Backend Endpoints (REST)</h3>
              <div className="flex flex-wrap gap-1.5">
                {backendEndpoints.map((ep, idx) => (
                  <code key={idx} className="rounded bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                    {ep}
                  </code>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t border-border bg-muted/20 flex justify-between">
          <span className="text-xs text-muted-foreground">Requires admin authorization</span>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              Back to Dashboard
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
