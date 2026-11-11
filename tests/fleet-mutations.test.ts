import { describe, it, expect, vi } from "vitest";
import {
  invalidateFleetRelatedQueries,
  useCreateMaintenance,
  useSendToMaintenance,
  useCreateBus,
  useUpdateBus,
} from "@/features/fleet";

describe("Fleet Mutations Query Invalidation (Requirement 2)", () => {
  it("exports useCreateMaintenance as alias of useSendToMaintenance", () => {
    expect(useCreateMaintenance).toBe(useSendToMaintenance);
    expect(typeof useCreateBus).toBe("function");
    expect(typeof useUpdateBus).toBe("function");
  });

  it("invalidates trips, tracking, live-buses, dashboard, and reports caches", () => {
    const invalidateQueriesMock = vi.fn();
    const queryClientMock = {
      invalidateQueries: invalidateQueriesMock,
    };

    invalidateFleetRelatedQueries(queryClientMock, "bus-uuid-123");

    const calledKeys = invalidateQueriesMock.mock.calls.map((call) => call[0].queryKey);

    // Verify fleet and bus keys
    expect(calledKeys).toContainEqual(["buses", "list"]);
    expect(calledKeys).toContainEqual(["buses", "detail", "bus-uuid-123"]);
    expect(calledKeys).toContainEqual(["buses", "maintenance", { busId: "bus-uuid-123" }]);
    expect(calledKeys).toContainEqual(["buses", "maintenance"]);

    // Verify auto-invalidation for live-map, trips, dashboard
    expect(calledKeys).toContainEqual(["trips"]);
    expect(calledKeys).toContainEqual(["tracking"]);
    expect(calledKeys).toContainEqual(["live-buses"]);
    expect(calledKeys).toContainEqual(["dashboard"]);
    expect(calledKeys).toContainEqual(["reports"]);
  });

  it("handles invalidation without busId gracefully", () => {
    const invalidateQueriesMock = vi.fn();
    const queryClientMock = {
      invalidateQueries: invalidateQueriesMock,
    };

    invalidateFleetRelatedQueries(queryClientMock);

    const calledKeys = invalidateQueriesMock.mock.calls.map((call) => call[0].queryKey);
    expect(calledKeys).toContainEqual(["trips"]);
    expect(calledKeys).toContainEqual(["tracking"]);
    expect(calledKeys).toContainEqual(["live-buses"]);
    expect(calledKeys).toContainEqual(["dashboard"]);
    expect(calledKeys).toContainEqual(["reports"]);
    expect(calledKeys).toContainEqual(["buses", "list"]);
  });
});
