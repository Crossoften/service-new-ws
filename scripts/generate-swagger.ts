import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'fs';
import { AppModule } from '../src/app.module';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('Documentação da API Projeto Service')
    .setDescription('API construída com NestJS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  mkdirSync('./docs', { recursive: true });
  writeFileSync('./docs/swagger.json', JSON.stringify(document, null, 2));

  await app.close();
}

generate();