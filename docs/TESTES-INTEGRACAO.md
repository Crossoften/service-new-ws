# Testes de integração

Falam com um **MySQL de verdade**. Existem porque três coisas do projeto não se
provam com duplo de Prisma: bloqueio de linha, chave estrangeira e índice
único.

## Rodar

```bash
DATABASE_URL="mysql://user:senha@127.0.0.1:3306/service_test" npx prisma migrate deploy
DATABASE_URL="mysql://user:senha@127.0.0.1:3306/service_test" npm run test:int
```

⚠️ **O banco é descartável.** Cada teste apaga as tabelas que toca. Nunca
aponte para o banco de desenvolvimento, e muito menos para produção — o
`setup.ts` exige `DATABASE_URL` explícito justamente para não haver padrão que
caia no lugar errado.

Rodam em série (`--runInBand`): compartilham o mesmo banco, e dois arquivos
limpando tabelas ao mesmo tempo se atrapalhariam. A concorrência que eles
exercitam acontece **dentro** de cada teste.

Os unitários (`npm test`) continuam sem banco e não precisam de nada.

## O que cobrem

| Arquivo | Prova |
|---|---|
| `delivery-payout-concurrency.int-spec.ts` | dois repasses simultâneos do mesmo entregador: um passa, o outro é recusado, um lote, uma saída no razão |
| `webhook-idempotency.int-spec.ts` | duas notificações simultâneas do Mercado Pago lançam o razão uma vez só; estorno e chargeback marcam pagamento e pedido |
| `warranty-work.int-spec.ts` | reparo em garantia nasce com `budgetId` nulo apesar do índice único; chat na mesma transação; duas respostas simultâneas criam um reparo só |

## Por que só esses

Não é cobertura de superfície — é cobertura do que **só o banco responde**.
Cada um desses testes existe para sustentar uma afirmação que estava escrita
num comentário de código ou numa entrega, sem prova:

- *"o banco trava a linha e a segunda transação alcança zero linhas"*
- *"em MySQL o índice único aceita vários NULL"*
- *"a resposta é idempotente"*

A terceira estava **errada**, e foi este conjunto que descobriu.

## O que ainda não existe

Não há teste de HTTP ponta a ponta: nada sobe o Nest com `supertest` e passa
por guardas, pipes e serialização. O que existe chama os serviços direto,
contra o banco. Cobre a camada onde os bugs de dinheiro moram, não a borda.

Também não há cobertura de integração para cupom, push, agendamento e
maquininha. Os três primeiros não dependem de banco para nada que já não
esteja coberto em unitário; a maquininha depende, e é candidata natural à
próxima fatia.
