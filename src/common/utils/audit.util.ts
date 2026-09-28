import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../services/prisma/prisma.service.js";

export type AdminAuditParams = {
    adminId: string;
    action: string;
    targetType: string;
    targetId: string;
    ip?: string;
    metadata?: Record<string, unknown>;
};

export async function logAdminAction(
    prisma: PrismaService,
    params: AdminAuditParams,
): Promise<void> {
    const metadata: Prisma.InputJsonValue | undefined = params.metadata || params.ip
        ? {
            ...(params.metadata ?? {}),
            ...(params.ip ? { ip: params.ip } : {}),
        }
        : undefined;

    await prisma.adminAuditLog.create({
        data: {
            adminId: params.adminId,
            action: params.action,
            targetType: params.targetType,
            targetId: params.targetId,
            metadata,
        },
    });
}
