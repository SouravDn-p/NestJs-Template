import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtUser, UserRole } from '../types/global';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtUser;

    // If roles are required but user is not authenticated, deny access
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Please provide a valid JWT token.',
      );
    }

    // Check if user has required role
    if (!user.role) {
      throw new UnauthorizedException('User role not found in token.');
    }

    const hasRequiredRole = requiredRoles.some((role) => user.role === role);

    if (!hasRequiredRole) {
      throw new UnauthorizedException(
        `User role '${user.role}' is not authorized to access this resource.`,
      );
    }

    return true;
  }
}
