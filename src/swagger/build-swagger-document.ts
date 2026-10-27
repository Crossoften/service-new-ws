import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { resolve } from 'path';

import { AppModule } from '../app.module';

/** Onde o contrato exportado vive. O front e o app leem este arquivo. */
export const SWAGGER_FILE_PATH = resolve(__dirname, '..', '..', 'docs', 'swagger.json');

/** Indentação com que o arquivo é gravado. */
export const SWAGGER_INDENT = 2;

/**
 * Monta o documento OpenAPI a partir dos módulos da aplicação.
 *
 * Mora aqui, e não dentro do script de geração, porque **duas** coisas precisam
 * da mesma montagem: o script que grava `docs/swagger.json` e o teste que
 * confere se o arquivo gravado ainda corresponde ao código. Se cada um
 * montasse por conta, uma diferença de configuração entre os dois (prefixo,
 * título, bearer) apareceria como contrato defasado quando não é.
 */
export async function buildSwaggerDocument(): Promise<Record<string, unknown>> {
  // `abortOnError: false` é o que torna a falha visível: no padrão, o Nest
  // registra o erro pelo logger e encerra o processo por conta própria — e como
  // o logger está desligado aqui, o script morria com código 1 e ZERO saída,
  // deixando o `swagger.json` com o conteúdo antigo sem nenhum aviso. Com esta
  // opção, o erro vira exceção e chega em quem chamou.
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });

  try {
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

    return SwaggerModule.createDocument(app, config) as unknown as Record<string, unknown>;
  } finally {
    // No `finally` para o app fechar mesmo quando a montagem estoura — senão
    // o processo fica preso com a conexão aberta e o jest acusa worker vazando.
    await app.close();
  }
}
