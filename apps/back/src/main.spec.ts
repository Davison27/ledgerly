import { ValidationPipe } from '@nestjs/common';

jest.mock('./app.module', () => ({ AppModule: class AppModule {} }));

import { configureHttpBoundary } from './main';

function appDouble() {
  return {
    set: jest.fn(),
    use: jest.fn(),
    useBodyParser: jest.fn(),
    enableCors: jest.fn(),
    setGlobalPrefix: jest.fn(),
    useGlobalPipes: jest.fn(),
    useGlobalFilters: jest.fn(),
  };
}

describe('configureHttpBoundary', () => {
  it('configures production proxy trust, exact CORS, validation, and no-store middleware', () => {
    const app = appDouble();

    configureHttpBoundary(app as never, {
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://app.ledgerly.dev/',
      TRUST_PROXY: 'true',
    });

    expect(app.set).toHaveBeenCalledWith('trust proxy', 1);
    expect(app.enableCors).toHaveBeenCalledWith({
      origin: 'https://app.ledgerly.dev',
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept', 'X-CSRF-Token'],
    });
    expect(app.useBodyParser).toHaveBeenNthCalledWith(1, 'json', { limit: '256kb' });
    expect(app.useBodyParser).toHaveBeenNthCalledWith(2, 'urlencoded', {
      extended: false,
      limit: '256kb',
      parameterLimit: 100,
    });
    expect(app.setGlobalPrefix).toHaveBeenCalledWith('api');

    const [pipe] = app.useGlobalPipes.mock.calls[0] as [ValidationPipe];
    expect(pipe).toBeInstanceOf(ValidationPipe);
    expect((pipe as unknown as { validatorOptions: Record<string, unknown> }).validatorOptions).toMatchObject({
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect((pipe as unknown as { isDetailedOutputDisabled: boolean }).isDetailedOutputDisabled).toBe(true);

    const useCalls = app.use.mock.calls as unknown[][];
    const noStore = useCalls[1]?.[0] as (
      request: unknown,
      response: { setHeader: jest.Mock },
      next: jest.Mock,
    ) => void;
    const response = { setHeader: jest.fn() };
    const next = jest.fn();
    noStore({}, response, next);
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('sets proxy trust to false outside production', () => {
    const app = appDouble();

    configureHttpBoundary(app as never, {
      NODE_ENV: 'test',
      FRONTEND_URL: 'http://localhost:5173',
      TRUST_PROXY: 'false',
    });

    expect(app.set).toHaveBeenCalledWith('trust proxy', false);
  });

  it.each([
    { NODE_ENV: 'production', FRONTEND_URL: 'http://app.ledgerly.dev', TRUST_PROXY: 'true' },
    { NODE_ENV: 'production', FRONTEND_URL: 'https://app.ledgerly.dev', TRUST_PROXY: 'false' },
  ])('fails closed for unsafe production transport configuration', (environment) => {
    expect(() => configureHttpBoundary(appDouble() as never, environment)).toThrow();
  });
});
