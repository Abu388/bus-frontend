import { describe, it, expect, vi, afterEach } from "vitest";
import { httpClient } from "@/shared/api/client";
import { faresApi } from "@/features/fares/api";
import { CreateFareSchema } from "@/features/fares/schemas";

const ROUTE_ID = "5cb2cc12-a267-4a00-91d0-03342fbed658";

describe("Fare create payload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("coerces a numeric amount from form input", () => {
    const parsed = CreateFareSchema.parse({ route: ROUTE_ID, amount: "20.5" });
    expect(parsed.amount).toBe(20.5);
  });

  it("posts a decimal amount and effective_from to the root fares endpoint", async () => {
    const postSpy = vi
      .spyOn(httpClient, "post")
      .mockResolvedValue({ id: "fare-1", amount: "20.50" });

    await faresApi.createFare({ route: ROUTE_ID, amount: 20.5 });

    expect(postSpy).toHaveBeenCalledTimes(1);
    const [path, body] = postSpy.mock.calls[0];
    expect(path).toBe("/api/proxy");
    expect(body).toMatchObject({ route: ROUTE_ID, amount: "20.50" });
    expect(typeof (body as { effective_from: string }).effective_from).toBe("string");
    expect(
      Number.isNaN(Date.parse((body as { effective_from: string }).effective_from))
    ).toBe(false);
  });
});
