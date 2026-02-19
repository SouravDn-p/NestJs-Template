import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface FormattedResponse<T> {
  statusCode: number;
  timestamp: string;
  message: string;
  path: string;
  data?: T;
}

interface ServiceResponse<T> {
  data: T;
  message: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  FormattedResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<FormattedResponse<T>> {
    const httpCtx = context.switchToHttp();
    const response = httpCtx.getResponse<Response>();
    const request = httpCtx.getRequest<Request>();

    return next.handle().pipe(
      map((data: T) => {
        // Check if the data contains a custom message (from services)
        let message = 'Request successful';
        let responseData: T | undefined = data;

        // If data has the structure of our ServiceResponse, extract message and actual data
        if (
          data &&
          typeof data === 'object' &&
          'message' in data &&
          'data' in data
        ) {
          const serviceResponse = data as ServiceResponse<unknown>;
          message = serviceResponse.message;
          responseData = serviceResponse.data as T;
        }

        return {
          statusCode: response.statusCode,
          timestamp: new Date().toISOString(),
          message: message,
          path: request.url,
          ...(responseData !== undefined &&
            responseData !== null && { data: responseData }),
        };
      }),
    );
  }
}
