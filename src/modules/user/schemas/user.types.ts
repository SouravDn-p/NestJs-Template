export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

// User type without password for security
export interface UserWithoutPassword {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  refreshToken?: string;
}
