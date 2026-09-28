import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy, StrategyOptions } from "passport-jwt";
import { JwtAdmin, JwtPayload } from "../../types/commonAuthTypes.js";
import { ConfigService } from "@nestjs/config";
import { ADMIN_REFRESH_COOKIE } from "../../utils/cookie.util.js";

@Injectable()
export class AdminJwtRefreshStrategy extends PassportStrategy(Strategy, "admin-refresh-jwt") {
    constructor(config: ConfigService) {
        const secret = config.get<string>("jwt.adminRefreshSecret");
        if (!secret) {
            throw new Error("ADMIN_JWT_REFRESH_SECRET (jwt.adminRefreshSecret) is not set");
        }

        const options: StrategyOptions = {
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request): string | null =>
                    (req?.cookies?.[ADMIN_REFRESH_COOKIE] as string) ?? null,
            ]),
            ignoreExpiration: false,
            secretOrKey: secret,
            passReqToCallback: false,
        };

        super(options);
    }

    validate(payload: JwtPayload): JwtAdmin {
        return {
            adminId: String(payload.sub),
            email: payload.email,
            role: payload.role,
            sessionId: payload.sessionId,
        };
    }
}
