import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../services/prisma/prisma.service.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';
import { AdminAuthResult } from '../../../common/types/auth.types.js';
import { AdminsService } from '../admins/admins.service.js';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { verifyPassword } from '../../../common/utils/password.util.js';
import { AdminRole } from '../../../generated/prisma/enums.js';
import { JwtAdmin, JwtPayload } from '../../../common/types/commonAuthTypes.js';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { SafeAdmin } from './types/admin.types.js';
import { durationToMs } from '../../../common/utils/durationToMs.js';
import { logAdminAction } from '../../../common/utils/audit.util.js';

@Injectable()
export class AdminAuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly adminsService: AdminsService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async adminLogin(dto: AdminLoginDto, meta: { ip?: string; userAgent?: string }): Promise<AdminAuthResult> {
        const admin = await this.adminsService.findByEmailWithPassword(dto.email);

        if (!admin) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (admin.lockedUntil && admin.lockedUntil > new Date()) {
            throw new UnauthorizedException('Account is temporarily locked. Try again later.');
        }

        if (!admin.isActive) {
            throw new UnauthorizedException('Account is disabled');
        }

        const isValid = await verifyPassword(admin.password, dto.password);

        if (!isValid) {
            await this.adminsService.recordFailedLogin(admin.id);
            await logAdminAction(this.prisma, {
                adminId: admin.id,
                action: 'LOGIN_FAILED',
                targetType: 'PlatformAdmin',
                targetId: admin.id,
                ip: meta.ip,
            });
            throw new UnauthorizedException('Invalid credentials');
        }

        await this.adminsService.resetFailedLogins(admin.id);

        const refreshExpiresIn = this.configService.getOrThrow<string>('jwt.refreshExpiresIn');
        const session = await this.prisma.adminSession.create({
            data: {
                adminId: admin.id,
                refreshTokenHash: 'pending',
                userAgent: meta.userAgent,
                ip: meta.ip,
                expiresAt: new Date(Date.now() + durationToMs(refreshExpiresIn)),
            },
        });

        const { accessToken, refreshToken } = await this.issueToken(
            admin.id,
            admin.email,
            admin.role,
            session.id,
        );

        await this.prisma.adminSession.update({
            where: { id: session.id },
            data: { refreshTokenHash: this.hashToken(refreshToken) },
        });

        await logAdminAction(this.prisma, {
            adminId: admin.id,
            action: 'LOGIN',
            targetType: 'PlatformAdmin',
            targetId: admin.id,
            ip: meta.ip,
            metadata: { sessionId: session.id },
        });

        const safeAdmin: SafeAdmin = {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            isActive: admin.isActive,
            lastLoginAt: admin.lastLoginAt,
            createdAt: admin.createdAt,
        };

        return { admin: safeAdmin, accessToken, refreshToken };
    }

    async refresh(
        admin: JwtAdmin,
        refreshToken: string,
        meta?: { ip?: string },
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const session = await this.prisma.adminSession.findUnique({
            where: { id: admin.sessionId },
        });

        if (!session || session.revokedAt || session.expiresAt < new Date()) {
            throw new UnauthorizedException('Session expired or revoked');
        }

        if (session.refreshTokenHash !== this.hashToken(refreshToken)) {
            await this.prisma.adminSession.update({
                where: { id: session.id },
                data: { revokedAt: new Date() },
            });
            throw new UnauthorizedException('Invalid refresh token');
        }

        const { accessToken, refreshToken: newRefreshToken } = await this.issueToken(
            admin.adminId,
            admin.email,
            admin.role,
            session.id,
        );

        await this.prisma.adminSession.update({
            where: { id: session.id },
            data: { refreshTokenHash: this.hashToken(newRefreshToken) },
        });

        await logAdminAction(this.prisma, {
            adminId: admin.adminId,
            action: 'TOKEN_REFRESH',
            targetType: 'AdminSession',
            targetId: session.id,
            ip: meta?.ip,
        });

        return { accessToken, refreshToken: newRefreshToken };
    }

    async logout(admin: JwtAdmin, meta?: { ip?: string }): Promise<void> {
        const session = await this.prisma.adminSession.findUnique({
            where: { id: admin.sessionId },
            select: { id: true, adminId: true },
        });

        if (session) {
            await this.prisma.adminSession.update({
                where: { id: session.id },
                data: { revokedAt: new Date() },
            });

            await logAdminAction(this.prisma, {
                adminId: session.adminId,
                action: 'LOGOUT',
                targetType: 'AdminSession',
                targetId: session.id,
                ip: meta?.ip,
            });
        }
    }

    private async issueToken(adminId: string, email: string, role: AdminRole, sessionId: string) {
        const accessSecret = this.configService.getOrThrow<string>('jwt.adminAccessSecret');
        const accessExpiresIn = this.configService.getOrThrow<string>('jwt.accessExpiresIn');
        const refreshSecret = this.configService.getOrThrow<string>('jwt.adminRefreshSecret');
        const refreshExpiresIn = this.configService.getOrThrow<string>('jwt.refreshExpiresIn');

        const payload: JwtPayload = { sub: adminId, email, role, sessionId };

        const accessToken = await this.jwtService.signAsync(payload, {
            secret: accessSecret,
            expiresIn: accessExpiresIn as JwtSignOptions['expiresIn'],
        });

        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: refreshSecret,
            expiresIn: refreshExpiresIn as JwtSignOptions['expiresIn'],
        });

        return { accessToken, refreshToken };
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
}
