"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems, NavigationItem } from "@/shared/config/navigation";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { Badge } from "@/shared/ui/badge";
import { NavIcon, LogoutIcon } from "@/shared/ui/icons";
import { cn } from "@/shared/lib/utils";
import { useAuth, useLogout } from "@/features/auth";

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-sidebar text-sidebar-foreground">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-sidebar-border px-5">
          <BrandLogo size="md" onDark />
          <span className="rounded border border-sidebar-border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sidebar-muted">
            Admin
          </span>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main Navigation">
          {navigationItems.map((item: NavigationItem) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/users" && (pathname.startsWith("/cashers") || pathname.startsWith("/fleet/cashers"))) ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className="flex cursor-not-allowed select-none items-center justify-between rounded-md border-l-4 border-transparent px-3 py-2 text-xs font-medium text-sidebar-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <NavIcon name={item.icon} className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <Badge
                      variant="outline"
                      className="h-4 border-dashed border-sidebar-border px-1.5 py-0 text-[10px] text-sidebar-muted"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex items-center justify-between rounded-md border-l-4 px-2.5 py-2 text-xs font-medium transition-all duration-200",
                  isActive
                    ? "border-accent-strong bg-sidebar-active text-sidebar-active-foreground font-bold shadow-[0_8px_20px_-10px_var(--primary)] ring-1 ring-inset ring-accent-strong/35"
                    : "border-transparent text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground"
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                      isActive
                        ? "bg-accent-strong text-accent-foreground shadow-sm"
                        : "text-sidebar-muted group-hover:bg-white/5 group-hover:text-sidebar-foreground"
                    )}
                  >
                    <NavIcon name={item.icon} className="h-4 w-4" />
                  </span>
                  <span className={cn("truncate", isActive && "tracking-wide")}>
                    {item.label}
                  </span>
                </div>
                {item.badge && (
                  <Badge
                    variant={isActive ? "accent" : "secondary"}
                    className={cn(
                      "h-4 shrink-0 px-1.5 py-0 text-[10px]",
                      isActive
                        ? ""
                        : "border border-sidebar-border bg-white/5 text-sidebar-muted"
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User and Logout section */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-between rounded-md bg-white/5 p-2.5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-strong text-xs font-bold text-accent-foreground">
              {(user?.full_name || user?.username || "AD").slice(0, 2).toUpperCase()}
            </div>
            <div className="truncate text-left leading-tight">
              <p className="truncate text-xs font-semibold text-sidebar-foreground">
                {user?.full_name || user?.username || "Administrator"}
              </p>
              <p className="truncate text-[10px] text-sidebar-muted">
                {user?.email || user?.phone || "Admin Account"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            title="Log out"
            aria-label="Log out"
            className="rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-white/10 hover:text-danger focus:outline-none focus:ring-1 focus:ring-accent-strong"
          >
            <LogoutIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar">
        {navContent}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-sidebar/70 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 border-r border-sidebar-border bg-sidebar shadow-2xl animate-in slide-in-from-left">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
