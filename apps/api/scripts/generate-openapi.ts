import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { configureApp, createSwaggerDocument } from '../src/configure-app';

async function generateOpenApi(): Promise<void> {
  process.env.SKIP_DB_CONNECT = 'true';

  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);

  writeFileSync(
    join(__dirname, '..', 'openapi.json'),
    `${JSON.stringify(createSwaggerDocument(app), null, 2)}\n`,
    'utf8'
  );
  await app.close();
}

void generateOpenApi();
