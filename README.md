# NestJS Template with MongoDB

A comprehensive NestJS starter template with MongoDB integration, JWT authentication, and best practices.

## Features

- **NestJS**: Modern, powerful Node.js framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **JWT Authentication**: Secure authentication with access and refresh tokens
- **Cookie-based Session Management**: Secure token storage
- **Password Hashing**: Bcrypt implementation for secure password storage
- **Role-based Access Control**: User roles and permissions
- **Environment Configuration**: Configurable settings with @nestjs/config
- **TypeScript**: Type-safe development
- **ESLint & Prettier**: Code linting and formatting
- **Testing**: Unit and e2e testing with Jest

## Tech Stack

- **Node.js**: JavaScript runtime environment
- **NestJS**: Progressive Node.js framework
- **TypeScript**: Superset of JavaScript with static typing
- **MongoDB**: Document-based NoSQL database
- **Mongoose**: MongoDB object modeling for Node.js
- **JWT**: JSON Web Token for authentication
- **Passport**: Authentication middleware
- **Bcrypt**: Password hashing library
- **Cookie-parser**: Cookie parsing middleware

## Project Structure

```
src/
├── common/                 # Common utilities, decorators, guards, filters
│   ├── constants/          # Error codes and constants
│   ├── decorators/         # Custom decorators
│   ├── filters/            # Exception filters
│   ├── guards/             # Authentication guards
│   ├── interceptors/       # Response interceptors
│   └── utils/              # Utility functions
├── config/                 # Configuration files
│   ├── app.config.ts       # Application configuration
│   ├── auth.config.ts      # Authentication configuration
│   ├── config.module.ts    # Configuration module
│   └── database.config.ts  # Database configuration
├── infrastructure/         # Infrastructure modules
│   └── database/           # Database configuration
├── modules/                # Feature modules
│   ├── auth/               # Authentication module
│   │   ├── dto/            # Data transfer objects
│   │   ├── guards/         # Authentication guards
│   │   ├── strategies/     # Passport strategies
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   └── user/               # User module
│       ├── dto/            # Data transfer objects
│       ├── schemas/        # Mongoose schemas
│       ├── user.module.ts
│       ├── user.repository.ts
│       └── user.service.ts
├── app.controller.ts       # Main application controller
├── app.module.ts           # Main application module
├── app.service.ts          # Main application service
└── main.ts                 # Application entry point
```

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd nestjs-template
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration:

   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/nestjs-template

   # JWT Configuration
   ACCESS_TOKEN_SECRET=your_access_token_secret
   ACCESS_TOKEN_EXPIRATION=15m
   REFRESH_TOKEN_SECRET=your_refresh_token_secret
   REFRESH_TOKEN_EXPIRATION=7d

   # Bcrypt Salt Rounds
   BCRYPT_SALT_OR_ROUND=10
   ```

## Running the Application

### Development

```bash
# Watch mode
npm run start:dev
```

### Production

```bash
# Build the application
npm run build

# Run production build
npm run start:prod
```

### Other Commands

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:cov
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login with email and password
- `POST /auth/logout` - Logout and clear tokens
- `POST /auth/refresh` - Refresh access token
- `GET /auth/profile` - Get current user profile

### Example Request

```bash
# Register a new user
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

## Environment Variables

| Variable                   | Description                             | Default                                     |
| -------------------------- | --------------------------------------- | ------------------------------------------- |
| `MONGODB_URI`              | MongoDB connection string               | `mongodb://localhost:27017/nestjs-template` |
| `ACCESS_TOKEN_SECRET`      | Secret for JWT access tokens            | `default_access_token_secret`               |
| `ACCESS_TOKEN_EXPIRATION`  | Access token expiration time            | `15m`                                       |
| `REFRESH_TOKEN_SECRET`     | Secret for JWT refresh tokens           | `default_refresh_token_secret`              |
| `REFRESH_TOKEN_EXPIRATION` | Refresh token expiration time           | `7d`                                        |
| `BCRYPT_SALT_OR_ROUND`     | Bcrypt salt rounds for password hashing | `10`                                        |

## Database Models

### User Model

- `_id`: ObjectId (Primary Key)
- `email`: String (Required, Unique)
- `password`: String (Required, Hashed)
- `refreshToken`: String (Optional, Hashed)
- `role`: String (Enum: 'admin', 'user', 'moderator'; Default: 'user')
- `isActive`: Boolean (Default: true)
- `timestamps`: createdAt, updatedAt

## Security Features

- Passwords are hashed using bcrypt before storage
- JWT tokens with configurable expiration
- Refresh token rotation for enhanced security
- Cookie-based token storage with HttpOnly flag
- Input validation using class-validator
- Role-based access control

## Testing

The application includes unit and e2e tests:

- Unit tests: Test individual components in isolation
- E2E tests: Test the full application flow

Run tests with:

```bash
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run test:cov      # Coverage report
```

## Deployment

For production deployment:

1. Ensure all environment variables are properly set
2. Use a production-grade MongoDB instance
3. Configure proper security measures (SSL, firewalls, etc.)
4. Set up monitoring and logging
5. Use a process manager like PM2 for production

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
