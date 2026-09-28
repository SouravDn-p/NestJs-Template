import { Module } from '@nestjs/common';
import { AdminsController } from './admins.controller.js';
import { AdminsService } from './admins.service.js';
import { AdminJwtGuard } from '../../../common/guards/admin.jwt.auth.guard.js';
import { AdminRolesGuard } from '../../../common/guards/admin.role.guard.js';
import { AdminCsrfGuard } from '../../../common/guards/admin-csrf.guard.js';

@Module({
  controllers: [AdminsController],
  providers: [AdminsService, AdminJwtGuard, AdminRolesGuard, AdminCsrfGuard],
  exports: [AdminsService],
})
export class AdminsModule { }
