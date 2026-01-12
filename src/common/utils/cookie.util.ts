import { Response } from 'express';

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  maxAge: number;
  sameSite: 'lax' | 'strict' | 'none';
  path?: string;
}

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
  isSecure: boolean = process.env.NODE_ENV === 'production',
): void => {
  const accessTokenMaxAge = 15 * 60 * 1000; // 15 minutes in milliseconds
  const refreshTokenMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  // Set access token cookie
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isSecure,
    maxAge: accessTokenMaxAge,
    sameSite: 'strict',
    path: '/',
  });

  // Set refresh token cookie
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isSecure,
    maxAge: refreshTokenMaxAge,
    sameSite: 'strict',
    path: '/',
  });
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
};
