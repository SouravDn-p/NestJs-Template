import {
    Body,
    Controller,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto.js';
import { AdminsService } from '../admins/admins.service.js';
import { ApiResponse } from '../../../common/types/global.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';
import type { Response, Request } from 'express';
import { AdminAuthService } from './admin-auth.service.js';
import {
    ADMIN_REFRESH_COOKIE,
    clearAdminAuthCookies,
    setAdminAuthCookies,
    setAdminCsrfCookie,
} from '../../../common/utils/cookie.util.js';
import { AdminRefreshJwtGuard } from '../../../common/guards/admin-refresh.guard.js';
import { AdminJwtGuard } from '../../../common/guards/admin.jwt.auth.guard.js';
import { AdminCsrfGuard } from '../../../common/guards/admin-csrf.guard.js';
import { JwtAdmin } from '../../../common/types/commonAuthTypes.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';

@Controller('admin-auth')
export class AdminAuthController {
    constructor(
        private readonly adminAuthService: AdminAuthService,
        private readonly adminService: AdminsService,
        private readonly config: ConfigService,
    ) { }

    /**
     * Bootstrap-only: creates the first SUPER_ADMIN when no admins exist.
     * Gated by ALLOW_ADMIN_BOOTSTRAP + serializable count check.
     * CSRF exempt (pre-session); rate-limited.
     */
    @Public()
    @Throttle({ default: { limit: 3, ttl: 60_000 } })
    @Post('/create')
    async create(@Body() dto: CreateAdminDto) {
        const admin = await this.adminService.bootstrapFirstAdmin(dto);
        return ApiResponse.success(admin, 'Admin Create Successfully');
    }

    /** CSRF exempt — no session yet; IP throttle + account lockout. */
    @Public()
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @Post('/login')
    async login(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Body() dto: AdminLoginDto,
    ) {
        const result = await this.adminAuthService.adminLogin(dto, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });

        setAdminAuthCookies(
            res,
            { accessToken: result.accessToken, refreshToken: result.refreshToken },
            this.config,
        );
        const csrfToken = setAdminCsrfCookie(res, this.config);

        return ApiResponse.success(
            { admin: result.admin, csrfToken },
            'Logged in successfully',
        );
    }

    @UseGuards(AdminCsrfGuard, AdminRefreshJwtGuard)
    @Post('refresh')
    async refresh(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const admin = req.user as JwtAdmin;
        const refreshToken = req.cookies?.[ADMIN_REFRESH_COOKIE] as string;
        const tokens = await this.adminAuthService.refresh(admin, refreshToken, {
            ip: req.ip,
        });
        setAdminAuthCookies(res, tokens, this.config);
        const csrfToken = setAdminCsrfCookie(res, this.config);
        return ApiResponse.success({ csrfToken }, 'Token refreshed');
    }

    @UseGuards(AdminJwtGuard, AdminCsrfGuard)
    @Post('logout')
    async logout(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const admin = req.user as JwtAdmin;
        await this.adminAuthService.logout(admin, { ip: req.ip });
        clearAdminAuthCookies(res, this.config);
        return ApiResponse.success(null, 'Logged out successfully');
    }
}
