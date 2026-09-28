import { AdminRole } from "../../generated/prisma/enums.js";

export interface JwtPayload {
  sub: string;
  email: string;
  role: AdminRole;
  sessionId: string;
}

export interface JwtAdmin {
  adminId: string;
  email: string;
  role: AdminRole;
  sessionId: string;
}

export interface JwtUser {
  userId: string;
  email: string;
  role: AdminRole;
  sessionId: string;
}
