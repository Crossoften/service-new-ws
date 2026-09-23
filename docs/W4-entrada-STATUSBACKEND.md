### CI — esteira de qualidade · ✅ entregue

**Patch:** `W4-ci.patch` · 2 arquivos · +171
**Base:** `722ab84` + `W2` + `W3`

Workflow **novo e separado** (`ci.yml`). O `main.yml` não foi tocado.

---

#### O que roda

Runner do GitHub, MySQL 8 em service container, banco descartável.

| Passo | Pega |
|---|---|
| `eslint` | estilo |
| `npm run build` | erro de tipo |
| `npm test` | 319 unitários, sem banco |
| `prisma migrate deploy` | migration que não aplica em banco limpo |
| **`prisma migrate diff`** | migration que não bate com o `schema.prisma` |
| `npm run test:int` | concorrência, FK e índice único |

Ordem escolhida para falhar barato: tudo que não precisa de banco vem antes.

#### O portão que justifica a fase

```bash
npx prisma migrate diff --from-schema-datasource ... --to-schema-datamodel ... --exit-code
```

Migration neste projeto é escrita à mão, então divergir é fácil e **silencioso**:
build passa, teste passa, e o estrago aparece quando alguém roda
`migrate dev` e recebe migration fantasma — ou quando o banco recusa em runtime
um valor que o Prisma aceita em tipo.

Validei o portão nos dois sentidos, contra banco real:

- schema e migrations coerentes → `exit 0`
- reintroduzi a divergência do enum de `payments.referenceType` → **`exit 2`**

Ele teria pego sozinhas as duas divergências que achei à mão ontem.

#### Validação

Rodei a sequência exata do workflow localmente, contra MySQL:

```
npx prisma generate      OK
eslint                   OK
npm run build            OK
npm test                 OK   (41 suítes / 319 testes)
prisma migrate deploy    OK   (36 migrations)
drift gate               OK   (exit 0)
npm run test:int         OK   (3 suítes / 17 testes)
```

YAML validado com parser. Cadeia `W2 → W3 → W4` aplica limpo em `722ab84`, com
identidade byte a byte em 21 arquivos.

⚠️ **Não rodou no GitHub.** A sintaxe está validada e os comandos estão
provados, mas a primeira execução real só acontece no primeiro push.

---

### Dois achados na esteira de deploy existente

Nenhum é parte desta entrega. Estão aqui porque apareceram ao ler o `main.yml` e
são mais graves do que o que eu vim fazer.

#### 1. Correção: existe deploy, sim — e eu disse que não

Em 23/09 afirmei, aqui e no texto que foi para a sessão do front, que *"não
existe esse deploy"* e que o que a Brendha commita "nunca foi para homolog".

**Errado.** O `main.yml` dispara em `push: branches: ['**']` e publica na VPS
via PM2 (`service-new-https:8029`), que é a base que o front consome em
`homolog.crosoften.com:8029`. Ou seja: cada push da `ajustes-gerais` **vai para
homolog**. A premissa do front estava certa e a minha, não.

Não dá para confirmar daqui se as execuções passaram — só que o gatilho existe.

#### 2. O deploy ignora as migrations e pode apagar o banco

A etapa de banco do `main.yml` não usa `migrate deploy`. Usa:

```bash
npx prisma db push --accept-data-loss
# e, se falhar:
npx prisma db push --force-reset --accept-data-loss
```

Duas consequências:

- **A pasta `prisma/migrations` nunca é executada em deploy.** `db push`
  compara o `schema.prisma` direto com o banco. Todas as migrations desta
  auditoria valem para máquina de desenvolvimento e para o CI, não para o que
  sobe
- **O fallback dropa o banco e roda o seed.** Uma falha transitória de conexão
  no `db push` é suficiente para disparar `--force-reset`. Em homolog é chato;
  se a mesma esteira apontar para produção algum dia, é perda de dados
  provocada por uma instabilidade de rede

O caminho natural é trocar por `prisma migrate deploy` — que aplica só o que
falta, não apaga nada, e falha em vez de destruir. **Não mexi:** é esteira do
DevOps, e a troca muda o comportamento de deploy de todos os ambientes.

#### 3. Menor: o CI não bloqueia o deploy

Os dois rodam em paralelo. O deploy pode subir e o CI ficar vermelho um minuto
depois. Bloquear é uma linha (`workflow_run` + `if`), documentada em
`docs/CI.md`, mas também é decisão do DevOps.

#### Detalhe de versão

`main.yml` usa `actions/setup-node@v4` com `node-version: 20`, mas o
`NVM_BIN` da VPS aponta para `v24.14.1`. Build e execução acontecem em versões
diferentes de Node. Não causou problema até agora; vale alinhar.
