import { CookieOptions, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { durationToMs } from "./durationToMs.js";
import * as crypto from "crypto";

export const ADMIN_ACCESS_COOKIE = "admin_access_token";
export const ADMIN_REFRESH_COOKIE = "admin_refresh_token";
export const ADMIN_CSRF_COOKIE = "admin_csrf_token";

/** Must match global prefix + AdminAuthController refresh route. */
export const ADMIN_REFRESH_COOKIE_PATH = "/api/v1/admin-auth/refresh";

function isProd(config: ConfigService): boolean {
    return config.get<string>("app.env") === "production"
        || config.get<string>("NODE_ENV") === "production";
}

function accessMaxAge(config: ConfigService): number {
    return durationToMs(config.get<string>("jwt.accessExpiresIn") ?? "15m");
}

function refreshMaxAge(config: ConfigService): number {
    return durationToMs(config.get<string>("jwt.refreshExpiresIn") ?? "7d");
}

export function setAdminAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
    config: ConfigService,
): void {
    const prod = isProd(config);
    const sameSite = "strict" as const;

    const accessOptions: CookieOptions = {
        httpOnly: true,
        secure: prod,
        sameSite,
        maxAge: accessMaxAge(config),
        path: "/",
    };

    const refreshOptions: CookieOptions = {
        httpOnly: true,
        secure: prod,
        sameSite,
        maxAge: refreshMaxAge(config),
        path: ADMIN_REFRESH_COOKIE_PATH,
    };

    res.cookie(ADMIN_ACCESS_COOKIE, tokens.accessToken, accessOptions);
    res.cookie(ADMIN_REFRESH_COOKIE, tokens.refreshToken, refreshOptions);
}

/** Double-submit CSRF: readable by JS (httpOnly: false), sent back as X-CSRF-Token. */
export function setAdminCsrfCookie(res: Response, config: ConfigService): string {
    const prod = isProd(config);
    const csrfToken = crypto.randomBytes(32).toString("hex");

    res.cookie(ADMIN_CSRF_COOKIE, csrfToken, {
        httpOnly: false,
        secure: prod,
        sameSite: "strict",
        path: "/",
        maxAge: refreshMaxAge(config),
    });

    return csrfToken;
}

export function clearAdminAuthCookies(res: Response, config: ConfigService): void {
    const prod = isProd(config);
    const sameSite = "strict" as const;

    res.clearCookie(ADMIN_ACCESS_COOKIE, {
        path: "/",
        httpOnly: true,
        secure: prod,
        sameSite,
    });

    res.clearCookie(ADMIN_REFRESH_COOKIE, {
        path: ADMIN_REFRESH_COOKIE_PATH,
        httpOnly: true,
        secure: prod,
        sameSite,
    });

    res.clearCookie(ADMIN_CSRF_COOKIE, {
        path: "/",
        httpOnly: false,
        secure: prod,
        sameSite,
    });
}
