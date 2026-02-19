import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../types/global';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
