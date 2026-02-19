import { UserRole } from './user.schema';

export interface CreateUserResponse {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}

export interface SafeUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  image: string | null;
  // refreshToken is removed for security
}

export interface UserCredentials {
  email: string;
  password: string;
}
