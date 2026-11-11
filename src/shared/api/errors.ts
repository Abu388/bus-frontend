export interface AppErrorPayload {
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  raw?: unknown;
}

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly fieldErrors?: Record<string, string[]>;
  public readonly raw?: unknown;

  constructor({ status, code, message, fieldErrors, raw }: AppErrorPayload) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.raw = raw;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Extracts the first human-readable message from any DRF error shape.
 * Django REST Framework can return top-level arrays for exception details
 * (for example `ValidationError("Cannot delete...")` becomes `["Cannot..."]`),
 * so we must descend through arrays and nested objects instead of assuming
 * every payload is an object.
 */
function extractFirstMessage(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = extractFirstMessage(item);
      if (message) return message;
    }
    return undefined;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["detail", "message", "error", "non_field_errors"]) {
      const message = extractFirstMessage(record[key]);
      if (message) return message;
    }
    for (const item of Object.values(record)) {
      const message = extractFirstMessage(item);
      if (message) return message;
    }
  }

  return undefined;
}

export function normalizeError(err: unknown, fallbackStatus = 500): AppError {
  if (err instanceof AppError) {
    return err;
  }

  // Django REST Framework serializes `ValidationError("message")` as a
  // top-level JSON array. Treat it as a normal validation failure so the
  // delete dialogs can display the protection reason instead of a generic
  // "unexpected error".
  if (Array.isArray(err)) {
    return new AppError({
      status: fallbackStatus,
      code: "VALIDATION_ERROR",
      message: extractFirstMessage(err) ?? "An unexpected error occurred.",
      raw: err,
    });
  }

  if (err && typeof err === "object") {
    const errorObj = err as Record<string, unknown>;
    const status =
      typeof errorObj.status === "number" && !isNaN(errorObj.status)
        ? errorObj.status
        : fallbackStatus;

    let message = "An unexpected error occurred.";
    let code = typeof errorObj.code === "string" ? errorObj.code : `HTTP_${status}`;
    let fieldErrors: Record<string, string[]> | undefined;

    // Direct error messages in detail, error, message, or non_field_errors.
    // Any of these may be an array (DRF coercion) or a nested object.
    for (const key of ["detail", "error", "message", "non_field_errors"]) {
      const candidate = extractFirstMessage(errorObj[key]);
      if (candidate) {
        message = candidate;
        break;
      }
    }

    // Inspect possible field-level validation errors (typical DRF format: { "field_name": ["This field is required."] })
    const gatheredFieldErrors: Record<string, string[]> = {};
    let hasFieldErrors = false;

    for (const [key, val] of Object.entries(errorObj)) {
      if (
        key === "detail" ||
        key === "code" ||
        key === "status" ||
        key === "error" ||
        key === "message" ||
        key === "name" ||
        key === "stack"
      ) {
        continue;
      }

      if (Array.isArray(val) && val.length > 0) {
        gatheredFieldErrors[key] = val.map(
          (v) => extractFirstMessage(v) ?? JSON.stringify(v)
        );
        hasFieldErrors = true;
      } else if (typeof val === "string" && val.trim()) {
        gatheredFieldErrors[key] = [val.trim()];
        hasFieldErrors = true;
      }
    }

    if (hasFieldErrors) {
      fieldErrors = gatheredFieldErrors;
      if (message === "An unexpected error occurred.") {
        const firstKey = Object.keys(gatheredFieldErrors)[0];
        message = `${firstKey}: ${gatheredFieldErrors[firstKey][0]}`;
        code = "VALIDATION_ERROR";
      }
    }

    return new AppError({
      status,
      code,
      message,
      fieldErrors,
      raw: err,
    });
  }

  if (typeof err === "string") {
    return new AppError({
      status: fallbackStatus,
      code: `HTTP_${fallbackStatus}`,
      message: err,
    });
  }

  if (err instanceof Error) {
    return new AppError({
      status: fallbackStatus,
      code: err.name || "ERROR",
      message: err.message || "An unexpected error occurred.",
      raw: err,
    });
  }

  return new AppError({
    status: fallbackStatus,
    code: "UNKNOWN_ERROR",
    message: "An unexpected error occurred.",
    raw: err,
  });
}
