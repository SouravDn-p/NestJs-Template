import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller.js';
import { AdminAuthService } from './admin-auth.service.js';
import { AdminsModule } from '../admins/admins.module.js';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminJwtStrategy } from '../../../common/strategies/admin/admin-jwt.strategy.js';
import { AdminJwtRefreshStrategy } from '../../../common/strategies/admin/admin-jwt-refresh.strategy.js';
import { AdminRolesGuard } from '../../../common/guards/admin.role.guard.js';
import { AdminCsrfGuard } from '../../../common/guards/admin-csrf.guard.js';

@Module({
  controllers: [AdminAuthController],
  providers: [
    AdminAuthService,
    AdminJwtStrategy,
    AdminJwtRefreshStrategy,
    AdminRolesGuard,
    AdminCsrfGuard,
  ],
  imports: [
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.register({}),
    AdminsModule,
  ],
})
export class AdminAuthModule { }
