import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Request } from "express";
import { ADMIN_CSRF_COOKIE } from "../utils/cookie.util.js";

/**
 * Double-submit CSRF: cookie admin_csrf_token must equal header x-csrf-token.
 * Safe methods (GET/HEAD/OPTIONS) are skipped.
 */
@Injectable()
export class AdminCsrfGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<Request>();

        if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
            return true;
        }

        const cookieToken = req.cookies?.[ADMIN_CSRF_COOKIE] as string | undefined;
        const headerToken = req.headers["x-csrf-token"];
        const headerValue = Array.isArray(headerToken) ? headerToken[0] : headerToken;

        if (!cookieToken || !headerValue || cookieToken !== headerValue) {
            throw new ForbiddenException("Invalid or missing CSRF token");
        }

        return true;
    }
}
