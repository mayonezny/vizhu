import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import multipart from '@fastify/multipart';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from './app.module';

async function bootstrap() {
  const BODY_LIMIT = 20 * 1024 * 1024; // 20 МБ

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: BODY_LIMIT }),
  );

  await app.register(multipart, {
    limits: { fileSize: BODY_LIMIT },
  });

  await app.register(fastifyCookie);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  if (process.env.NODE_ENV === 'development') {
    app.enableCors({ origin: 'http://localhost:5173' });
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ВИЖУ API')
    .setDescription('API для сервиса помощи незрячим пользователям')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log(`API запущен на порту ${process.env.PORT ?? 3000}`);
}

void bootstrap();
