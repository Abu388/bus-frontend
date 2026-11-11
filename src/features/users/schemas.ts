import { z } from "zod";

export const CasherUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  phone: z.string().nullable().optional(),
  full_name: z.string(),
  role: z.string(),
});

export type CasherUser = z.infer<typeof CasherUserSchema>;

export const CreateCasherSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(255, "Full name cannot exceed 255 characters"),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(254, "Email cannot exceed 254 characters"),
  phone: z
    .string()
    .trim()
    .min(9, "Phone number must be at least 9 characters (e.g. +251911223344)")
    .max(20, "Phone number cannot exceed 20 characters"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(150, "Username cannot exceed 150 characters")
    .regex(/^[\w.@+-]+$/, "Username can only contain letters, digits, and @/./+/-/_"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
  role: z.enum(["casher", "admin"]),
});

export type CreateCasherFormData = z.infer<typeof CreateCasherSchema>;
