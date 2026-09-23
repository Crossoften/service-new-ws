/**
 * Os testes de integração falam com um MySQL de verdade.
 *
 * Rodam em série (`maxWorkers: 1`) porque compartilham o mesmo banco: dois
 * arquivos limpando tabelas ao mesmo tempo se atrapalhariam. A concorrência que
 * esses testes exercitam acontece **dentro** de cada teste, entre duas
 * chamadas do serviço — que é exatamente o cenário que eles existem para
 * provar.
 */
if (!process.env.DATABASE_URL) {
  throw new Error(
    'Os testes de integração precisam de DATABASE_URL apontando para um banco ' +
      'DESCARTÁVEL. Eles apagam tabelas. Exemplo:\n' +
      '  DATABASE_URL="mysql://user:pass@127.0.0.1:3306/service_test" npm run test:int',
  );
}

jest.setTimeout(30000);
