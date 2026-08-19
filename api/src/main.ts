import { NestFactory } from '@nestjs/core';
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

  // CORS: web-прод ходит с того же origin (nginx) и в списке не нуждается.
  // capacitor://localhost (iOS) и https://localhost (Android) — origin'ы
  // WebView нативного приложения; они используют Bearer + refresh в теле,
  // куки им не нужны, но credentials оставлен для dev-фронта (5173).
  const corsOrigins = ['capacitor://localhost', 'https://localhost'];
  if (process.env.NODE_ENV === 'development') {
    corsOrigins.push('http://localhost:5173');
  }
  app.enableCors({ origin: corsOrigins, credentials: true });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ВИЖУ API')
    .setDescription('API для сервиса помощи незрячим пользователям')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Fallback: plain JSON без зависимости от статики
  app.getHttpAdapter().get('/openapi.json', (_req: unknown, res: unknown) => {
    (res as { send: (d: unknown) => void }).send(document);
  });

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log(`API запущен на порту ${process.env.PORT ?? 3000}`);
}

void bootstrap();
