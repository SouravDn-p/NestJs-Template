# Authentication System Documentation

This document describes the authentication system implemented in the NestJS backend application.

## Table of Contents
- [Overview](#overview)
- [Token Structure](#token-structure)
- [Login Process](#login-process)
- [Register Process](#register-process)
- [Refresh Token Process](#refresh-token-process)
- [Authorization & Role-Based Access Control](#authorization--role-based-access-control)
- [API Endpoints](#api-endpoints)
- [API Response Structure](#api-response-structure)
- [Security Features](#security-features)
- [Error Handling](#error-handling)

## Overview

The authentication system uses JWT (JSON Web Tokens) with a dual-token approach:
- **Access Token**: Short-lived (15 minutes) for API authorization
- **Refresh Token**: Long-lived (7 days) for generating new access tokens
- Tokens are stored in HTTP-only cookies for enhanced security

## Token Structure

### Access Token
- **Lifetime**: 15 minutes
- **Purpose**: API authorization
- **Storage**: HTTP-only cookie (`accessToken`)
- **Algorithm**: HS256
- **Claims**: `sub` (user ID), `email`, `role`

### Refresh Token
- **Lifetime**: 7 days
- **Purpose**: Generate new access tokens
- **Storage**: HTTP-only cookie (`refreshToken`) and hashed in database
- **Algorithm**: HS256
- **Claims**: `sub` (user ID), `email`, `role`

## Login Process

### Flow
1. User sends credentials (email, password) to `/auth/login`
2. Server validates credentials against the database
3. If valid, server generates access and refresh tokens
4. Server hashes refresh token and stores in database
5. Server sets both tokens in HTTP-only cookies
6. Server returns access token and user data (without refresh token)

### Request
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "user_password"
}
```

### Response
```json
{
  "statusCode": 200,
  "timestamp": "2026-02-18T09:00:00.000Z",
  "message": "Login successful",
  "path": "/auth/login",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "69949188a9858535c61d2e72",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "user",
      "image": null
    }
  }
}
```

### Cookies Set
- `accessToken`: HTTP-only, secure, SameSite=strict, expires in 15 minutes
- `refreshToken`: HTTP-only, secure, SameSite=strict, expires in 7 days

## Register Process

### Flow
1. User sends registration data to `/auth/register`
2. Server validates the input
3. Server checks if email already exists
4. If not, server creates a new user with hashed password
5. Server returns success response

### Request
```http
POST /auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "secure_password",
  "role": "user"
}
```

### Response
```json
{
  "statusCode": 201,
  "timestamp": "2026-02-18T09:00:00.000Z",
  "message": "User created successfully",
  "path": "/auth/register",
  "data": {
    "_id": "69949188a9858535c61d2e72",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "role": "user",
    "image": null
  }
}
```

## Refresh Token Process

### Flow
1. Access token expires (after 15 minutes)
2. Client automatically sends refresh request to `/auth/refresh`
3. Server validates refresh token from cookie against database
4. Server generates new access and refresh tokens (token rotation)
5. Server hashes new refresh token and stores in database
6. Server sets new tokens in HTTP-only cookies
7. Server returns new access token

### Request
```http
POST /auth/refresh
Cookie: refreshToken=<current_refresh_token>
```

### Response
```json
{
  "statusCode": 200,
  "timestamp": "2026-02-18T09:15:00.000Z",
  "message": "Token refreshed successfully",
  "path": "/auth/refresh",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Cookies Updated
- `accessToken`: New token, expires in 15 minutes
- `refreshToken`: New token, expires in 7 days (token rotation)

### Refresh Token Expiration Handling
- If refresh token is expired or invalid, server returns 401 Unauthorized
- Client should redirect user to login page
- Refresh tokens are invalidated when user logs out or after 7 days

## Authorization & Role-Based Access Control

The system implements role-based access control with the following roles:

### User Roles
- `user`: Standard user role
- `admin`: Administrator role with elevated permissions

### Protected Routes
Routes can be protected using JWT guards and role decorators:

```typescript
@Get('admin-data')
@UseGuards(AuthGuard('jwt'))
@Roles(UserRole.ADMIN)
async getAdminData() {
  // Only accessible by admin users
}
```

### Authorization Flow
1. User makes request to protected endpoint
2. Server extracts access token from `accessToken` cookie
3. Server validates token signature and expiration
4. Server verifies user exists in database
5. If route requires specific role, server checks user role
6. If all validations pass, server processes request
7. If any validation fails, server returns 401/403 error

## API Endpoints

### Authentication Endpoints
| Method | Endpoint | Description | Requires Auth |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Authenticate user | No |
| POST | `/auth/refresh` | Refresh access token | No (uses refresh token) |
| POST | `/auth/logout` | Log out user | Yes (access token) |

### User Endpoints
| Method | Endpoint | Description | Requires Auth |
|--------|----------|-------------|---------------|
| GET | `/users` | Get all users | Yes (access token) |
| GET | `/users/admin` | Get admin users | Yes (access token + admin role) |

## API Response Structure

All API responses follow a consistent structure:

```json
{
  "statusCode": 200,
  "timestamp": "2026-02-18T09:00:00.000Z",
  "message": "Success message",
  "path": "/endpoint/path",
  "data": {
    // Actual response data
  }
}
```

### Response Fields
- `statusCode`: HTTP status code (200, 201, 400, 401, 403, 500, etc.)
- `timestamp`: ISO 8601 formatted timestamp
- `message`: Human-readable message about the operation
- `path`: The requested endpoint path
- `data`: Actual response data (can be null/undefined for some operations)

## Security Features

### Token Security
- **HTTP-only cookies**: Prevents XSS attacks
- **Secure flag**: Tokens only sent over HTTPS
- **SameSite=strict**: Prevents CSRF attacks
- **Hashed storage**: Refresh tokens hashed in database
- **Token rotation**: New refresh tokens on each refresh

### Password Security
- **BCrypt hashing**: Passwords stored with salt and hash
- **Salt rounds**: 10 rounds for strong security

### Additional Security
- **Rate limiting**: Prevents brute force attacks
- **Input validation**: All inputs validated and sanitized
- **Error masking**: Generic error messages to prevent information disclosure

## Error Handling

### Common Error Responses

#### Unauthorized (401)
```json
{
  "success": false,
  "message": "Unauthorized",
  "meta": {
    "statusCode": 401,
    "error": "UnauthorizedException"
  }
}
```

#### Forbidden (403)
```json
{
  "success": false,
  "message": "Forbidden",
  "meta": {
    "statusCode": 403,
    "error": "ForbiddenException"
  }
}
```

#### Validation Error (400)
```json
{
  "success": false,
  "message": "Bad Request",
  "meta": {
    "statusCode": 400,
    "error": "BadRequestException"
  },
  "error": {
    // Validation error details
  }
}
```

### Token-Specific Errors
- **Expired access token**: Automatically triggers refresh process
- **Invalid refresh token**: User redirected to login
- **Revoked refresh token**: User redirected to login
- **Malformed token**: Returns 401 Unauthorized