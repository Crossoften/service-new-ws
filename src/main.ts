import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import { readFileSync } from 'fs';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * Origens autorizadas a consumir a API.
 *
 * Aceita uma lista separada por vírgula em CORS_ORIGINS; na ausência dela, usa
 * FRONTEND_URL. Sem nenhuma das duas configuradas, libera qualquer origem — o
 * comportamento antigo, mantido apenas para não quebrar ambiente local.
 */
function resolveCorsOrigin(): string[] | boolean {
  const configured = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '';

  const origins = configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : true;
}

async function bootstrap() {
  let app: INestApplication;

  const cors = { origin: resolveCorsOrigin(), credentials: true };

  if (process.env.ACTIVATE_SSL_CERTIFICATE === 'YES') {
    app = await NestFactory.create(AppModule, {
      cors,
      httpsOptions: {
        key: readFileSync(process.env.SSL_KEY, 'utf8'),
        cert: readFileSync(process.env.SSL_CERT, 'utf8'),
        ca: readFileSync(process.env.SSL_CA, 'utf8'),
      },
    });
  } else {
    app = await NestFactory.create(AppModule, { cors });
  }

  // Fora do if: com TLS terminado no proxy (o arranjo do deploy atual), estes
  // dois ficavam de fora e a API respondia sem headers de segurança.
  app.use(helmet());
  app.use(compression());

  app.setGlobalPrefix('/v1');

  const config = new DocumentBuilder()
    .setTitle('Documentação da API Projeto Service.')
    .setDescription('Essa API foi construída usando NestJS na versão 10.0')
    .setVersion('1.0')
    .addTag('Autenticação')
    .addTag('Configurações - Portal Gerencial')
    .addTag('Upload de arquivos')
    .addTag('Sem autenticação')
    .addTag('My Self')
    .addServer(`${process.env.HOST}:${process.env.PORT}`, 'Testes locais.')
    .addServer(`${process.env.URL_INTEGRATION}`, 'Testes de integrações.')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearerAuth')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  if (process.env.ACTIVATE_SWAGGER === 'YES') {
    SwaggerModule.setup('docs', app, document);
  }

  // whitelist remove propriedades não declaradas nos DTOs, fechando a porta de
  // mass assignment nas 63 rotas PATCH. forbidNonWhitelisted fica DESLIGADO de
  // propósito: ele rejeitaria a requisição inteira com 400, quebrando clientes
  // que hoje mandam campos a mais. Remover em silêncio já elimina o risco.
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.listen(process.env.PORT, () => console.log(`Server UP on PORT ${process.env.PORT}`));
}
bootstrap();
