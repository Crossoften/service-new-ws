import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

import {
  SWAGGER_FILE_PATH,
  SWAGGER_INDENT,
  buildSwaggerDocument,
} from '../src/swagger/build-swagger-document';

/**
 * Grava `docs/swagger.json` a partir dos módulos da aplicação.
 *
 * A montagem do documento vive em `src/swagger/build-swagger-document.ts`,
 * compartilhada com o teste que confere se este arquivo está em dia.
 */
async function generate() {
  const document = await buildSwaggerDocument();

  mkdirSync(dirname(SWAGGER_FILE_PATH), { recursive: true });
  writeFileSync(SWAGGER_FILE_PATH, JSON.stringify(document, null, SWAGGER_INDENT));
}

generate().catch((error) => {
  console.error('Falha ao gerar o Swagger:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
