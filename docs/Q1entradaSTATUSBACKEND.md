<!-- Cole em docs/STATUSBACKEND.md, na seção 3, depois da Fase P. E remova o
     resíduo "o razão credita o bruto" que a Fase F abriu — a parte do pedido de
     delivery está resolvida aqui. -->

### Fase Q — O frete não é receita do restaurante · ✅ entregue

Duas correções achadas na revisão do documento de demandas do front.

#### Arquivo duplicado commitado

`src/modules/webhooks/webhooks.service 2.ts` estava **rastreado no git**, commitado
em `b60afd0`. Era uma cópia congelada do serviço entre as fases F e H: tinha o
ramo `FoodOrder`, não tinha a correção da taxa. Ninguém o importava, mas estava
dentro de `src/` e ia para o `dist` a cada build. Nasceu provavelmente de uma
duplicação do editor durante a aplicação dos patches. Removido — 479 linhas.

#### O frete era creditado duas vezes

**O erro é meu, e vinha da Fase F.** A cadeia:

1. O `Payment` do pedido usa `amount: foodOrder.totalValue`, que **inclui o
   frete** — correto, é o que passa pelo gateway
2. O webhook creditava esse valor cheio ao dono do restaurante
3. E o `deliveries.service` credita `foodOrder.deliveryFee` ao **entregador**
   quando a entrega é concluída

Resultado: o mesmo frete entrava no razão duas vezes, e o saldo do restaurante
ficava inflado exatamente nesse valor.

**Decisão da Brendha:** o restaurante recebe **só os itens**. O frete é receita
do entregador.

O crédito do restaurante passou a ser `foodOrder.itemsValue`. O débito do cliente
continua sendo o valor cheio que ele pagou — a diferença entre os dois é o frete,
que aparece creditado ao entregador na entrega. O razão fecha.

**Correção de uma afirmação minha.** Na entrada da Fase H eu escrevi que
"`DeliveryPayout` continua sem uso". **Estava errado**: ele é criado em
`deliveries.service.ts:252`, no `deliver()`. Foi essa leitura equivocada que me
impediu de ver a duplicidade quando escrevi a Fase F.

**Validação.** `npx jest`: 15 suítes, **120 testes passando** (4 novos, chamando
o `confirmFoodOrderPayment` com um duplo do Prisma: valor debitado do cliente,
valor creditado ao restaurante, a diferença sendo exatamente o frete, e a taxa do
split entrando como terceiro lançamento). Build e lint limpos, e o duplicado
confirmadamente fora do `dist`. Cadeia `O2 → P1 → Q1` verificada a partir de
`11fdde7`, byte a byte.

**Nada a rodar depois de aplicar.** Sem migration, sem swagger.

---

### Dois resíduos de dinheiro que a Fase Q expôs e NÃO resolve

Os dois mudam movimentação real e precisam de decisão antes de qualquer pedido
com cliente de verdade.

**1. A comissão do split é calculada sobre o total, não sobre os itens.** Na
criação do pedido, `commissionAmount` é calculado como `itemsValue × taxa`. Mas o
checkout manda `unitPrice: totalValue` com a mesma taxa, então o Mercado Pago
retém sobre **itens + frete**. Os dois números discordam, e agora que o
restaurante só fatura os itens, cobrar comissão sobre o frete ficou incoerente.
Corrigir reduz a receita da plataforma — por isso não fiz sozinho.

**2. O entregador não tem de onde ser pago.** No modelo de split, a preferência é
criada na conta **do restaurante**: o dinheiro do cliente entra lá, menos a taxa
da plataforma. Ou seja, o frete cai fisicamente na conta do restaurante, enquanto
o razão credita o entregador. O repasse existe no livro e não existe no banco.

A saída coerente com a decisão tomada é a plataforma reter **taxa + frete** no
split e pagar o entregador a partir daí — que é como marketplaces de delivery
operam. Exige o `createPreference` aceitar um valor absoluto de
`marketplace_fee`, em vez de só o percentual.

**3. Pedido em dinheiro não gera lançamento nenhum.** O `confirmCashPayment` não
cria `financialTransaction`, então o restaurante não recebe crédito — mas o
entregador recebe o `DeliveryPayout` na entrega do mesmo jeito. Para pedido em
dinheiro quem segura o valor é o entregador, então o acerto é por fora; ainda
assim, o razão fica assimétrico entre os dois meios de pagamento.
