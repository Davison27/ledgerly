import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '../../domain/domain.exception';

const STATUS_BY_CODE: Record<string, number> = {
  ENTITY_NOT_FOUND: HttpStatus.NOT_FOUND,
  UNIQUE_CONSTRAINT: HttpStatus.CONFLICT,
  INVALID_VALUE: HttpStatus.BAD_REQUEST,
  RESOURCE_IN_USE: HttpStatus.CONFLICT,
  BOOTSTRAP_UNAVAILABLE: HttpStatus.FORBIDDEN,
  SELF_ACCESS_CHANGE: HttpStatus.UNPROCESSABLE_ENTITY,
  LAST_ADMIN: HttpStatus.UNPROCESSABLE_ENTITY,
  PDF_CAPACITY_EXCEEDED: HttpStatus.SERVICE_UNAVAILABLE,
  PDF_PAGE_LIMIT_EXCEEDED: HttpStatus.UNPROCESSABLE_ENTITY,
  INVALID_DATE_RANGE: HttpStatus.UNPROCESSABLE_ENTITY,
  DATE_RANGE_LIMIT_EXCEEDED: HttpStatus.UNPROCESSABLE_ENTITY,
  LIST_LIMIT_EXCEEDED: HttpStatus.UNPROCESSABLE_ENTITY,
};

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      STATUS_BY_CODE[exception.code] ?? HttpStatus.UNPROCESSABLE_ENTITY;
    if (exception.code === 'PDF_CAPACITY_EXCEEDED') {
      response.setHeader(
        'Retry-After',
        String((exception as unknown as { retryAfterSeconds: number }).retryAfterSeconds),
      );
      response.setHeader('Cache-Control', 'no-store');
    }
    response.status(status).json({
      code: exception.code,
      message: exception.message,
    });
  }
}
