import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwt: {
    accessTokenSecret:
      process.env.JWT_ACCESS_TOKEN_SECRET || 'default_access_token_secret',
    accessTokenExpirationTime: process.env.ACCESS_TOKEN_EXPIRATION_TIME || 3600,
    refreshTokenSecret:
      process.env.JWT_REFRESH_TOKEN_SECRET || 'default_refresh_token_secret',
    refreshTokenExpirationTime:
      process.env.REFRESH_TOKEN_EXPIRATION_TIME || 3600,
    secret: process.env.JWT_SECRET || 'secret',
  },
}));
