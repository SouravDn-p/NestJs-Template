# Sourav Portfolio Backend

Welcome to the backend API for Sourav Portfolio, built with NestJS.

## Table of Contents
- [Features](#features)
- [Technologies](#technologies)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Authentication](#authentication)
- [API Documentation](#api-documentation)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)

## Features

- 🔐 **Secure Authentication System** with JWT access and refresh tokens
- 🛡️ **Role-Based Access Control** (RBAC) for admin and user roles
- 🍪 **HTTP-only Cookie Storage** for secure token management
- 🔁 **Automatic Token Refresh** with token rotation
- 📊 **RESTful API Design**
- 🛡️ **Input Validation** and sanitization
- 📝 **Structured Response Format**
- 🔄 **Database Integration** with MongoDB

## Technologies

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [TypeScript](https://www.typescriptlang.org/) - Typed superset of JavaScript
- [MongoDB](https://www.mongodb.com/) - NoSQL database
- [Mongoose](https://mongoosejs.com/) - MongoDB object modeling
- [JWT](https://jwt.io/) - JSON Web Tokens for authentication
- [Passport](http://www.passportjs.org/) - Authentication middleware
- [Cookie Parser](https://www.npmjs.com/package/cookie-parser) - Parse HTTP request cookies

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sourav-portfolio-backend-nestjs
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see [Environment Variables](#environment-variables))

4. Run the application:
```bash
npm run start:dev
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=5000
JWT_ACCESS_SECRET="your_access_token_secret_here"
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET="your_refresh_token_secret_here"
JWT_REFRESH_EXPIRES_IN=7d
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name
NODE_ENV=development
```

## Authentication

The application implements a robust authentication system with:

- **Dual Token Approach**: Access tokens (15 min) and refresh tokens (7 days)
- **Secure Storage**: Tokens stored in HTTP-only cookies
- **Role-Based Access**: Different permissions for admin and user roles
- **Token Rotation**: New refresh tokens issued on each refresh
- **Password Hashing**: BCrypt for secure password storage

For detailed information about the authentication system, see [AUTHENTICATION.md](./AUTHENTICATION.md).

### Key Endpoints

- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout
- `GET /users` - Get all users (requires authentication)
- `GET /users/admin` - Get admin users (requires admin role)

## API Documentation

### Authentication Flow

1. **Register**: Create a new user account
2. **Login**: Authenticate with credentials, receive tokens in cookies
3. **Protected Routes**: Access secured endpoints with valid access token
4. **Token Refresh**: Automatically refresh access token when expired
5. **Logout**: Invalidate tokens and clear cookies

### Response Format

All API responses follow this structure:

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

## Running the Application

- Development mode: `npm run start:dev`
- Production mode: `npm run start:prod`
- Build: `npm run build`
- Test: `npm run test`

## Project Structure

```
src/
├── app.module.ts          # Main application module
├── main.ts                # Application entry point
├── common/                # Shared utilities
│   ├── decorators/        # Custom decorators
│   ├── filters/           # Exception filters
│   ├── guards/            # Authentication guards
│   ├── interceptors/      # Response interceptors
│   └── response/          # Response interfaces
├── config/                # Configuration files
├── modules/               # Feature modules
│   ├── auth/              # Authentication module
│   │   ├── strategies/    # JWT strategies
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   └── users/             # User management module
│       ├── schemas/       # User schema
│       ├── user-dto/      # DTOs
│       ├── users.controller.ts
│       ├── users.service.ts
│       └── users.module.ts
```

## License

MIT License