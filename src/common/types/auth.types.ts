import { SafeAdmin } from "../../modules/admin/admin-auth/types/admin.types.js";

export interface AdminAuthResult {
    admin: SafeAdmin;
    accessToken: string;
    refreshToken: string;
}