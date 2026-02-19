import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Routes that don't require authentication
  private readonly publicRoutes = [
    '/auth/register',
    '/auth/login',
    '/auth/refresh',
  ];

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path;

    // Skip JWT validation for public routes
    if (this.publicRoutes.some((route) => path.startsWith(route))) {
      return true;
    }

    const result = super.canActivate(context);

    // Handle Promise
    if (result instanceof Promise) {
      return result.catch(() => true);
    }

    // Handle Observable
    if (result instanceof Observable) {
      return result.pipe(catchError(() => of(true)));
    }

    // Handle boolean
    return result;
  }
}
