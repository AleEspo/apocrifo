import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Sicurezza e Middleware
  app.use(helmet());
  
  const cookieHandler = (cookieParser as any).default || cookieParser;
  app.use(cookieHandler());

  // 2. Configurazione CORS (Essenziale per Render)
  app.enableCors({
    origin: 'https://apocrifo-frontend.onrender.com',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 3. Validazione e Prefissi
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');

  // 4. Swagger (Documentazione)
  const config = new DocumentBuilder()
    .setTitle('Apocrifo API')
    .setDescription('Party game API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 5. Avvio del server
  const port = process.env.PORT || 10000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🎮 Apocrifo backend running on port ${port}`);
}

bootstrap();