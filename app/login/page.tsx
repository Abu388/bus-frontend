"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getActiveBrand } from "@/brands";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";

  const brand = getActiveBrand();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isBlockedRole, setIsBlockedRole] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsBlockedRole(false);

    if (!identifier.trim() || !password) {
      setErrorMessage("Please enter both email/phone and password.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setIsBlockedRole(true);
          setErrorMessage(
            data.error ||
              "Access restricted: Staff and Passenger accounts must use the mobile app. Only administrators can log in to the web platform."
          );
        } else {
          setErrorMessage(data.error || "Invalid email/phone or password.");
        }
        return;
      }

      // Success -> navigate to target page
      router.push(from);
      router.refresh();
    } catch {
      setErrorMessage("Network error connecting to authentication service.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex flex-col items-center text-center space-y-2">
        <BrandLogo size="lg" className="mb-2" />
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {brand.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Central Staff & Fleet Administration Platform
        </p>
      </div>

      <Card className="border-border bg-card shadow-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg font-semibold">Sign in</CardTitle>
          <CardDescription>
            Enter your corporate email or registered phone number
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className={`rounded-lg border p-3 text-xs leading-relaxed ${
                  isBlockedRole
                    ? "border-warning bg-warning/10 text-warning"
                    : "border-danger bg-danger/10 text-danger"
                }`}
              >
                <p className="font-semibold mb-0.5">
                  {isBlockedRole ? "Mobile App Required" : "Authentication Failed"}
                </p>
                <p>{errorMessage}</p>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="identifier"
                className="block text-xs font-medium text-foreground uppercase tracking-wider"
              >
                Email or Phone
              </label>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                placeholder="admin@bus.et or +251911000001"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-foreground uppercase tracking-wider"
                >
                  Password
                </label>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full font-semibold"
              isLoading={isLoading}
            >
              Sign In to Platform
            </Button>

            <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Verified Test Accounts:</p>
              <p>• <span className="font-mono text-foreground">admin@bus.et</span> / <span className="font-mono text-foreground">+251911000001</span> (Admin)</p>
              <p>• <span className="font-mono text-foreground">cashier1@bus.et</span> (Cashier - blocked)</p>
              <p>• Password: <span className="font-mono text-foreground">Password123!</span></p>
            </div>
          </CardFooter>
        </form>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Protected by httpOnly cookie-based session verification
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 bg-background">
      <React.Suspense fallback={<div className="text-sm text-muted-foreground">Loading authentication...</div>}>
        <LoginForm />
      </React.Suspense>
    </div>
  );
}
