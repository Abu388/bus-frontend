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
    <div className="flex h-full flex-col justify-between">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
          <BrandLogo size="md" />
          <div className="flex flex-col leading-tight">
            <span className="font-bold tracking-tight text-foreground text-sm">
              Staff Portal
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Admin Console
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto" aria-label="Main Navigation">
          {navigationItems.map((item: NavigationItem) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground/60 cursor-not-allowed select-none opacity-70"
                >
                  <div className="flex items-center gap-3">
                    <NavIcon name={item.icon} className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-dashed opacity-80">
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
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <NavIcon
                    name={item.icon}
                    className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge
                    variant={isActive ? "accent" : "secondary"}
                    className="text-[10px] px-1.5 py-0 h-4"
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
      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between rounded-lg bg-muted/60 p-2.5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {(user?.full_name || user?.username || "AD").slice(0, 2).toUpperCase()}
            </div>
            <div className="truncate text-left leading-tight">
              <p className="truncate text-xs font-semibold text-foreground">
                {user?.full_name || user?.username || "Administrator"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {user?.email || user?.phone || "Admin Account"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            title="Log out"
            aria-label="Log out"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-card hover:text-danger focus:outline-none focus:ring-1 focus:ring-ring"
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
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-card">
        {navContent}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-foreground/40 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-card shadow-2xl animate-in slide-in-from-left">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
