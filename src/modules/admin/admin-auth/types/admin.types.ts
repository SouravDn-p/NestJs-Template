import { AdminRole } from "../../../../generated/prisma/enums.js";

export interface SafeAdmin {
    id: string;
    name: string;
    email: string;
    role: AdminRole;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
}
