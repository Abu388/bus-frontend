"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/shared/config/navigation";
import { getActiveBrand } from "@/brands";
import { MenuIcon, LogoutIcon } from "@/shared/ui/icons";
import { Button } from "@/shared/ui/button";
import { useLogout } from "@/features/auth";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const brand = getActiveBrand();
  const logoutMutation = useLogout();

  const currentItem = navigationItems.find(
    (item) =>
      item.href === pathname ||
      (item.href === "/users" && (pathname.startsWith("/cashers") || pathname.startsWith("/fleet/cashers"))) ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href))
  );

  const pageTitle = currentItem?.label || "Admin Console";

  return (
    <header className="sticky top-1 z-20 flex h-16 w-full items-center justify-between border-b border-sidebar-border bg-sidebar/95 px-4 text-sidebar-foreground backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-sidebar-muted transition-colors hover:bg-white/10 hover:text-sidebar-foreground focus:outline-none focus:ring-2 focus:ring-accent-strong lg:hidden"
          aria-label="Open sidebar"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        {/* Page breadcrumb */}
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-sidebar-muted sm:inline">
            Platform /
          </span>
          <h1 className="text-sm font-semibold tracking-tight text-sidebar-foreground sm:text-base">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2.5">
        {/* Active Brand indicator */}
        <span className="hidden items-center gap-1.5 rounded-full border border-sidebar-border bg-white/5 px-2.5 py-1 text-xs font-medium text-sidebar-muted sm:inline-flex">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-strong" />
          {brand.shortName}
        </span>

        {/* Theme test shortcut */}
        <Link href="/dev/theme">
          <Button variant="outline" size="sm" className="text-xs">
            Theme Kit
          </Button>
        </Link>

        {/* Logout on topbar */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="hidden text-xs gap-1.5 sm:inline-flex"
        >
          <LogoutIcon className="h-3.5 w-3.5" />
          <span>Logout</span>
        </Button>
      </div>
    </header>
  );
}
