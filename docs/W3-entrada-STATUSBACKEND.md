### Fase 9 — Testes de integração · ✅ entregue

**Patch:** `W3-testes-integracao.patch` · 12 arquivos · +831 / −17
**Base:** `722ab84` + `W2`

O contêiner ganhou MySQL nesta sessão. Foi a primeira vez em toda a auditoria
que deu para rodar migration e teste contra banco de verdade — e o resultado
justificou a fase três vezes.

---

#### 1. As migrations, finalmente executadas

**As 35 migrations aplicaram limpo**, incluindo as nove que entreguei sem poder
testar: cupons, push, comissão do delivery, repasse, chave Pix, maquininha,
`Refunded`, decisão de orçamento e reparo em garantia.

#### 2. Duas divergências entre migration e schema

`prisma migrate diff` encontrou o que nenhuma revisão de código pegaria, porque
só aparece comparando schema com banco:

**`payments.referenceType` ficou para trás.** A migration do `Refunded` alterou
só `financial_transactions.referenceType` para incluir `DeliveryPayout`, com a
justificativa de que um pagamento nunca referencia um repasse. O raciocínio de
produto está certo — o erro é que **o Prisma modela um enum só** para as duas
colunas. Consequência: `prisma migrate dev` geraria migration fantasma em
qualquer máquina, e o cliente aceitaria em tipo um valor que o banco recusa.

**A FK de `works.budgetId` ficou com a ação antiga.** Tornar a coluna opcional
muda o esperado de `ON DELETE RESTRICT` para `SET NULL`, e `MODIFY` numa coluna
com FK não mexe na constraint. Na prática: apagar um orçamento que virou
trabalho era recusado pelo banco.

Corrigidas em `20260923180000_fix_schema_drift`, que corrige as duas em vez de
reescrever história já pushada. Depois dela: **"No difference detected."**

#### 3. Um bug de concorrência no reparo em garantia

Este é o achado que mais importa. O teste *"responder duas vezes não cria dois
reparos"* falhou: **criou dois.**

A guarda de `respondWarranty` era uma leitura fora da transação — exatamente o
TOCTOU que corrigi no webhook e no repasse, e reintroduzi aqui sem perceber. Na
entrega do BE-W1 eu escrevi que a idempotência "passa a valer para algo
concreto: sem ela, dois toques no botão criariam dois reparos". A trava não
sustentava isso sob concorrência.

Corrigido com o mesmo padrão dos outros dois:

```ts
const { count } = await tx.work.updateMany({
  where: { id, warrantyRequestStatus: WarrantyRequestStatus.Pending },
  data: resposta,
});
if (count === 0) throw new WorkUpdateFailedException();
```

O unitário do W1 passava com o bug presente, porque duplo de Prisma não tem
bloqueio de linha. Foi preciso banco.

#### O que os testes cobrem

Três suítes, 17 testes. Não é cobertura de superfície — é cobertura do que
**só o banco responde**. Cada teste existe para sustentar uma frase que estava
escrita num comentário sem prova:

| Suíte | Prova |
|---|---|
| `delivery-payout-concurrency` | dois repasses simultâneos: um passa, um é recusado, um lote, uma saída |
| `webhook-idempotency` | duas notificações simultâneas lançam o razão uma vez; estorno e chargeback marcam pagamento e pedido |
| `warranty-work` | `budgetId` nulo em vários reparos apesar do índice único; chat na mesma transação; duas respostas criam um reparo só |

#### Como rodar

```bash
DATABASE_URL="mysql://user:senha@127.0.0.1:3306/service_test" npx prisma migrate deploy
DATABASE_URL="mysql://user:senha@127.0.0.1:3306/service_test" npm run test:int
```

⚠️ **Banco descartável.** Os testes apagam tabelas. O `setup.ts` exige
`DATABASE_URL` explícito para não existir padrão que caia no lugar errado.

`npm test` continua sem banco: os unitários não mudaram de natureza, e seguem
rodando em qualquer máquina sem preparo.

#### Validação

- `nest build` → 0 · `eslint` → limpo
- `jest` (unitário) → **41 suítes / 319 testes**
- `npm run test:int` → **3 suítes / 17 testes, contra MySQL 10.11**
- `prisma migrate diff` → **No difference detected**
- Cadeia `W2 → W3` aplica limpo em `722ab84`, identidade byte a byte em 19 arquivos
- Scan de segredos → limpo (a senha do banco de teste é da minha máquina e não entra no patch)

#### O que ainda falta

- **HTTP ponta a ponta.** Nada sobe o Nest com `supertest`: os testes chamam os
  serviços direto. Cobrem a camada onde os bugs de dinheiro moram, não a borda
  (guardas, pipes, serialização)
- **Integração de maquininha** — depende de banco e é candidata natural à
  próxima fatia. Cupom, push e agendamento não ganham nada que o unitário já
  não cubra
- **CI.** Os testes existem mas ninguém os roda sozinho. Com MySQL em container
  no pipeline, `test:int` entra fácil — e é o que impede o próximo TOCTOU de
  passar despercebido por semanas
