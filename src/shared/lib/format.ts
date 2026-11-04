/**
 * Formatting helpers for Addis Ababa timezone and Ethiopian currency
 */

export const ADDIS_TIMEZONE = "Africa/Addis_Ababa";

/**
 * Format a timestamp into 12-hour time in the Africa/Addis_Ababa zone.
 * Example: "4:58 PM"
 */
export function formatTime(date: Date | string | number | null | undefined): string {
  if (!date) return "--:-- --";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "--:-- --";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: ADDIS_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export const formatTime12h = formatTime;

/**
 * Format a date in the Africa/Addis_Ababa zone.
 * Example: "Nov 2, 2026"
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "--";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "--";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: ADDIS_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  return new Intl.DateTimeFormat("en-US", { ...defaultOptions, ...options }).format(d);
}

/**
 * Format date and time in the Africa/Addis_Ababa zone.
 * Example: "Nov 2, 2026, 4:58 PM"
 */
export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return "--";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "--";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: ADDIS_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Format money with ETB suffix.
 * Handles integer and decimal values.
 * Example: 575 -> "575 ETB", 15.5 -> "15.50 ETB"
 */
export function formatMoney(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "0 ETB";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 ETB";

  const formatted = Number.isInteger(num)
    ? num.toLocaleString("en-US")
    : num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `${formatted} ETB`;
}

export const formatETB = formatMoney;

/**
 * Format speed in km/h
 */
export function formatSpeed(speedKmH: number | null | undefined): string {
  if (speedKmH === null || speedKmH === undefined || isNaN(speedKmH)) return "0 km/h";
  return `${Math.round(speedKmH)} km/h`;
}

/**
 * Format distance in km or meters
 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || isNaN(meters)) return "0 m";
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format elapsed time / position age: "Just now", "2m ago", etc.
 */
export function formatRelativeAge(timestamp: Date | string | number | null | undefined): string {
  if (!timestamp) return "Never";
  const d = typeof timestamp === "string" || typeof timestamp === "number" ? new Date(timestamp) : timestamp;
  if (isNaN(d.getTime())) return "Unknown";

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
