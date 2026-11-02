"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { navigationItems } from "@/config/navigation";
import { getActiveBrand } from "@/brands";
import { MenuIcon, LogoutIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const brand = getActiveBrand();

  const currentItem = navigationItems.find(
    (item) =>
      item.href === pathname ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href))
  );

  const pageTitle = currentItem?.label || "Admin Console";

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring lg:hidden"
          aria-label="Open sidebar"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        {/* Page breadcrumb */}
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">Platform /</span>
          <h1 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2.5">
        {/* Active Brand indicator */}
        <Badge variant="outline" className="text-xs font-medium border-border">
          <span className="h-1.5 w-1.5 rounded-full bg-primary mr-1.5 inline-block" />
          {brand.shortName}
        </Badge>

        {/* Theme test shortcut */}
        <Link href="/dev/theme">
          <Button variant="ghost" size="sm" className="text-xs">
            Theme Kit
          </Button>
        </Link>

        {/* Logout on topbar */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="hidden sm:inline-flex text-xs gap-1.5"
        >
          <LogoutIcon className="h-3.5 w-3.5" />
          <span>Logout</span>
        </Button>
      </div>
    </header>
  );
}
