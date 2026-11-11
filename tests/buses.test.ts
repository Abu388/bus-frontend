import { describe, it, expect } from "vitest";
import {
  CreateBusSchema,
  UpdateBusSchema,
  PhysicalBusSchema,
} from "@/features/buses/schemas";
import { CasherUserSchema } from "@/features/users/schemas";

describe("Fleet / Bus Schemas with Casher Assignment", () => {
  it("validates CreateBusSchema with casher UUID or empty string", () => {
    const validWithCasher = CreateBusSchema.parse({
      targa: "3-AA-12403",
      route: "550e8400-e29b-41d4-a716-446655440000",
      casher: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      status: "active",
    });
    expect(validWithCasher.casher).toBe("6ba7b810-9dad-11d1-80b4-00c04fd430c8");

    const validWithoutCasher = CreateBusSchema.parse({
      targa: "3-AA-12403",
      route: "",
      casher: "",
      status: "active",
    });
    expect(validWithoutCasher.casher).toBe("");

    const validWithNullCasher = CreateBusSchema.parse({
      targa: "3-AA-12403",
      casher: null,
      status: "active",
    });
    expect(validWithNullCasher.casher).toBeNull();
  });

  it("validates UpdateBusSchema with nullable casher", () => {
    const updateWithCasher = UpdateBusSchema.parse({
      casher: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    });
    expect(updateWithCasher.casher).toBe("6ba7b810-9dad-11d1-80b4-00c04fd430c8");

    const unassignCasher = UpdateBusSchema.parse({
      casher: null,
    });
    expect(unassignCasher.casher).toBeNull();

    const emptyCasher = UpdateBusSchema.parse({
      casher: "",
    });
    expect(emptyCasher.casher).toBe("");
  });

  it("validates PhysicalBusSchema with route and casher fields", () => {
    const bus = PhysicalBusSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      targa: "3-AA-12401",
      route: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      route_number: 4,
      route_name: "Piazza to Bole",
      casher: "8ba7b810-9dad-11d1-80b4-00c04fd430c9",
      casher_name: "Abebe Bikila",
      status: "active",
      created_at: "2026-11-01T10:00:00Z",
      updated_at: "2026-11-07T12:00:00Z",
    });

    expect(bus.casher_name).toBe("Abebe Bikila");
    expect(bus.route_number).toBe(4);
    expect(bus.route_name).toBe("Piazza to Bole");
  });

  it("validates CasherUserSchema", () => {
    const casher = CasherUserSchema.parse({
      id: "8ba7b810-9dad-11d1-80b4-00c04fd430c9",
      username: "casher1",
      email: "casher1@anbessa.et",
      phone: "+251911223344",
      full_name: "Abebe Bikila",
      role: "casher",
    });

    expect(casher.full_name).toBe("Abebe Bikila");
    expect(casher.role).toBe("casher");
  });
});
