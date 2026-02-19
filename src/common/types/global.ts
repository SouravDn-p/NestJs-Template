export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export interface JwtUser {
  id: string;
  email: string;
  role: UserRole;
}
