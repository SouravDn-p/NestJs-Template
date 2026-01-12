# Team Convention Guidelines

## Project Overview

This document outlines the coding standards, development practices, and team conventions for the NestJS with MongoDB template project. All team members are expected to follow these guidelines to ensure consistency, maintainability, and code quality.

## Code Style and Formatting

### TypeScript/JavaScript Standards

1. **Naming Conventions**:
   - Use PascalCase for classes, interfaces, and decorators: `UserService`, `JwtAuthGuard`
   - Use camelCase for variables, functions, and methods: `getUserById`, `accessToken`
   - Use UPPER_SNAKE_CASE for constants: `ACCESS_TOKEN_SECRET`, `USER_ROLES`
   - Use kebab-case for file names: `user.service.ts`, `auth.controller.ts`

2. **File Organization**:
   - Each file should contain only one primary class/export
   - Import statements should be grouped in the following order:
     - Node.js built-in modules
     - External libraries (@nestjs/\*, mongoose, etc.)
     - Internal modules (~/config, ~/common, etc.)
     - Relative imports (../, ./)
   - Group related imports with blank lines

3. **Code Formatting**:
   - Use 2 spaces for indentation (not tabs)
   - Use single quotes for strings, except when the string contains single quotes
   - Always use semicolons
   - Maximum line length of 100 characters
   - Use trailing commas in object/array literals where appropriate

### Example:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { UserService } from '../user/user.service';
import { User } from '../user/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...result } = user.toObject();
    return result;
  }
}
```

## Architecture and Project Structure

### Module Organization

1. **Feature Modules**: Organize code by features rather than by technical role
2. **Layered Architecture**:
   - Controllers handle HTTP requests
   - Services contain business logic
   - Schemas define data models
   - DTOs handle data validation
   - Guards and interceptors handle cross-cutting concerns

3. **File Structure**:

```
src/
├── common/                 # Shared utilities and cross-cutting concerns
│   ├── constants/          # Error codes, enums, and constants
│   ├── decorators/         # Custom decorators
│   ├── filters/            # Exception filters
│   ├── guards/             # Authentication and authorization guards
│   ├── interceptors/       # Request/response interceptors
│   └── utils/              # Utility functions
├── config/                 # Configuration files and modules
├── infrastructure/         # Database and external service configuration
├── modules/                # Feature modules
│   └── {feature}/          # Each feature in its own directory
│       ├── dto/            # Data Transfer Objects
│       ├── schemas/        # Data models and schemas
│       ├── guards/         # Feature-specific guards (if needed)
│       ├── strategies/     # Passport strategies (for auth module)
│       ├── {feature}.module.ts
│       ├── {feature}.service.ts
│       └── {feature}.controller.ts
├── app.module.ts           # Main application module
└── main.ts                 # Application entry point
```

### Naming Conventions for Files

- Controllers: `{name}.controller.ts`
- Services: `{name}.service.ts`
- Modules: `{name}.module.ts`
- Schemas: `{name}.schema.ts`
- DTOs: `{action}-{name}.dto.ts` (e.g., `create-user.dto.ts`)
- Guards: `{name}.guard.ts`
- Interceptors: `{name}.interceptor.ts`
- Filters: `{name}.filter.ts`

## TypeScript Best Practices

### Type Safety

1. Always specify types for function parameters and return values
2. Use interfaces for complex object structures
3. Use enums for fixed sets of values
4. Avoid using `any` type unless absolutely necessary
5. Use strict null checks (`strictNullChecks: true`)

### Dependency Injection

1. Use constructor-based dependency injection
2. Mark dependencies as private unless they need to be accessed externally
3. Use interface injection when appropriate for better testability

### Error Handling

1. Use NestJS built-in exceptions where possible (`BadRequestException`, `UnauthorizedException`, etc.)
2. Create custom exceptions when needed by extending base exceptions
3. Always log errors appropriately
4. Return consistent error response formats

### Example:

```typescript
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';

@Injectable()
export class UserService {
  async createUser(email: string, password: string): Promise<User> {
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    try {
      // Create user logic here
      return user;
    } catch (error) {
      // Log error appropriately
      throw new InternalServerErrorException('Failed to create user');
    }
  }
}
```

## Database and Mongoose Guidelines

### Schema Design

1. Always define Mongoose schemas using TypeScript classes with `@nestjs/mongoose`
2. Use `@Prop` decorator for schema fields
3. Define indexes where appropriate for performance
4. Use virtual fields when needed for computed properties
5. Implement pre/post hooks for data validation and transformation

### Example:

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Pre-save hook for password hashing
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  // Hashing logic here
  next();
});
```

## Testing Guidelines

### Test Structure

1. Use Jest as the testing framework
2. Write unit tests for all services and utilities
3. Write e2e tests for critical user flows
4. Maintain at least 80% code coverage

### Test File Naming

- Unit tests: `{name}.spec.ts` (e.g., `user.service.spec.ts`)
- E2E tests: `{name}.e2e-spec.ts` (e.g., `auth.e2e-spec.ts`)

### Testing Best Practices

1. Use `TestBed` for unit tests
2. Mock external dependencies
3. Test both positive and negative scenarios
4. Use descriptive test names
5. Follow AAA pattern (Arrange, Act, Assert)

### Example:

```typescript
describe('UserService', () => {
  let service: UserService;
  let userModel: Model<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userModel = module.get<Model<User>>(getModelToken(User.name));
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(userModel, 'create').mockResolvedValueOnce({
        email: 'test@example.com',
        password: 'hashedPassword',
      } as any);

      // Act
      const result = await service.createUser(createUserDto);

      // Assert
      expect(result.email).toBe('test@example.com');
    });
  });
});
```

## Git Workflow

### Branch Naming

- Feature branches: `feature/{short-description}` (e.g., `feature/user-authentication`)
- Bug fix branches: `fix/{short-description}` (e.g., `fix/password-validation`)
- Hotfix branches: `hotfix/{short-description}` (e.g., `hotfix/security-patch`)

### Commit Messages

1. Use conventional commits format:
   - `feat: add new authentication method`
   - `fix: resolve user registration issue`
   - `docs: update README with installation steps`
   - `test: add unit tests for user service`
   - `refactor: improve code structure in auth module`

2. Keep commit messages concise but descriptive
3. Use imperative mood ("Add feature" not "Added feature")
4. Limit first line to 50 characters
5. Use body for detailed explanation if needed

### Pull Request Process

1. Create a descriptive PR title and description
2. Link related issues if applicable
3. Request code reviews from team members
4. Address all feedback before merging
5. Use squash and merge for feature branches

## Environment and Configuration

### Environment Variables

1. Store all environment-specific configuration in `.env` files
2. Never commit `.env` files to version control
3. Provide `.env.example` file with default values
4. Use `@nestjs/config` module for configuration management
5. Validate required environment variables at startup

### Example:

```typescript
// config/auth.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwt: {
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
    accessTokenExpiration: process.env.ACCESS_TOKEN_EXPIRATION || '15m',
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    refreshTokenExpiration: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
  },
  bcryptSaltOrRound: parseInt(process.env.BCRYPT_SALT_OR_ROUND || '10', 10),
}));
```

## Security Guidelines

### Authentication and Authorization

1. Always use JWT with refresh tokens for stateless authentication
2. Store tokens in HttpOnly, Secure cookies
3. Implement token expiration and refresh mechanisms
4. Hash passwords using bcrypt
5. Validate user roles and permissions appropriately

### Input Validation

1. Use `class-validator` and `class-transformer` for DTO validation
2. Validate all user inputs on both frontend and backend
3. Sanitize inputs where necessary
4. Use parameter decorators for automatic validation

### Example:

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

## Performance Considerations

### Database Queries

1. Always index frequently queried fields
2. Use pagination for large datasets
3. Avoid N+1 query problems
4. Use projections to limit returned fields when possible
5. Implement caching for frequently accessed data

### API Optimization

1. Use appropriate HTTP status codes
2. Implement proper request/response validation
3. Use compression middleware for large responses
4. Implement rate limiting where appropriate
5. Optimize API endpoints for minimal database calls

## Documentation Standards

### Code Documentation

1. Document all public methods and classes with JSDoc comments
2. Explain complex logic with inline comments
3. Keep comments up to date with code changes
4. Use clear and concise language

### Example:

```typescript
/**
 * Validates user credentials and returns authenticated user data
 * @param email - User's email address
 * @param password - User's plain text password
 * @returns User object without password if valid, null otherwise
 * @throws UnauthorizedException if credentials are invalid
 */
async validateUser(email: string, password: string): Promise<User | null> {
  // Implementation here
}
```

## Code Review Guidelines

### Review Process

1. Review all code changes before merging
2. Check for adherence to coding standards
3. Verify proper error handling
4. Ensure tests are comprehensive
5. Consider performance implications
6. Verify security best practices

### Review Checklist

- [ ] Code follows established patterns and conventions
- [ ] Proper error handling implemented
- [ ] Security best practices followed
- [ ] Tests are comprehensive and passing
- [ ] Performance considerations addressed
- [ ] Documentation is up to date
- [ ] Code is clean and maintainable

## Deployment Guidelines

### Pre-deployment Checklist

1. All tests pass (unit and e2e)
2. Code has been reviewed and approved
3. Environment variables are properly configured
4. Database migrations are applied
5. Security measures are in place
6. Monitoring and logging are configured

### Production Considerations

1. Use environment-specific configurations
2. Implement proper logging and monitoring
3. Set up automated backups
4. Configure SSL certificates
5. Implement proper error reporting
6. Use process managers (PM2) for production

## Code Quality Improvements

Recent updates to the codebase include:

- Fixed unused variable warnings (e.g., properly handling `_password` variables with eslint-disable comments)
- Improved TypeScript type safety
- Enhanced ESLint configuration compliance
- Better code maintainability practices

These improvements ensure cleaner code without affecting the core functionality.

## Common Pitfalls to Avoid

1. **Never store sensitive data in code**: Use environment variables
2. **Avoid complex nested callbacks**: Use async/await or promises
3. **Don't return passwords**: Always exclude password fields from responses
4. **Avoid tight coupling**: Use dependency injection and interfaces
5. **Don't ignore errors**: Always handle and log errors appropriately
6. **Avoid large transactions**: Break down complex operations
7. **Don't expose internal IDs**: Use appropriate identifiers in responses
8. **Avoid hardcoded values**: Use configuration for all configurable values

## Communication and Collaboration

### Code Ownership

1. Shared ownership of codebase
2. Collaborative approach to problem-solving
3. Regular knowledge sharing sessions
4. Pair programming for complex features

### Issue Tracking

1. Use descriptive issue titles and descriptions
2. Assign appropriate labels and priorities
3. Break down large features into smaller tasks
4. Update issue status regularly

## Continuous Integration/Deployment

### CI/CD Pipeline

1. Automated testing on every commit
2. Code quality checks (linting, security scans)
3. Automated deployment to staging
4. Manual approval for production deployment
5. Rollback procedures in place

This team convention document should be updated as the project evolves and new best practices are identified. All team members should review and contribute to these guidelines regularly.
