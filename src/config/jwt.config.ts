import { registerAs } from '@nestjs/config';

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;

  adminAccessSecret: string;
  adminRefreshSecret: string;

  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export default registerAs<JwtConfig>(
  'jwt',
  (): JwtConfig => {
    const requireSecret = (name: string, value: string | undefined, fallback: string) => {
      if (value && value.length > 0) return value;
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Missing required env: ${name}`);
      }
      return fallback;
    };

    return {
      accessSecret: requireSecret('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET, 'dev-only-access-secret'),
      refreshSecret: requireSecret('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET, 'dev-only-refresh-secret'),

      adminAccessSecret: requireSecret(
        'ADMIN_JWT_ACCESS_SECRET',
        process.env.ADMIN_JWT_ACCESS_SECRET,
        'dev-only-admin-access-secret',
      ),
      adminRefreshSecret: requireSecret(
        'ADMIN_JWT_REFRESH_SECRET',
        process.env.ADMIN_JWT_REFRESH_SECRET,
        'dev-only-admin-refresh-secret',
      ),

      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    };
  },
);
