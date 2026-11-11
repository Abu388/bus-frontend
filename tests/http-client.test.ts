import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/shared/api/client";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("HTTP client delete handling", () => {
  it("returns undefined for a 204 No Content response instead of parsing JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    global.fetch = fetchMock as typeof fetch;

    await expect(httpClient.delete("/routes/abc/")).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/proxy/routes/abc");
  });

  it("returns undefined for an empty 200 response with content-length 0", async () => {
    const response = new Response(null, {
      status: 200,
      headers: { "content-length": "0" },
    });
    global.fetch = vi.fn().mockResolvedValue(response) as typeof fetch;

    await expect(httpClient.delete("/fermatas/xyz/")).resolves.toBeUndefined();
  });

  it("still raises normalized errors for failed deletes", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          "Cannot delete this fermata because it is currently used as a stop on a route.",
        ]),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      )
    ) as typeof fetch;

    await expect(httpClient.delete("/fermatas/xyz/")).rejects.toMatchObject({
      status: 400,
      message:
        "Cannot delete this fermata because it is currently used as a stop on a route.",
    });
  });
});
