export type UserRole = "passenger" | "casher" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  role: UserRole;
}

export interface SessionPayload {
  user: AuthUser;
  exp: number;
  iat: number;
}
