import { SetMetadata } from "@nestjs/common";
import { AdminRole } from "../../generated/prisma/enums.js";

export const ADMIN_ROLES_KEY = 'admin_roles';
export const ADMIN_ROLE = (...admin_roles: AdminRole[]) => SetMetadata(ADMIN_ROLES_KEY, admin_roles)