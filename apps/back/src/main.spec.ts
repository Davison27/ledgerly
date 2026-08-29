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
