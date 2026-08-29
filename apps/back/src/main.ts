import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './shared/infrastructure/http/domain-exception.filter';
import { JsonLogger } from './shared/infrastructure/observability/json-logger';
import { createRequestContextMiddleware } from './shared/infrastructure/observability/request-context.middleware';

const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:5173';
const JSON_BODY_LIMIT = '256kb';
const URLENCODED_BODY_LIMIT = '256kb';
const URLENCODED_PARAMETER_LIMIT = 100;

function getFrontendOrigin(frontendUrl: string | undefined, isProduction: boolean): string {
  if (isProduction && !frontendUrl) {
    throw new Error('FRONTEND_URL is required in production');
  }

  const parsed = new URL(frontendUrl ?? DEFAULT_FRONTEND_ORIGIN);
  if (
    !(isProduction ? ['https:'] : ['http:', 'https:']).includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(isProduction ? 'FRONTEND_URL must be an HTTPS origin in production' : 'FRONTEND_URL must be an HTTP(S) origin');
  }

  return parsed.origin;
}

function setNoStore(_request: Request, response: Response, next: NextFunction): void {
  response.setHeader('Cache-Control', 'no-store');
  next();
}

export function configureHttpBoundary(
  app: NestExpressApplication,
  environment: NodeJS.ProcessEnv = process.env,
): void {
  const isProduction = environment.NODE_ENV === 'production';
  const frontendOrigin = getFrontendOrigin(environment.FRONTEND_URL, isProduction);

  if (isProduction && environment.TRUST_PROXY !== 'true') {
    throw new Error('TRUST_PROXY must be enabled in production');
  }

  app.set('trust proxy', environment.TRUST_PROXY === 'true' ? 1 : false);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: { action: 'sameorigin' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  app.use(setNoStore);

  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.useBodyParser('urlencoded', {
    extended: false,
    limit: URLENCODED_BODY_LIMIT,
    parameterLimit: URLENCODED_PARAMETER_LIMIT,
  });

  app.use(cookieParser());

  app.enableCors({
    origin: frontendOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'X-CSRF-Token'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: isProduction,
    }),
  );

  app.useGlobalFilters(new DomainExceptionFilter());
}

export async function bootstrap(): Promise<void> {
  const logger = new JsonLogger();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false, logger });
  app.use(createRequestContextMiddleware({ log: (context) => logger.log('http request', context) }));
  configureHttpBoundary(app);
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Backend listening on http://localhost:${port}/api`);
}

if (require.main === module) {
  void bootstrap();
}
