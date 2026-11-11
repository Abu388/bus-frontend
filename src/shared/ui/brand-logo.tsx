import * as React from "react";
import { getActiveBrand } from "@/brands";
import { cn } from "@/shared/lib/utils";

export interface BrandLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  brandId?: string;
  onDark?: boolean;
}

export function BrandLogo({
  size = "md",
  showWordmark = true,
  brandId,
  onDark = false,
  className,
  ...props
}: BrandLogoProps) {
  const brand = getActiveBrand(brandId);

  const iconSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-11 w-11",
  }[size];

  const textSizes = {
    sm: "text-sm",
    md: "text-base font-bold",
    lg: "text-xl font-extrabold",
  }[size];

  return (
    <div
      className={cn("flex items-center gap-2.5 select-none", className)}
      {...props}
    >
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-sm ring-1 ring-accent-strong/70",
          iconSizes
        )}
      >
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-accent-strong"
        />
        <svg
          className="relative h-3/4 w-3/4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
          <path d="M4 10h16" />
          <path d="M12 4v6" />
          <circle cx="7" cy="14" r="1" fill="currentColor" />
          <circle cx="17" cy="14" r="1" fill="currentColor" />
          <path d="M6 18v2" />
          <path d="M18 18v2" />
        </svg>
      </div>

      {showWordmark && (
        <div className="flex flex-col leading-tight">
          <span
            className={cn(
              "tracking-tight font-semibold",
              onDark ? "text-sidebar-foreground" : "text-foreground",
              textSizes
            )}
          >
            {brand.shortName}
          </span>
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider font-medium",
              onDark ? "text-sidebar-muted" : "text-muted-foreground"
            )}
          >
            Staff Portal
          </span>
        </div>
      )}
    </div>
  );
}
