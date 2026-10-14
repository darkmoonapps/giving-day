import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`API server running on http://localhost:${port}`);
  console.log(`OpenAPI docs available at http://localhost:${port}/api/docs`);
}

void bootstrap();
