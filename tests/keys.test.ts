import { describe, it, expect } from "vitest";
import { busKeys } from "@/features/buses/keys";
import { routeKeys } from "@/features/routes/keys";
import { fermataKeys } from "@/features/fermatas/keys";
import { fareKeys } from "@/features/fares/keys";
import { tripKeys } from "@/features/trips/keys";
import { trackingKeys } from "@/features/tracking/keys";
import { reportKeys } from "@/features/reports/keys";
import { auditKeys } from "@/features/audit/keys";
import { geoKeys } from "@/features/geo/keys";

describe("Query key factories", () => {
  it("generates structured bus query keys", () => {
    expect(busKeys.all).toEqual(["buses"]);
    expect(busKeys.lists()).toEqual(["buses", "list"]);
    expect(busKeys.list({ status: "active" })).toEqual(["buses", "list", { status: "active" }]);
    expect(busKeys.detail("bus-123")).toEqual(["buses", "detail", "bus-123"]);
    expect(busKeys.maintenanceList("bus-123")).toEqual(["buses", "maintenance", { busId: "bus-123" }]);
  });

  it("generates structured route and fermata query keys", () => {
    expect(routeKeys.lists()).toEqual(["routes", "list"]);
    expect(routeKeys.detail("r-1")).toEqual(["routes", "detail", "r-1"]);
    expect(fermataKeys.lists()).toEqual(["fermatas", "list"]);
    expect(fermataKeys.detail("f-1")).toEqual(["fermatas", "detail", "f-1"]);
  });

  it("generates structured fares, trips, and audit query keys", () => {
    expect(fareKeys.lists()).toEqual(["fares", "list"]);
    expect(fareKeys.history({ route: "r1" })).toEqual(["fares", "history", { route: "r1" }]);
    expect(tripKeys.adminList({ status: "active" })).toEqual(["trips", "admin-list", { status: "active" }]);
    expect(auditKeys.list({ action: "fare.changed" })).toEqual(["audit", "list", { action: "fare.changed" }]);
  });

  it("generates structured geo and tracking query keys", () => {
    expect(trackingKeys.live()).toEqual(["tracking", "live"]);
    expect(trackingKeys.search("124")).toEqual(["tracking", "search", "124"]);
    expect(geoKeys.search("Mexico")).toEqual(["geo", "search", "mexico"]);
    expect(geoKeys.reverse(9.01, 38.74)).toEqual(["geo", "reverse", "9.0100,38.7400"]);
  });
});
