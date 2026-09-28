import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy, StrategyOptions } from "passport-jwt";
import { JwtPayload, JwtAdmin } from "../../types/commonAuthTypes.js";
import { Request } from "express";
import { PrismaService } from "../../../services/prisma/prisma.service.js";
import { ConfigService } from "@nestjs/config";
import { ADMIN_ACCESS_COOKIE } from "../../utils/cookie.util.js";

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, "admin-jwt") {
    constructor(
        private readonly prisma: PrismaService,
        config: ConfigService,
    ) {
        const secret = config.get<string>("jwt.adminAccessSecret");
        if (!secret) {
            throw new Error("ADMIN_JWT_ACCESS_SECRET (jwt.adminAccessSecret) is not set");
        }

        const options: StrategyOptions = {
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request): string | null =>
                    (req?.cookies?.[ADMIN_ACCESS_COOKIE] as string) ?? null,
            ]),
            ignoreExpiration: false,
            secretOrKey: secret,
        };
        super(options);
    }

    async validate(payload: JwtPayload): Promise<JwtAdmin> {
        const session = await this.prisma.adminSession.findUnique({
            where: { id: payload.sessionId },
            select: {
                revokedAt: true,
                expiresAt: true,
                admin: { select: { isActive: true } },
            },
        });

        if (
            !session
            || session.revokedAt
            || session.expiresAt < new Date()
            || !session.admin.isActive
        ) {
            throw new UnauthorizedException("Session is no longer valid");
        }

        return {
            adminId: String(payload.sub),
            email: payload.email,
            role: payload.role,
            sessionId: payload.sessionId,
        };
    }
}
