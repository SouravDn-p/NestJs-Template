# Authentication System Documentation

## Overview

This NestJS template implements a comprehensive authentication system using JWT (JSON Web Tokens) with refresh tokens, cookie-based storage, and role-based access control. The system provides secure user registration, login, logout, and token refresh functionality.

## Architecture

### Core Components

1. **Auth Module**: Main authentication module containing controllers, services, and strategies
2. **JWT Strategies**: Access token and refresh token validation strategies
3. **Local Strategy**: Username/password authentication using Passport
4. **Guards**: JWT, Refresh token, and Local authentication guards
5. **Cookie Utilities**: Secure cookie handling for token storage

### Authentication Flow

```
User Registration → Hash Password → Create User → Generate Tokens → Store Refresh Token
User Login → Validate Credentials → Generate Tokens → Set Cookies
Token Refresh → Validate Refresh Token → Generate New Tokens → Update Cookies
User Request → Validate Access Token → Authorize → Process Request
User Logout → Clear Refresh Token → Clear Cookies
```

## Implementation Details

### 1. User Registration (`POST /auth/register`)

- Validates input using `RegisterDto`
- Checks for existing user with same email
- Hashes password using bcrypt
- Creates user document in MongoDB
- Generates access and refresh tokens
- Sets secure cookies with tokens
- Returns user information

### 2. User Login (`POST /auth/login`)

- Uses `LocalAuthGuard` with Passport's local strategy
- Validates email and password
- Generates access and refresh tokens
- Sets secure cookies with tokens
- Returns user information

### 3. Token Refresh (`POST /auth/refresh`)

- Uses `RefreshTokenGuard` to validate refresh token
- Verifies refresh token matches stored value in database
- Generates new access and refresh tokens
- Updates stored refresh token
- Sets new secure cookies with tokens

### 4. Profile Access (`GET /auth/profile`)

- Uses `JwtAuthGuard` to validate access token
- Returns authenticated user information
- Includes user ID, email, and role

### 5. Logout (`POST /auth/logout`)

- Uses `JwtAuthGuard` to validate access token
- Clears refresh token from database
- Clears authentication cookies
- Completes logout process

## Security Features

### Password Security

- All passwords are hashed using bcrypt with configurable salt rounds
- Passwords are never stored in plain text
- Password comparison happens in the User schema methods

### Token Security

- Access tokens: Short-lived (default 15 minutes)
- Refresh tokens: Long-lived (default 7 days) but stored in database
- Refresh token rotation: New refresh token generated on each use
- Tokens are stored in HttpOnly, Secure cookies to prevent XSS attacks

### Cookie Security

- HttpOnly: Prevents client-side JavaScript access
- Secure: Only transmitted over HTTPS in production
- SameSite: Prevents CSRF attacks
- Tokens are not accessible to frontend JavaScript

## JWT Configuration

### Access Token

- Secret: Configured via `ACCESS_TOKEN_SECRET` environment variable
- Expiration: Configured via `ACCESS_TOKEN_EXPIRATION` (default: 15m)
- Algorithm: HS256
- Payload: User ID, email, and role

### Refresh Token

- Secret: Configured via `REFRESH_TOKEN_SECRET` environment variable
- Expiration: Configured via `REFRESH_TOKEN_EXPIRATION` (default: 7d)
- Algorithm: HS256
- Payload: User ID, email, and role
- Stored in database for additional validation

## Passport Strategies

### Local Strategy

- Validates email and password credentials
- Uses email as the username field
- Retrieves user with password for comparison
- Throws UnauthorizedException for invalid credentials

### JWT Access Token Strategy

- Extracts token from cookies (`access_token`)
- Validates token signature and expiration
- Verifies user still exists and is active
- Returns user information for request context

### JWT Refresh Token Strategy

- Extracts token from cookies (`refresh_token`)
- Validates token signature and expiration
- Verifies user still exists and is active
- Confirms refresh token matches stored value in database
- Returns user information for request context

## Guards Implementation

### JwtAuthGuard

- Protects routes requiring valid access token
- Used for standard authenticated routes
- Extends Passport's JWT guard

### RefreshTokenGuard

- Protects refresh token endpoint
- Extends Passport's JWT guard with custom strategy
- Validates refresh token specifically

### LocalAuthGuard

- Protects login endpoint
- Extends Passport's local guard
- Handles username/password authentication

## DTOs (Data Transfer Objects)

### RegisterDto

```typescript
{
  email: string; // Required, valid email format
  password: string; // Required, minimum length validation
}
```

### LoginDto

```typescript
{
  email: string; // Required, valid email format
  password: string; // Required
}
```

## User Roles

### Available Roles

- `USER`: Standard user with basic access
- `MODERATOR`: Enhanced permissions (implementation ready)
- `ADMIN`: Full administrative access (implementation ready)

### Role Implementation

- Role-based access control is implemented and ready for use
- Can be extended with custom guards for role-specific permissions

## Cookie Management

### Authentication Cookies

- `access_token`: Stores JWT access token
- `refresh_token`: Stores JWT refresh token
- Both cookies are HttpOnly and secure

### Cookie Utility Functions

- `setAuthCookies()`: Sets both access and refresh token cookies
- `clearAuthCookies()`: Clears authentication cookies on logout

## Error Handling

### Common Authentication Errors

- `ConflictException`: User already exists during registration
- `UnauthorizedException`: Invalid credentials during login
- `UnauthorizedException`: Invalid or expired tokens
- `Error`: User not found or inactive during token validation

### Error Response Format

```json
{
  "statusCode": 400/401/403/409,
  "message": "Error description",
  "error": "Error type"
}
```

## Configuration

### Environment Variables

- `ACCESS_TOKEN_SECRET`: Secret for signing access tokens
- `ACCESS_TOKEN_EXPIRATION`: Access token expiration time
- `REFRESH_TOKEN_SECRET`: Secret for signing refresh tokens
- `REFRESH_TOKEN_EXPIRATION`: Refresh token expiration time
- `BCRYPT_SALT_OR_ROUND`: Salt rounds for password hashing

### Default Values

- Access token: 15 minutes
- Refresh token: 7 days
- Bcrypt salt: 10 rounds

## Security Best Practices

1. **Never expose secrets**: Store all secrets in environment variables
2. **Use HTTPS in production**: Secure cookies only work properly with HTTPS
3. **Validate input**: All user input is validated using DTOs
4. **Hash passwords**: Never store plain text passwords
5. **Token rotation**: Refresh tokens are rotated to prevent abuse
6. **Database validation**: Refresh tokens stored in database for additional validation
7. **Cookie security**: HttpOnly and Secure flags prevent XSS attacks

## Testing Authentication

### Unit Tests

- Service methods for authentication operations
- Token generation and validation
- Password hashing and comparison

### Integration Tests

- Complete authentication flow
- Token refresh functionality
- Logout and session invalidation

## Extending Authentication

### Adding New Roles

1. Update `UserRole` enum in `user.types.ts`
2. Implement role-based guards if needed
3. Add role validation in relevant services

### Adding New Authentication Methods

1. Create new Passport strategy
2. Add new guard extending the strategy
3. Update AuthModule to include new strategy
4. Create new endpoints if needed

### Custom Token Payload

1. Modify JWT payload in `AuthService`
2. Update strategy validation in `validate()` method
3. Update user information extraction as needed

## Troubleshooting

### Common Issues

1. **Token expiration**: Check `ACCESS_TOKEN_EXPIRATION` and `REFRESH_TOKEN_EXPIRATION` settings
2. **Invalid tokens**: Ensure secrets match between token generation and validation
3. **Cookie issues**: Verify that cookies are being set correctly in the browser
4. **Database connection**: Ensure MongoDB is accessible and properly configured

### Debugging Tips

1. Enable NestJS logging to see authentication flow
2. Check environment variables are properly set
3. Verify database contains expected user and token data
4. Use browser developer tools to inspect cookies
