import * as React from "react";
import { getActiveBrand } from "@/brands";
import { cn } from "@/shared/lib/utils";

export interface BrandLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  brandId?: string;
}

export function BrandLogo({
  size = "md",
  showWordmark = true,
  brandId,
  className,
  ...props
}: BrandLogoProps) {
  const brand = getActiveBrand(brandId);

  const iconSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  }[size];

  const textSizes = {
    sm: "text-sm",
    md: "text-base font-bold",
    lg: "text-xl font-extrabold",
  }[size];

  return (
    <div
      className={cn("flex items-center gap-2.5 text-foreground select-none", className)}
      {...props}
    >
      {/* Simple inline bus icon */}
      <div className={cn("flex items-center justify-center rounded-lg bg-primary text-primary-foreground p-1.5 shadow-sm", iconSizes)}>
        <svg
          className="h-full w-full"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Bus body */}
          <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
          {/* Windshield */}
          <path d="M4 10h16" />
          {/* Divider */}
          <path d="M12 4v6" />
          {/* Headlights */}
          <circle cx="7" cy="14" r="1" fill="currentColor" />
          <circle cx="17" cy="14" r="1" fill="currentColor" />
          {/* Wheels */}
          <path d="M6 18v2" />
          <path d="M18 18v2" />
        </svg>
      </div>

      {/* Brand wordmark */}
      {showWordmark && (
        <div className="flex flex-col leading-tight">
          <span className={cn("tracking-tight font-semibold text-foreground", textSizes)}>
            {brand.shortName}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Staff Portal
          </span>
        </div>
      )}
    </div>
  );
}
