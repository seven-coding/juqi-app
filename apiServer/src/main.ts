import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { json, urlencoded } from 'body-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(json({ limit: '50Mb' }));
  app.use(urlencoded({ extended: true, limit: '50Mb' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(helmet());
  app.enableCors();

  const port = process.env.PORT || 9999;
  await app.listen(port);
  console.log(`App API Server (v2) is running on port ${port}`);
}

bootstrap();
