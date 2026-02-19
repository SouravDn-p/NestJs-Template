import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../response/api-response';

interface ExceptionResponse {
  message: string;
  error?: string;
  statusCode?: number;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    // Handle NestJS HttpExceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else {
        const exceptionRes = res as ExceptionResponse;
        message = exceptionRes.message || message;
      }

      return response.status(status).json(
        ApiResponse.error(message, {
          statusCode: status,
          error: exception.name,
        }),
      );
    }

    // Unknown error fallback
    this.logger.error(
      message,
      exception instanceof Error ? exception.stack : String(exception),
    );

    return response.status(status).json(
      ApiResponse.error(message, {
        error: String(exception),
      }),
    );
  }
}
