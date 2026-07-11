import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Permite que el frontend (Vite) consuma la API en desarrollo
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  });

  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Backend escuchando en http://localhost:${port}/api`);
}

void bootstrap();
