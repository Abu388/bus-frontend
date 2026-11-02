/**
 * Formatting helpers for Addis Ababa timezone and Ethiopian currency
 */

const ADDIS_TIMEZONE = "Africa/Addis_Ababa";

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

  // If whole number, format without decimals, else with 2 decimals
  const formatted = Number.isInteger(num)
    ? num.toLocaleString("en-US")
    : num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `${formatted} ETB`;
}
