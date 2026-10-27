import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import * as cookieParser from 'cookie-parser';
import { HealthService } from './health/health.service';

export function createSwaggerConfig(): Omit<OpenAPIObject, 'paths'> {
  return new DocumentBuilder()
    .setTitle('Giving Day API')
    .setDescription('REST API for the Giving Day volunteer management app')
    .setVersion('0.1.0')
    .build();
}

export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, createSwaggerConfig());
}

export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('docs', app, createSwaggerDocument(app), {
    useGlobalPrefix: true,
  });
}

export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  setupSwagger(app);
  registerRootHealthRoute(app);
  return app;
}

export function registerRootHealthRoute(app: INestApplication): void {
  const healthService = app.get(HealthService);
  const httpAdapter = app.getHttpAdapter();

  httpAdapter.get('/health', (_req: Request, res: Response) => {
    void healthService
      .getHealth()
      .then((payload) => {
        res.status(200).json(payload);
      })
      .catch(() => {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          database: { connected: false },
        });
      });
  });
}
