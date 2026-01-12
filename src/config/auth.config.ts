import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwt: {
    accessTokenSecret:
      process.env.ACCESS_TOKEN_SECRET || 'default_access_token_secret',
    accessTokenExpiration: process.env.ACCESS_TOKEN_EXPIRATION || '15m', // 15 minutes
    refreshTokenSecret:
      process.env.REFRESH_TOKEN_SECRET || 'default_refresh_token_secret',
    refreshTokenExpiration: process.env.REFRESH_TOKEN_EXPIRATION || '7d', // 7 days
  },
  bcryptSaltOrRound: parseInt(process.env.BCRYPT_SALT_OR_ROUND || '10', 10),
}));
