<!-- Cole em docs/STATUSBACKEND.md, na seção 3 (Linha do tempo), depois da
     Fase W. Sem patch pelo mesmo motivo de sempre: o arquivo é grande e muda
     a cada fase, o contexto do diff é frágil. -->

### Fase F — Pagamento do pedido de delivery · ✅ entregue

**O que estava quebrado.** Um pedido de delivery em cartão ou Pix nascia com
`paymentStatus: Pending` e **não existia caminho para sair de lá**. Não era
falha de integração: era ausência de implementação, em três camadas ao mesmo
tempo.

1. `PaymentReferenceTypeEnum.FoodOrder` existia no Prisma e no TS desde a
   criação do enum, mas **nenhum ponto do sistema criava um `Payment` com esse
   tipo**
2. `food-orders.service.create()` gravava `paymentMethod` e parava aí — sem
   `Payment`, sem preferência, sem `checkoutUrl`. Não havia rota de checkout;
   trabalho e negociação tinham `POST /:id/pay`, pedido de comida não ganhou o
   equivalente na Fase C
3. O `switch` do `confirmPayment()` no webhook cobria `CommercialTransaction`,
   `Work` e `Subscription`. `FoodOrder` caía no `default` e só logava um warning

O caminho em dinheiro funcionava porque não passa por nada disso: o
`confirmCashPayment` da Fase C fecha o ciclo em mãos.

**Patch F1 — 11 arquivos**

*Rota de checkout* — `POST /v1/food-orders/:id/pay`, só o cliente do pedido.
Espelha o `works.service.pay()`: preferência criada na conta do vendedor com
split na origem, `Payment` local `Pending` amarrado por `externalReference`.
Quem confirma é o webhook, nunca a rota.

*Taxa do split.* Usa o `platformFeeRate` que o **próprio pedido gravou na
criação**, derivado do `billingType` do dono do restaurante — não a taxa global
do `MarketplaceFeeService`. Consultar a taxa global no momento do pagamento
aplicaria uma regra diferente da que valia quando o cliente fez o pedido. Dono
sem `billingType: Commission` não tem percentual gravado e o checkout sai sem
split, que é o comportamento coerente: esse dono paga por assinatura.

*Travas.* Pedido inexistente, de outro cliente, em dinheiro, cancelado, já pago,
ou com checkout em aberto — todas recusam antes de tocar no Mercado Pago. O
vínculo do vendedor é **revalidado no pagamento**, não só na criação: o dono
pode ter desvinculado a conta no meio do caminho.

*Um checkout por vez.* Enquanto existir um `Payment` `Pending` ou `Paid` para o
pedido, uma nova chamada responde `400`. Duas preferências abertas continuariam
ambas válidas no Mercado Pago e o cliente poderia pagar as duas.

*Webhook* — ramo `FoodOrder` no `confirmPayment`: `Payment` vira `Paid` e
`FoodOrder.paymentStatus` vira `Paid` **na mesma transação**, com os dois
lançamentos financeiros na categoria nova. O `status` do pedido não é tocado:
quem move o pedido pela cozinha é o restaurante, não o meio de pagamento.
Pagamento aprovado em pedido cancelado é logado como `error` — é caso de
estorno, não de operação normal.

*Cancelamento* — pedido de comida é o **único** que não é cancelado junto com o
pagamento recusado. Um Pix vencido não pode derrubar um pedido que a cozinha já
pode estar preparando. O `Payment` fica `Cancelled`, o pedido continua
`Pending` — e é exatamente isso que libera o cliente a gerar um novo checkout.

*Migration* `20260904120000_food_order_payment_category` — valor
`FoodOrderPayment` em `FinancialTransactionCategoryEnum`, no schema e no espelho
TS. Sem categoria própria, o lançamento do pedido teria de entrar sob a
categoria de outro fluxo e nenhum relatório separaria receita por origem.

*`package.json`* — o `moduleNameMapper` do Jest, que ficou de fora do W1.

**Validação.** `npx jest`: 8 suítes, **62 testes, todos passando** (10 novos, na
matriz de travas do `pay`). `npm run build` limpo, `npx eslint src` limpo. Patch
verificado em worktree descartável a partir de `98b4e05`, com conferência byte a
byte.

**Depois de aplicar:** `npx prisma migrate deploy && npx prisma generate`, e
`npm run swagger:generate` para a rota nova entrar no contrato do front.

---

### Resíduos abertos pela Fase F

**O `moduleNameMapper` não tinha sido aplicado.** O W1 pedia rodar o comando à
mão e ele não entrou no commit `98b4e05` — ou seja, `npx jest` estava falhando
em carregar a suíte do WhatsApp desde então. Entrou no F1, agora versionado.

**O razão credita o bruto e o vendedor recebe o líquido.** Com o split do MP2, o
Mercado Pago retém a comissão na origem — mas o `financialTransaction` de
crédito grava o valor **cheio** para o recebedor. A distorção **não é do pedido
de comida**: ela já existe em `Work` e em `CommercialTransaction` desde que o
split entrou, porque os dois seguem o mesmo formato. Mantive o padrão em vez de
divergir só no delivery. Precisa ser resolvido nos três de uma vez.

**`commissionAmount` do pedido nunca vira lançamento.** É calculado e gravado na
criação e nada o consome. Com o split, o dinheiro sai pelo gateway; falta
decidir se além disso deve existir o registro contábil `Fee`. São coisas
diferentes: uma é dinheiro, a outra é trilha de auditoria.

**`DeliveryPayout` continua sem uso.** A `deliveryFee` entra no `totalValue` e
vai inteira para o restaurante. Como e quando o entregador recebe é decisão de
produto ainda em aberto.

**Retomar um checkout não é possível.** A `checkoutUrl` não é persistida — só o
`mpPreferenceId`. Se o cliente fechar o app, precisa esperar o pagamento vencer
para gerar outro. Resolver exige uma coluna nova em `Payment`, que é modelo
compartilhado por quatro fluxos; ficou fora de propósito.

**Restaurante vê o pedido antes de o pagamento aprovar.** Um pedido em Pix vai
para a cozinha com `paymentStatus: Pending`. Se o cliente nunca pagar, o
restaurante cozinhou de graça. É comportamento herdado da Fase C, não
introduzido aqui — e é a decisão **A** ainda pendente.
