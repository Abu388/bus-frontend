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

export function normalizeError(err: unknown, fallbackStatus = 500): AppError {
  if (err instanceof AppError) {
    return err;
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

    // Direct error messages in detail, error, message, or non_field_errors
    if (typeof errorObj.detail === "string" && errorObj.detail.trim()) {
      message = errorObj.detail.trim();
    } else if (typeof errorObj.error === "string" && errorObj.error.trim()) {
      message = errorObj.error.trim();
    } else if (typeof errorObj.message === "string" && errorObj.message.trim()) {
      message = errorObj.message.trim();
    } else if (Array.isArray(errorObj.non_field_errors) && errorObj.non_field_errors.length > 0) {
      message = String(errorObj.non_field_errors[0]);
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
        gatheredFieldErrors[key] = val.map((v) => (typeof v === "string" ? v : JSON.stringify(v)));
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
