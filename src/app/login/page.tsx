"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getActiveBrand } from "@/brands";
import { BrandLogo, Input, Button } from "@/shared/ui";
import { LoginSchema, type LoginFormData } from "@/features/auth/schemas";
import { useLogin } from "@/features/auth/hooks";

function LoginForm() {
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
    <div className="livery-card w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand hero */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-strong/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative space-y-8">
          <BrandLogo size="lg" onDark />
          <div className="space-y-4">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.35em] text-accent-strong">
              Addis Ababa · Fleet Command
            </p>
            <h1 className="max-w-sm text-4xl font-extrabold leading-tight tracking-tight text-sidebar-foreground">
              Move the city,
              <span className="block text-accent-strong">one route at a time.</span>
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-sidebar-muted">
              Live fleet tracking, route sequencing, fare control, and
              operational reporting for Ethiopia&apos;s public bus network.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="plate-badge !border-sidebar-border !bg-white/5 !text-sidebar-foreground !text-[11px]">
              3-AA-12401
            </span>
            <span className="bus-number-badge px-2 py-0.5 text-sm">
              LINE 124
            </span>
            <span className="rounded-md border border-sidebar-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-sidebar-muted">
              Mexico ↔ Megenagna
            </span>
          </div>
        </div>

        <div className="relative flex items-center justify-between border-t border-sidebar-border pt-5 text-[10px] uppercase tracking-wider text-sidebar-muted">
          <span>Anbessa City Bus</span>
          <span>Staff access only</span>
        </div>
      </div>

      {/* Sign-in form */}
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="mb-7 flex items-center justify-between gap-4 lg:hidden">
          <BrandLogo size="md" />
          <span className="rounded border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Staff
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Administrator sign in
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            {brand.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            Enter your staff credentials to open the fleet console.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5">
          {loginMutation.error && (
            <div
              role="alert"
              className={`rounded-lg border p-3 text-xs leading-relaxed ${
                isBlockedRole
                  ? "border-warning/40 bg-warning/10 text-foreground"
                  : "border-danger/40 bg-danger/10 text-danger"
              }`}
            >
              <p className="mb-0.5 font-semibold">
                {isBlockedRole ? "Mobile App Required" : "Authentication Failed"}
              </p>
              <p>{loginMutation.error.message}</p>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="identifier"
              className="block text-xs font-semibold uppercase tracking-wider text-foreground"
            >
              Email or phone
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
              className="block text-xs font-semibold uppercase tracking-wider text-foreground"
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

          <Button
            type="submit"
            variant="default"
            size="lg"
            className="w-full"
            isLoading={loginMutation.isPending}
          >
            Sign in to platform
          </Button>

          <div className="flex items-center gap-3 pt-1">
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Secure session
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            Protected by httpOnly cookie-based session verification.
            <br />
            Contact your fleet administrator if you need access.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <LoginForm />
    </div>
  );
}
