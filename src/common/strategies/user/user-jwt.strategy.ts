import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy, StrategyOptions } from "passport-jwt";
import { JwtPayload, JwtUser } from "../../types/commonAuthTypes.js";


@Injectable()
export class UserJwtStrategy extends PassportStrategy(Strategy, 'user-jwt') {
    constructor() {
        const options: StrategyOptions = {
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request): string | null =>
                    (req?.cookies?.['user_access_token'] as string) ?? null
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.USER_JWT_ACCESS_SECRET as string
        };
        super(options);
    }

    validate(payload: JwtPayload): JwtUser {
        return {
            userId: payload.sub,
            email: payload.email,
            role: payload.role,
            sessionId: payload.sessionId
        }
    }
}