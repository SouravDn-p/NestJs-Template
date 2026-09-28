import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class AdminRefreshJwtGuard extends AuthGuard('admin-refresh-jwt') { }