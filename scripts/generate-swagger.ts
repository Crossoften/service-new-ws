import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'fs';
import { AppModule } from '../src/app.module';

async function generate() {
  // `abortOnError: false` é o que torna a falha visível: no padrão, o Nest
  // registra o erro pelo logger e encerra o processo por conta própria — e como
  // o logger está desligado aqui, o script morria com código 1 e ZERO saída,
  // deixando o `swagger.json` com o conteúdo antigo sem nenhum aviso. Com esta
  // opção, o erro vira exceção e chega no catch lá embaixo.
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });

  // O MESMO prefixo que `main.ts` aplica na API de verdade. Sem esta linha o
  // contrato exportado descrevia `/subscriptions/catalog` enquanto o servidor
  // responde em `/v1/subscriptions/catalog` — e um cliente gerado a partir
  // dele chamava todas as rotas sem o prefixo. O Swagger servido em `/docs`
  // nunca teve o problema, porque ali o documento nasce depois do prefixo:
  // era só o arquivo exportado que mentia.
  app.setGlobalPrefix('/v1');

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

generate().catch((error) => {
  console.error('Falha ao gerar o Swagger:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
