import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Глобальная валидация DTO
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // CORS не нужен — всё идёт через nginx на одном домене.
  // Включаем только для локальной разработки без nginx:
  if (process.env.NODE_ENV === 'development') {
    app.enableCors({ origin: 'http://localhost:5173' });
  }

  await app.listen(process.env.PORT ?? 3000);
  console.log(`API запущен на порту ${process.env.PORT ?? 3000}`);
}

bootstrap();
