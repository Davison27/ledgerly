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
};

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      STATUS_BY_CODE[exception.code] ?? HttpStatus.UNPROCESSABLE_ENTITY;
    response.status(status).json({
      code: exception.code,
      message: exception.message,
    });
  }
}
