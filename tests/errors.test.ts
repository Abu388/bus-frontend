import { describe, it, expect } from "vitest";
import { normalizeError, AppError } from "@/shared/api/errors";

describe("HTTP client error normalization", () => {
  it("preserves existing AppError instances", () => {
    const original = new AppError({
      status: 400,
      code: "CUSTOM",
      message: "Custom error",
    });
    const normalized = normalizeError(original);
    expect(normalized).toBe(original);
  });

  it("extracts Django DRF { detail: string } errors", () => {
    const raw = { detail: "Authentication credentials were not provided." };
    const err = normalizeError(raw, 401);
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(401);
    expect(err.message).toBe("Authentication credentials were not provided.");
    expect(err.code).toBe("HTTP_401");
  });

  it("extracts Django field-level validation errors", () => {
    const raw = {
      targa: ["This field is required."],
      route: ["Invalid pk \"123\" - object does not exist."],
    };
    const err = normalizeError(raw, 400);
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.fieldErrors).toBeDefined();
    expect(err.fieldErrors?.targa).toEqual(["This field is required."]);
    expect(err.fieldErrors?.route).toEqual(["Invalid pk \"123\" - object does not exist."]);
  });

  it("handles string error messages", () => {
    const err = normalizeError("Server crashed", 503);
    expect(err.status).toBe(503);
    expect(err.message).toBe("Server crashed");
  });

  it("handles standard Error instances", () => {
    const err = normalizeError(new Error("Network timeout"), 408);
    expect(err.message).toBe("Network timeout");
  });
});
