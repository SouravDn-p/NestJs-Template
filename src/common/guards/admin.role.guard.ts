import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Observable } from "rxjs";
import { AdminRole } from "../../generated/prisma/enums.js";
import { ADMIN_ROLES_KEY } from "../decorators/admin.role.decorator.js";
import { Reflector } from "@nestjs/core";
import { JwtAdmin } from "../types/commonAuthTypes.js";
import { Request } from "express";

@Injectable()
export class AdminRolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
            ADMIN_ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const admin = request.user as JwtAdmin | undefined;

        if (!admin || !admin.role) {
            return false;
        }

        return requiredRoles.includes(admin.role);
    }
}
