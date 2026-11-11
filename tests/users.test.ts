import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CreateCasherSchema,
  usersApi,
  userKeys,
} from "@/features/users";
import { httpClient } from "@/shared/api/client";

vi.mock("@/shared/api/client", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("Users Feature - Create Casher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CreateCasherSchema validation", () => {
    it("validates a valid casher creation payload with casher role", () => {
      const valid = CreateCasherSchema.parse({
        full_name: "Abebe Bikila",
        email: "cashier3@bus.et",
        phone: "+251911998877",
        username: "cashier3",
        password: "Password123!",
        role: "casher",
      });

      expect(valid.full_name).toBe("Abebe Bikila");
      expect(valid.email).toBe("cashier3@bus.et");
      expect(valid.role).toBe("casher");
    });

    it("allows role to be set to admin explicitly", () => {
      const valid = CreateCasherSchema.parse({
        full_name: "Admin User",
        email: "admin2@bus.et",
        phone: "+251911000099",
        username: "admin2",
        password: "Password123!",
        role: "admin",
      });

      expect(valid.role).toBe("admin");
    });

    it("rejects invalid email addresses", () => {
      expect(() =>
        CreateCasherSchema.parse({
          full_name: "Abebe Bikila",
          email: "invalid-email",
          phone: "+251911998877",
          username: "cashier3",
          password: "Password123!",
        })
      ).toThrow();
    });

    it("rejects passwords under 6 characters", () => {
      expect(() =>
        CreateCasherSchema.parse({
          full_name: "Abebe Bikila",
          email: "cashier3@bus.et",
          phone: "+251911998877",
          username: "cashier3",
          password: "123",
        })
      ).toThrow();
    });

    it("rejects phone numbers under 9 characters", () => {
      expect(() =>
        CreateCasherSchema.parse({
          full_name: "Abebe Bikila",
          email: "cashier3@bus.et",
          phone: "12345",
          username: "cashier3",
          password: "Password123!",
        })
      ).toThrow();
    });
  });

  describe("usersApi.createCasher", () => {
    it("calls POST /register/ with clean payload and returns created user", async () => {
      const mockCreatedUser = {
        id: "new-user-uuid-123",
        username: "cashier3",
        email: "cashier3@bus.et",
        phone: "+251911998877",
        full_name: "Abebe Bikila",
        role: "casher",
      };

      vi.mocked(httpClient.post).mockResolvedValueOnce({
        message: "User registered successfully",
        user: mockCreatedUser,
      });

      const result = await usersApi.createCasher({
        full_name: "Abebe Bikila",
        email: "cashier3@bus.et",
        phone: "+251911998877",
        username: "cashier3",
        password: "Password123!",
        role: "casher",
      });

      expect(httpClient.post).toHaveBeenCalledWith("/register/", {
        full_name: "Abebe Bikila",
        email: "cashier3@bus.et",
        phone: "+251911998877",
        username: "cashier3",
        password: "Password123!",
        role: "casher",
      });
      expect(result).toEqual(mockCreatedUser);
    });

    it("handles direct user response object", async () => {
      const mockCreatedUser = {
        id: "new-user-uuid-456",
        username: "cashier4",
        email: "cashier4@bus.et",
        phone: "+251911998888",
        full_name: "Marta Haile",
        role: "casher",
      };

      vi.mocked(httpClient.post).mockResolvedValueOnce(mockCreatedUser);

      const result = await usersApi.createCasher({
        full_name: "Marta Haile",
        email: "cashier4@bus.et",
        phone: "+251911998888",
        username: "cashier4",
        password: "Password123!",
        role: "casher",
      });

      expect(result.id).toBe("new-user-uuid-456");
      expect(result.username).toBe("cashier4");
    });
  });

  describe("userKeys", () => {
    it("maintains expected query key hierarchies", () => {
      expect(userKeys.all).toEqual(["users"]);
      expect(userKeys.cashers()).toEqual(["users", "cashers"]);
    });
  });
});
