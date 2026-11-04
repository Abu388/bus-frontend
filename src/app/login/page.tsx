"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getActiveBrand } from "@/brands";
import { BrandLogo, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Input, Button } from "@/shared/ui";
import { LoginSchema, type LoginFormData } from "@/features/auth/schemas";
import { useLogin } from "@/features/auth/hooks";

function LoginForm() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";

  const brand = getActiveBrand();
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const isBlockedRole = loginMutation.error?.status === 403;

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
            Enter your administrator credentials to access the portal
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {loginMutation.error && (
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
                <p>{loginMutation.error.message}</p>
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
                type="text"
                placeholder="Enter email, phone, or username"
                autoComplete="username"
                disabled={loginMutation.isPending}
                {...register("identifier")}
              />
              {errors.identifier && (
                <p className="text-xs text-danger">{errors.identifier.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-foreground uppercase tracking-wider"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loginMutation.isPending}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-danger">{errors.password.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full font-semibold"
              isLoading={loginMutation.isPending}
            >
              Sign In to Platform
            </Button>
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
