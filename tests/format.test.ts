import { describe, it, expect } from "vitest";
import {
  formatMoney,
  formatETB,
  formatTime,
  formatTime12h,
  formatDate,
  formatSpeed,
  formatDistance,
  formatRelativeAge,
} from "@/shared/lib/format";

describe("Formatting helpers", () => {
  describe("formatMoney and formatETB", () => {
    it("formats whole numbers with ETB suffix", () => {
      expect(formatMoney(500)).toBe("500 ETB");
      expect(formatETB(15)).toBe("15 ETB");
    });

    it("formats decimal amounts with 2 decimal places", () => {
      expect(formatMoney("15.50")).toBe("15.50 ETB");
      expect(formatETB(15.5)).toBe("15.50 ETB");
    });

    it("handles zero, null, and empty inputs", () => {
      expect(formatMoney(0)).toBe("0 ETB");
      expect(formatMoney(null)).toBe("0 ETB");
      expect(formatMoney("")).toBe("0 ETB");
    });
  });

  describe("formatTime and formatTime12h (Addis Ababa timezone)", () => {
    it("formats UTC ISO timestamps into 12-hour Addis Ababa local time (UTC+3)", () => {
      // 06:30:00 UTC = 09:30 AM in Addis Ababa
      const iso = "2026-11-04T06:30:00Z";
      expect(formatTime(iso)).toBe("9:30 AM");
      expect(formatTime12h(iso)).toBe("9:30 AM");
    });

    it("handles invalid or null date gracefully", () => {
      expect(formatTime(null)).toBe("--:-- --");
      expect(formatTime("invalid-date")).toBe("--:-- --");
    });
  });

  describe("formatDate", () => {
    it("formats date in Addis Ababa timezone", () => {
      const iso = "2026-11-04T06:30:00Z";
      expect(formatDate(iso)).toBe("Nov 4, 2026");
    });
  });

  describe("formatSpeed and formatDistance", () => {
    it("formats speed", () => {
      expect(formatSpeed(35.4)).toBe("35 km/h");
      expect(formatSpeed(null)).toBe("0 km/h");
    });

    it("formats distance", () => {
      expect(formatDistance(450)).toBe("450 m");
      expect(formatDistance(2500)).toBe("2.5 km");
    });
  });

  describe("formatRelativeAge", () => {
    it("formats relative age", () => {
      const now = new Date();
      expect(formatRelativeAge(now)).toBe("Just now");
      expect(formatRelativeAge(null)).toBe("Never");
    });
  });
});
