import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './shared/infrastructure/http/domain-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Debe ir antes que cualquier otro app.use()/enableCors()/ruta: si se
  // registra después, no cubre lo ya definido. crossOriginResourcePolicy se
  // relaja a 'cross-origin' porque el backend sirve ficheros (PDFs, fotos de
  // personal) que el front consume desde otro origen (5173 vs 3000); con el
  // 'same-origin' por defecto de helmet, el navegador los bloquearía.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new DomainExceptionFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Backend escuchando en http://localhost:${port}/api`);
}

void bootstrap();
