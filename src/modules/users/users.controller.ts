import { UsersService } from './users.service';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserDocument } from './schemas/user.schema';
import { GlobalResponse } from '../../common/response/global-response.interface';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from 'src/common/types/global';

@Controller('users')
export class UsersController {
  constructor(private readonly UsersService: UsersService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getAllUser(): Promise<GlobalResponse<UserDocument[]>> {
    return await this.UsersService.findAll();
  }

  @Get('admin')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN)
  async getAdminUsers(): Promise<GlobalResponse<UserDocument[]>> {
    return await this.UsersService.findAll();
  }
}
