import { describe, it, expect } from "vitest";
import {
  getAuditActionLabel,
  getAuditActionBadgeProps,
  AUDIT_ACTION_CONFIG,
  isPaymentOrTicketAction,
} from "@/features/audit/actions";
import { getAuditPassengerCount, type AuditLog, type AuditLogMetadata } from "@/features/audit/schemas";
import { getPaymentPassengerCount, type Payment, type TicketSummary } from "@/features/payments";
import { getTicketPassengerCount, type Ticket } from "@/features/tickets";
import { parsePassengerCount, formatPassengerCount } from "@/shared/lib/format";

describe("Audit Actions Configuration & Helpers", () => {
  it("provides correct labels for new payment and ticket audit actions", () => {
    expect(getAuditActionLabel("payment.initiated")).toBe("Payment Initiated");
    expect(getAuditActionLabel("payment.succeeded")).toBe("Payment Succeeded");
    expect(getAuditActionLabel("payment.failed")).toBe("Payment Failed");
    expect(getAuditActionLabel("ticket.issued")).toBe("Ticket Issued");
    expect(getAuditActionLabel("ticket.validated")).toBe("Ticket Validated");
  });

  it("identifies payment and ticket audit actions correctly", () => {
    expect(isPaymentOrTicketAction("payment.initiated")).toBe(true);
    expect(isPaymentOrTicketAction("payment.succeeded")).toBe(true);
    expect(isPaymentOrTicketAction("payment.failed")).toBe(true);
    expect(isPaymentOrTicketAction("ticket.issued")).toBe(true);
    expect(isPaymentOrTicketAction("ticket.validated")).toBe(true);
    expect(isPaymentOrTicketAction("fare.changed")).toBe(false);
    expect(isPaymentOrTicketAction("bus.maintenance_started")).toBe(false);
  });

  it("provides appropriate badge styling for payment and ticket actions", () => {
    const initiated = getAuditActionBadgeProps("payment.initiated");
    expect(initiated.variant).toBe("outline");
    expect(initiated.className).toContain("amber");
    expect(initiated.label).toBe("Payment Initiated");

    const succeeded = getAuditActionBadgeProps("payment.succeeded");
    expect(succeeded.variant).toBe("accent");
    expect(succeeded.className).toContain("emerald");
    expect(succeeded.label).toBe("Payment Succeeded");

    const failed = getAuditActionBadgeProps("payment.failed");
    expect(failed.variant).toBe("outline");
    expect(failed.className).toContain("danger");
    expect(failed.label).toBe("Payment Failed");

    const issued = getAuditActionBadgeProps("ticket.issued");
    expect(issued.variant).toBe("default");
    expect(issued.className).toContain("primary");
    expect(issued.label).toBe("Ticket Issued");

    const validated = getAuditActionBadgeProps("ticket.validated");
    expect(validated.variant).toBe("accent");
    expect(validated.className).toContain("emerald");
    expect(validated.label).toBe("Ticket Validated");
  });

  it("handles unknown audit actions gracefully with formatted label and outline badge", () => {
    const unknown = getAuditActionBadgeProps("custom.event.name");
    expect(unknown.label).toBe("Custom Event Name");
    expect(unknown.variant).toBe("outline");
  });

  it("covers fleet, route, trip and fare audit actions", () => {
    expect(AUDIT_ACTION_CONFIG["fare.changed"].label).toBe("Fare Changed");
    expect(AUDIT_ACTION_CONFIG["bus.maintenance_started"].label).toBe("Maintenance Started");
    expect(AUDIT_ACTION_CONFIG["trip.started"].label).toBe("Trip Started");
    expect(AUDIT_ACTION_CONFIG["trip.ended"].label).toBe("Trip Ended");
  });
});

describe("Payment Multi-Passenger (Group / Family) Support", () => {
  it("supports route_name, public_bus_number, ticket and ticket_id on Payment objects", () => {
    const payment: Payment = {
      id: "pay-101",
      trip: "trip-202",
      passenger: "pass-303",
      fare: "fare-404",
      amount: "25.00",
      status: "succeeded",
      provider: "cbe",
      provider_ref: "CBE-TX-99881",
      idempotency_key: "idem-abc",
      created_at: "2026-11-08T14:30:00Z",
      expires_at: "2026-11-08T14:40:00Z",
      paid_at: "2026-11-08T14:30:05Z",
      failure_reason: null,
      ticket_id: "tkt-555",
      route_name: "Tor Hailoch to Bole",
      public_bus_number: 4,
      ticket: {
        id: "tkt-555",
        code: "TCK-4-99881",
        status: "issued",
      },
    };

    expect(payment.route_name).toBe("Tor Hailoch to Bole");
    expect(payment.public_bus_number).toBe(4);
    expect(payment.ticket?.code).toBe("TCK-4-99881");
    expect(payment.ticket_id).toBe("tkt-555");
    expect(payment.status).toBe("succeeded");
  });

  it("supports passenger_count, quantity, and unit_fare for multi-passenger payments", () => {
    const groupPayment: Payment = {
      id: "pay-group-102",
      trip: "trip-202",
      passenger: "pass-family",
      fare: "fare-404",
      amount: "150.00",
      status: "succeeded",
      provider: "telebirr",
      provider_ref: "TB-TX-7711",
      idempotency_key: "idem-group",
      created_at: "2026-11-08T15:00:00Z",
      expires_at: "2026-11-08T15:10:00Z",
      paid_at: "2026-11-08T15:00:04Z",
      failure_reason: null,
      passenger_count: 6,
      quantity: 6,
      unit_fare: "25.00",
      route_name: "Autobus Tera to Megenagna",
      public_bus_number: 12,
    };

    expect(groupPayment.passenger_count).toBe(6);
    expect(groupPayment.quantity).toBe(6);
    expect(groupPayment.unit_fare).toBe("25.00");
    expect(getPaymentPassengerCount(groupPayment)).toBe(6);
  });

  it("getPaymentPassengerCount defaults to 1 when undefined, 0, or null", () => {
    expect(getPaymentPassengerCount(null)).toBe(1);
    expect(getPaymentPassengerCount(undefined)).toBe(1);
    expect(getPaymentPassengerCount({} as Payment)).toBe(1);
    expect(getPaymentPassengerCount({ passenger_count: undefined } as Payment)).toBe(1);
    expect(getPaymentPassengerCount({ quantity: 4 } as Payment)).toBe(4);
    expect(getPaymentPassengerCount({ ticket: { passenger_count: 5 } } as Payment)).toBe(5);
  });
});

describe("Ticket Multi-Passenger (Group / Family) Support", () => {
  it("supports passenger_count, quantity, and unit_fare on Ticket and TicketSummary", () => {
    const ticket: Ticket = {
      id: "tkt-001",
      code: "TCK-GRP-001",
      payment: "pay-101",
      passenger: "pass-family",
      trip: "trip-202",
      issued_at: "2026-11-08T15:00:00Z",
      expires_at: "2026-11-08T17:00:00Z",
      status: "issued",
      amount: "150.00",
      route_name: "Line 12",
      passenger_count: 6,
      quantity: 6,
      unit_fare: 25,
    };

    expect(ticket.passenger_count).toBe(6);
    expect(ticket.quantity).toBe(6);
    expect(ticket.unit_fare).toBe(25);
    expect(getTicketPassengerCount(ticket)).toBe(6);
  });

  it("getTicketPassengerCount defaults to 1 when undefined", () => {
    expect(getTicketPassengerCount(null)).toBe(1);
    expect(getTicketPassengerCount(undefined)).toBe(1);
    const summary: TicketSummary = { id: "tkt-1", code: "TCK-1" };
    expect(getTicketPassengerCount(summary)).toBe(1);
    expect(getTicketPassengerCount({ quantity: 3 })).toBe(3);
  });
});

describe("AuditLog Metadata Multi-Passenger Support", () => {
  it("supports passenger_count, quantity, unit_fare, and amount on AuditLog.metadata", () => {
    const metadata: AuditLogMetadata = {
      passenger_count: 6,
      quantity: 6,
      unit_fare: "25.00",
      amount: "150.00",
      payment_id: "pay-101",
      ticket_id: "tkt-001",
    };

    const auditLog: AuditLog = {
      id: "log-1",
      actor_id: "actor-1",
      actor_role: "passenger",
      actor_kind: "user",
      action: "payment.succeeded",
      entity_type: "payment",
      entity_id: "pay-101",
      created_at: "2026-11-08T15:00:05Z",
      metadata,
    };

    expect(auditLog.metadata?.passenger_count).toBe(6);
    expect(auditLog.metadata?.unit_fare).toBe("25.00");
    expect(auditLog.metadata?.amount).toBe("150.00");
    expect(getAuditPassengerCount(auditLog.metadata)).toBe(6);
  });

  it("getAuditPassengerCount defaults to 1 when metadata is empty or undefined", () => {
    expect(getAuditPassengerCount(null)).toBe(1);
    expect(getAuditPassengerCount(undefined)).toBe(1);
    expect(getAuditPassengerCount({})).toBe(1);
    expect(getAuditPassengerCount({ amount: "25.00" })).toBe(1);
    expect(getAuditPassengerCount({ quantity: 10 })).toBe(10);
  });
});

describe("Passenger Count Formatting Helpers", () => {
  it("parses passenger count correctly and defaults to 1", () => {
    expect(parsePassengerCount(1)).toBe(1);
    expect(parsePassengerCount(6)).toBe(6);
    expect(parsePassengerCount("10")).toBe(10);
    expect(parsePassengerCount(undefined)).toBe(1);
    expect(parsePassengerCount(null)).toBe(1);
    expect(parsePassengerCount("")).toBe(1);
    expect(parsePassengerCount(0)).toBe(1);
    expect(parsePassengerCount(-5)).toBe(1);
  });

  it("formats passenger counts cleanly in lowercase and capitalized options", () => {
    expect(formatPassengerCount(1)).toBe("1 passenger");
    expect(formatPassengerCount(6)).toBe("6 passengers");
    expect(formatPassengerCount(10)).toBe("10 passengers");
    expect(formatPassengerCount(undefined)).toBe("1 passenger");

    expect(formatPassengerCount(1, { capitalize: true })).toBe("1 Passenger");
    expect(formatPassengerCount(6, { capitalize: true })).toBe("6 Passengers");
    expect(formatPassengerCount(10, { capitalize: true })).toBe("10 Passengers");
    expect(formatPassengerCount(null, { capitalize: true })).toBe("1 Passenger");
  });
});
