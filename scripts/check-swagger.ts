import { readFileSync } from 'fs';

import {
  SWAGGER_FILE_PATH,
  SWAGGER_INDENT,
  buildSwaggerDocument,
} from '../src/swagger/build-swagger-document';

/**
 * Falha quando o `docs/swagger.json` não descreve mais o código.
 *
 * Mexer num DTO e esquecer o `npm run swagger:generate` não quebra nada: a
 * suíte passa, o build passa, o servidor responde certo. Quem descobre é o
 * front, lendo um contrato que não existe mais. Aconteceu duas vezes seguidas,
 * nas fatias BE-Y18 e BE-Y20.
 *
 * **Por que script e não spec do jest.** Montar o documento sobe a aplicação
 * inteira, e o `PrismaService.onModuleInit` chama `$connect()`. Dentro do jest
 * isso custava 27 s numa suíte de 21 s e deixava handle aberto — o jest passava
 * a avisar que não conseguiu encerrar. Como script, encerra sozinho e não
 * contamina a suíte. O encadeamento no `npm test` é o que garante que ele roda.
 *
 * As exigências de ambiente são **as mesmas** do `swagger:generate` que ele
 * guarda: se um roda, o outro roda.
 */
type Documento = Record<string, unknown>;

const METODOS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);

function operacoes(documento: Documento): string[] {
  const paths = (documento.paths ?? {}) as Record<string, Record<string, unknown>>;

  return Object.entries(paths).flatMap(([caminho, metodos]) =>
    Object.keys(metodos)
      .filter((metodo) => METODOS.has(metodo))
      .map((metodo) => `${metodo.toUpperCase()} ${caminho}`),
  );
}

function schemas(documento: Documento): Record<string, unknown> {
  const components = (documento.components ?? {}) as Record<string, unknown>;

  return (components.schemas ?? {}) as Record<string, unknown>;
}

function somenteEm(a: string[], b: string[]): string[] {
  const conjunto = new Set(b);

  return a.filter((item) => !conjunto.has(item)).sort();
}

/**
 * Resumo legível da divergência.
 *
 * Dizer "os documentos diferem" sobre 20 mil linhas de JSON não ajuda ninguém.
 * Isto diz **o que** mudou: rota nova, rota que saiu, schema novo, campo
 * alterado.
 */
function explicar(gerado: Documento, gravado: Documento): string[] {
  const linhas: string[] = [];

  const rotasNovas = somenteEm(operacoes(gerado), operacoes(gravado));
  const rotasRemovidas = somenteEm(operacoes(gravado), operacoes(gerado));

  const geradas = schemas(gerado);
  const gravadas = schemas(gravado);

  const schemasNovos = somenteEm(Object.keys(geradas), Object.keys(gravadas));
  const schemasRemovidos = somenteEm(Object.keys(gravadas), Object.keys(geradas));
  const schemasAlterados = Object.keys(geradas)
    .filter((nome) => nome in gravadas)
    .filter((nome) => JSON.stringify(geradas[nome]) !== JSON.stringify(gravadas[nome]))
    .sort();

  if (rotasNovas.length) linhas.push(`  no código e não no arquivo: ${rotasNovas.join(', ')}`);
  if (rotasRemovidas.length) {
    linhas.push(`  no arquivo e não no código: ${rotasRemovidas.join(', ')}`);
  }
  if (schemasNovos.length) linhas.push(`  schemas novos: ${schemasNovos.join(', ')}`);
  if (schemasRemovidos.length) linhas.push(`  schemas removidos: ${schemasRemovidos.join(', ')}`);
  if (schemasAlterados.length) linhas.push(`  schemas alterados: ${schemasAlterados.join(', ')}`);

  if (!linhas.length) {
    linhas.push('  o conteúdo é o mesmo; o que difere é a serialização do arquivo');
  }

  return linhas;
}

async function check() {
  const gerado = await buildSwaggerDocument();

  let gravado: Documento;

  try {
    gravado = JSON.parse(readFileSync(SWAGGER_FILE_PATH, 'utf8')) as Documento;
  } catch {
    console.error(
      [
        `Não foi possível ler ${SWAGGER_FILE_PATH}.`,
        '',
        'Rode `npm run swagger:generate` para criá-lo.',
      ].join('\n'),
    );
    process.exitCode = 1;
    return;
  }

  if (
    JSON.stringify(gerado, null, SWAGGER_INDENT) === JSON.stringify(gravado, null, SWAGGER_INDENT)
  ) {
    console.log('docs/swagger.json está em dia com o código.');
    return;
  }

  console.error(
    [
      'O docs/swagger.json está defasado em relação ao código.',
      '',
      ...explicar(gerado, gravado),
      '',
      'Rode `npm run swagger:generate` e commite o arquivo junto da mudança.',
    ].join('\n'),
  );
  process.exitCode = 1;
}

check().catch((error) => {
  console.error('Falha ao conferir o Swagger:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
