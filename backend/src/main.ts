import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Aumentar el límite de tamaño de peticiones para soportar adjuntos Base64
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ limit: '15mb', extended: true }));
  
  // Habilitar CORS para permitir peticiones desde el frontend
  app.enableCors({
    origin: true, // Refleja dinámicamente el origen del cliente (evita bloqueos de CORS en prod/dev)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Backend de monitoreo corriendo en: http://localhost:${port}`);
}
bootstrap();

