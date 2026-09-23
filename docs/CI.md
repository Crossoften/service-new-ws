# CI

`.github/workflows/ci.yml` — roda a cada push e pull request.

| Passo | O que pega |
|---|---|
| `eslint` | estilo e regras do projeto |
| `npm run build` | erro de tipo |
| `npm test` | 319 testes unitários, sem banco |
| `prisma migrate deploy` | migration que não aplica num banco limpo |
| **`prisma migrate diff`** | migration que não corresponde ao `schema.prisma` |
| `npm run test:int` | concorrência, FK e índice único, contra MySQL 8 |

Roda num runner do GitHub, com MySQL 8 em service container e banco
descartável. É separado do `main.yml` de propósito: aquele é self-hosted e
publica na VPS — juntar os dois faria um teste quebrado poder derrubar o
deploy, e um deploy quebrado esconder um teste vermelho.

## O portão que mais importa

```bash
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --exit-code
```

Compara **o banco que as migrations produzem** com **o que o schema declara**.
Sai `2` quando divergem.

Migration é escrita à mão neste projeto, então divergir é fácil e silencioso: o
build passa, os testes passam, e o estrago só aparece quando alguém roda
`prisma migrate dev` e recebe uma migration fantasma — ou quando o banco recusa
em runtime um valor que o cliente do Prisma aceita em tipo.

Foi exatamente o que aconteceu em 23/09, com duas divergências encontradas à
mão. Este passo as teria pego sozinho, no push.

## Rodar igual ao CI, localmente

```bash
docker run --rm -d --name mysql-ci -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=service_test mysql:8.0

export DATABASE_URL="mysql://root:root@127.0.0.1:3306/service_test"
npm ci --legacy-peer-deps && npx prisma generate
npx eslint "src/**/*.ts" "test/**/*.ts" && npm run build && npm test
npx prisma migrate deploy
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --exit-code
npm run test:int
```

## O que este CI NÃO faz

**Não bloqueia o deploy.** O `main.yml` publica a cada push, sem esperar por
aqui. Os dois rodam em paralelo, então é possível o deploy subir e o CI ficar
vermelho um minuto depois.

Fazer o deploy esperar é uma linha, mas mexe na esteira do DevOps e por isso
não foi feito por conta própria:

```yaml
# em main.yml, no job de deploy
on:
  workflow_run:
    workflows: ["CI (service-new-ws)"]
    types: [completed]
    branches: ['**']
# e no job:
if: ${{ github.event.workflow_run.conclusion == 'success' }}
```

**Não sobe a aplicação por HTTP.** Os testes de integração chamam os serviços
direto contra o banco. Guardas, pipes e serialização não passam por aqui.
