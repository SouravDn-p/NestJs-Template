import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RefreshTokenGuard } from '../../common/guards/refresh-token.guard';
import {
  setAuthCookies,
  clearAuthCookies,
} from '../../common/utils/cookie.util';
import { User } from '../../common/decorators/user.decorator';
// Define the user type directly to avoid import issues
interface AuthenticatedUser {
  _id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res() res: Response) {
    // Combine firstName and lastName for compatibility with frontend expectations
    const result = await this.authService.register(registerDto);

    // Set auth cookies
    setAuthCookies(res, result.accessToken, result.refreshToken);

    return res.status(HttpStatus.CREATED).json({
      statusCode: HttpStatus.CREATED,
      message: 'User registered successfully',
      data: {
        user: {
          ...result.user,
          // Map to match frontend expectation
          name: `${result.user.firstName} ${result.user.lastName}`,
          email: result.user.email,
        },
      },
    });
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @User() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const result = await this.authService.login(user);

    // Set auth cookies
    setAuthCookies(res, result.accessToken, result.refreshToken);

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'Login successful',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      data: {
        user: {
          ...result.user,
          name: `${result.user.firstName} ${result.user.lastName}`,
          email: result.user.email,
          roles: [result.user.role],
        },
      },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@User() user: AuthenticatedUser, @Res() res: Response) {
    await this.authService.logout(user._id);

    // Clear auth cookies
    clearAuthCookies(res);

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'Logout successful',
    });
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @User() user: AuthenticatedUser,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token as string;
    const tokens = await this.authService.refreshTokens(
      user._id,
      refreshToken,
    );

    // Set new auth cookies
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'Tokens refreshed successfully',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async getProfile(@User() user: AuthenticatedUser, @Res() res: Response) {
    // Get full user data from the database
    const fullUser = await this.authService.getUserById(user._id);

    if (!fullUser) {
      return res.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'User not found',
      });
    }

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'Profile retrieved successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          name: `${fullUser.firstName} ${fullUser.lastName}`,
          roles: [fullUser.role],
        },
      },
    });
  }
}
