import { z } from "zod";
import type { components } from "@/types/api";

export type Fare = components["schemas"]["Fare"];
export type FareHistory = components["schemas"]["FareHistory"];

export const CreateFareSchema = z.object({
  route: z.string().uuid("Invalid route UUID"),
  amount: z.number().positive("Fare amount must be greater than 0"),
});

export type CreateFareFormData = z.infer<typeof CreateFareSchema>;
