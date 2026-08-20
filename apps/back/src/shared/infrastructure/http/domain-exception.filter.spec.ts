import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { CapacityExceededException } from '../../domain/errors/capacity-exceeded.exception';
import { EntityNotFoundException } from '../../domain/entity-not-found.exception';
import { DomainExceptionFilter } from './domain-exception.filter';

function responseDouble() {
  const response = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;

  return { host, response };
}

describe('DomainExceptionFilter', () => {
  it('returns a generic, non-cacheable capacity response with retry guidance', () => {
    const { host, response } = responseDouble();

    new DomainExceptionFilter().catch(new CapacityExceededException(19), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(response.setHeader).toHaveBeenNthCalledWith(1, 'Cache-Control', 'no-store');
    expect(response.setHeader).toHaveBeenNthCalledWith(2, 'Retry-After', '19');
    expect(response.json).toHaveBeenCalledWith({
      code: 'PDF_CAPACITY_EXCEEDED',
      message: 'PDF processing capacity is currently full',
    });
  });

  it('marks other domain errors non-cacheable without changing their API body', () => {
    const { host, response } = responseDouble();
    const exception = new EntityNotFoundException('Document', 'missing');

    new DomainExceptionFilter().catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(response.json).toHaveBeenCalledWith({
      code: 'ENTITY_NOT_FOUND',
      message: 'Document with id missing was not found',
    });
  });
});
