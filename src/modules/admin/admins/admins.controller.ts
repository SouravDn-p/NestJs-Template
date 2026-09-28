import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { AdminsService } from './admins.service.js';
import { ApiResponse } from '../../../common/types/global.js';
import { CreateAdminDto } from '../admin-auth/dto/create-admin.dto.js';
import { AdminRole } from '../../../generated/prisma/enums.js';
import { ADMIN_ROLE } from '../../../common/decorators/admin.role.decorator.js';
import { AdminJwtGuard } from '../../../common/guards/admin.jwt.auth.guard.js';
import { AdminRolesGuard } from '../../../common/guards/admin.role.guard.js';
import { AdminCsrfGuard } from '../../../common/guards/admin-csrf.guard.js';
import type { Request } from 'express';
import { JwtAdmin } from '../../../common/types/commonAuthTypes.js';

@Controller('admins')
@UseGuards(AdminJwtGuard, AdminRolesGuard, AdminCsrfGuard)
export class AdminsController {
    constructor(private readonly adminService: AdminsService) { }

    @ADMIN_ROLE(AdminRole.SUPER_ADMIN)
    @Get('')
    async getAll(@Query('page') page = 1, @Query('limit') limit = 20) {
        const result = await this.adminService.getAllAdmins(Number(page), Number(limit));
        return ApiResponse.success(result, 'Admins fetched successfully');
    }

    @ADMIN_ROLE(AdminRole.SUPER_ADMIN)
    @Post()
    async create(@Req() req: Request, @Body() dto: CreateAdminDto) {
        const actor = req.user as JwtAdmin;
        const admin = await this.adminService.createAdmin(dto, {
            adminId: actor.adminId,
            ip: req.ip,
        });
        return ApiResponse.success(admin, 'Admin created successfully');
    }

    @ADMIN_ROLE(AdminRole.SUPER_ADMIN)
    @Get(':id/audit-logs')
    async getAuditLogs(
        @Param('id') id: string,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
    ) {
        const logs = await this.adminService.getAuditLogs(id, Number(page), Number(limit));
        return ApiResponse.success(logs, 'Audit logs fetched');
    }

    @ADMIN_ROLE(AdminRole.SUPER_ADMIN)
    @Patch(':id/deactivate')
    async deactivate(@Req() req: Request, @Param('id') id: string) {
        const actor = req.user as JwtAdmin;
        const admin = await this.adminService.deactivateAdmin(id, {
            adminId: actor.adminId,
            ip: req.ip,
        });
        return ApiResponse.success(admin, 'Admin deactivated successfully');
    }
}
