import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NavIcon } from "@/components/icons";

interface ComingSoonPageProps {
  title: string;
  description: string;
  iconName: string;
  endpointHint?: string;
}

export function ComingSoonPage({
  title,
  description,
  iconName,
  endpointHint,
}: ComingSoonPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6">
      <Card className="w-full max-w-2xl border-border bg-card shadow-sm text-center">
        <CardHeader className="flex flex-col items-center space-y-4 pt-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <NavIcon name={iconName} className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-center gap-2">
              <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
              <Badge variant="accent" className="text-xs">
                Coming Soon
              </Badge>
            </div>
            <CardDescription className="text-sm max-w-md mx-auto">
              {description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-6 sm:px-10 pb-6">
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-left">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Backend Integration Target
            </p>
            <p className="text-xs font-mono text-foreground break-all">
              {endpointHint || "API endpoints ready in Django OpenAPI schema"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            The underlying API contracts and types are generated from the Django REST OpenAPI schema. This view is scheduled for the next deployment milestone.
          </p>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border pt-6 pb-8 gap-3">
          <Link href="/dashboard">
            <Button variant="default" size="sm">
              Return to Dashboard
            </Button>
          </Link>
          <Link href="/dev/theme">
            <Button variant="outline" size="sm">
              View Theme Tokens
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
