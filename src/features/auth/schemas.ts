import { z } from "zod";

export const LoginSchema = z.object({
  identifier: z.string().trim().min(1, "Please enter your username, email, or phone number."),
  password: z.string().min(1, "Please enter your password."),
});

export type LoginFormData = z.infer<typeof LoginSchema>;

export interface AuthUser {
  id: string;
  role: "admin" | "casher" | "passenger";
  full_name: string;
  username: string;
  email: string;
  phone: string;
}
