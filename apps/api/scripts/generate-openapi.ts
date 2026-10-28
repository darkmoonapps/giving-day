import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { configureApp, createSwaggerDocument } from '../src/configure-app';

async function generateOpenApi(): Promise<void> {
  process.env.SKIP_DB_CONNECT = 'true';
  // CI has no apps/api/.env; Passport OAuth strategies require non-empty client IDs.
  process.env.JWT_SECRET ??= 'openapi-generation-jwt-secret';
  process.env.GOOGLE_CLIENT_ID ??= 'openapi-generation-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET ??=
    'openapi-generation-google-client-secret';
  process.env.FACEBOOK_APP_ID ??= 'openapi-generation-facebook-app-id';
  process.env.FACEBOOK_APP_SECRET ??= 'openapi-generation-facebook-app-secret';

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
