import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../services/prisma/prisma.service.js';
import { handlePrismaError } from '../../../common/filters/prisma-exeption-handler.js';
import { SafeAdmin } from '../admin-auth/types/admin.types.js';
import { CreateAdminDto } from '../admin-auth/dto/create-admin.dto.js';
import { hashPassword } from '../../../common/utils/password.util.js';
import { AdminRole } from '../../../generated/prisma/enums.js';
import { logAdminAction } from '../../../common/utils/audit.util.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { ConfigService } from '@nestjs/config';

const SAFE_ADMIN_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    lastLoginAt: true,
    createdAt: true,
} as const;

@Injectable()
export class AdminsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) { }

    async getAllAdmins(page = 1, limit = 10): Promise<{ data: SafeAdmin[]; total: number }> {
        try {
            const [data, total] = await this.prisma.$transaction([
                this.prisma.platformAdmin.findMany({
                    where: { deletedAt: null },
                    select: SAFE_ADMIN_SELECT,
                    skip: (page - 1) * limit,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.platformAdmin.count({
                    where: { deletedAt: null },
                }),
            ]);

            return { data, total };
        } catch (error) {
            handlePrismaError(error);
        }
    }

    async countAdmins(): Promise<number> {
        return this.prisma.platformAdmin.count({
            where: { deletedAt: null },
        });
    }

    /**
     * First SUPER_ADMIN only. Serializable txn + env gate to avoid race / prod exposure.
     */
    async bootstrapFirstAdmin(dto: CreateAdminDto): Promise<SafeAdmin> {
        const env = this.config.get<string>('app.env') ?? 'development';
        const allowFlag = this.config.get<string>('ALLOW_ADMIN_BOOTSTRAP');
        const bootstrapAllowed =
            allowFlag === 'true' || (env !== 'production' && allowFlag !== 'false');

        if (!bootstrapAllowed) {
            throw new ForbiddenException(
                'Admin bootstrap is disabled. Set ALLOW_ADMIN_BOOTSTRAP=true for initial deploy.',
            );
        }

        const password = await hashPassword(dto.password);

        try {
            const admin = await this.prisma.$transaction(
                async (tx) => {
                    const count = await tx.platformAdmin.count({
                        where: { deletedAt: null },
                    });
                    if (count > 0) {
                        throw new ForbiddenException(
                            'Bootstrap disabled. Use POST /admins with SUPER_ADMIN credentials.',
                        );
                    }

                    return tx.platformAdmin.create({
                        data: {
                            name: dto.name,
                            email: dto.email,
                            password,
                            role: AdminRole.SUPER_ADMIN,
                        },
                        select: SAFE_ADMIN_SELECT,
                    });
                },
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
            );

            await logAdminAction(this.prisma, {
                adminId: admin.id,
                action: 'ADMIN_BOOTSTRAP',
                targetType: 'PlatformAdmin',
                targetId: admin.id,
                metadata: { email: admin.email },
            });

            return admin;
        } catch (error) {
            if (error instanceof ForbiddenException) throw error;
            if (
                error instanceof Prisma.PrismaClientKnownRequestError
                && error.code === 'P2002'
            ) {
                throw new ForbiddenException(
                    'Bootstrap disabled. Use POST /admins with SUPER_ADMIN credentials.',
                );
            }
            // Serializable conflict — treat as race lost
            if (
                error instanceof Prisma.PrismaClientKnownRequestError
                && error.code === 'P2034'
            ) {
                throw new ForbiddenException(
                    'Bootstrap disabled. Use POST /admins with SUPER_ADMIN credentials.',
                );
            }
            handlePrismaError(error);
        }
    }

    async createAdmin(
        dto: CreateAdminDto,
        actor?: { adminId: string; ip?: string },
    ): Promise<SafeAdmin> {
        const existing = await this.prisma.platformAdmin.findFirst({
            where: {
                email: dto.email,
                deletedAt: null,
            },
        });

        if (existing) throw new ConflictException('Email already in use');
        const password = await hashPassword(dto.password);

        try {
            const user = await this.prisma.platformAdmin.create({
                data: { ...dto, password },
                select: SAFE_ADMIN_SELECT,
            });

            if (actor?.adminId) {
                await logAdminAction(this.prisma, {
                    adminId: actor.adminId,
                    action: 'ADMIN_CREATED',
                    targetType: 'PlatformAdmin',
                    targetId: user.id,
                    ip: actor.ip,
                    metadata: {
                        createdAdminId: user.id,
                        byAdminId: actor.adminId,
                        role: user.role,
                    },
                });
            }

            return user;
        } catch (error) {
            handlePrismaError(error);
        }
    }

    async findByIdSafe(id: string): Promise<SafeAdmin> {
        const admin = await this.prisma.platformAdmin.findFirst({
            where: { id, deletedAt: null },
            select: SAFE_ADMIN_SELECT,
        });
        if (!admin) throw new NotFoundException('Admin not found');
        return admin;
    }

    async findByEmailWithPassword(email: string) {
        return this.prisma.platformAdmin.findFirst({
            where: {
                email,
                deletedAt: null,
            },
        });
    }

    async deactivateAdmin(
        id: string,
        actor?: { adminId: string; ip?: string },
    ): Promise<SafeAdmin> {
        try {
            const admin = await this.prisma.platformAdmin.update({
                where: { id },
                data: { isActive: false },
                select: SAFE_ADMIN_SELECT,
            });

            if (actor?.adminId) {
                await logAdminAction(this.prisma, {
                    adminId: actor.adminId,
                    action: 'ADMIN_DEACTIVATED',
                    targetType: 'PlatformAdmin',
                    targetId: id,
                    ip: actor.ip,
                    metadata: { byAdminId: actor.adminId },
                });
            }

            return admin;
        } catch (error) {
            return handlePrismaError(error);
        }
    }

    async getAuditLogs(adminId: string, page = 1, limit = 20) {
        await this.findByIdSafe(adminId);

        const [data, total] = await this.prisma.$transaction([
            this.prisma.adminAuditLog.findMany({
                where: { adminId },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.adminAuditLog.count({ where: { adminId } }),
        ]);

        return { data, total, page, limit };
    }

    async recordFailedLogin(id: string) {
        const admin = await this.prisma.platformAdmin.update({
            where: { id },
            data: { failedLoginAttempts: { increment: 1 } },
        });

        if (admin.failedLoginAttempts >= 5) {
            await this.prisma.platformAdmin.update({
                where: { id },
                data: {
                    lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
                    failedLoginAttempts: 0,
                },
            });
        }
    }

    async resetFailedLogins(id: string) {
        await this.prisma.platformAdmin.update({
            where: { id },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
                lastLoginAt: new Date(),
            },
        });
    }
}
