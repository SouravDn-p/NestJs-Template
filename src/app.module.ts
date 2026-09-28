import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import appConfig from './config/app.config.js';
import cloudinaryConfig from './config/cloudinary.config.js';
import dbConfig from './config/db.config.js';
import jwtConfig from './config/jwt.config.js';
import { PrismaModule } from './services/prisma/prisma.module.js';
import { AdminAuthModule } from './modules/admin/admin-auth/admin-auth.module.js';
import { AdminsModule } from './modules/admin/admins/admins.module.js';
import { PlansModule } from './modules/admin/plans/plans.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, dbConfig, cloudinaryConfig, jwtConfig],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AdminAuthModule,
    AdminsModule,
    PlansModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule { }
