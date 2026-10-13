import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function generateOpenApi(): Promise<void> {
  process.env.SKIP_DB_CONNECT = 'true';

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Giving Day API')
    .setDescription('REST API for the Giving Day volunteer management app')
    .setVersion('0.1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  writeFileSync(
    join(__dirname, '..', 'openapi.json'),
    `${JSON.stringify(document, null, 2)}\n`,
    'utf8'
  );
  await app.close();
}

void generateOpenApi();
