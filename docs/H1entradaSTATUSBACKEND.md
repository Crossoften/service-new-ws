<!-- Cole em docs/STATUSBACKEND.md, na seção 3, depois da Fase G. E remova o
     resíduo "razão credita o bruto" que a Fase F abriu: está resolvido. -->

### Fase H — Taxa da plataforma no razão · ✅ entregue

**O erro.** Desde que o split entrou (MP2), o Mercado Pago passou a reter a
comissão **na origem**: o vendedor recebe o líquido na conta dele e nunca vê
aquele dinheiro entrar. Mas o `financialTransaction` de crédito continuou
gravando o valor **cheio**. O saldo exibido pela plataforma ficou maior que o
dinheiro real, em todos os fluxos com split — `Work`, `CommercialTransaction` e,
desde a Fase F, `FoodOrder`.

Um trabalho de R$ 100 com 20% de taxa creditava R$ 100 ao prestador. Entraram
R$ 80 na conta dele. A diferença não aparecia em lugar nenhum.

**Por que ninguém tinha visto.** O `createPreference` já devolvia
`marketplaceFee` — o valor exato retido — desde o MP2. **Nenhum dos três
chamadores lia esse campo.** O dado certo estava sendo calculado e descartado na
mesma linha.

**Patch H1 — 8 arquivos**

*Coluna `platformFeeAmount` em `Payment`*, gravada na geração do checkout. É o
único momento em que a retenção é conhecida: quando o webhook chega, o split já
aconteceu e o valor não volta na notificação. Migration
`20260904190000_payment_platform_fee_amount`.

*Opcional, não zero por padrão.* Pagamento anterior a esta migration fica nulo.
Zero afirmaria "não houve taxa"; o correto para o histórico é "não se sabe" — e
o lançamento só é criado quando há valor positivo, então o histórico antigo
segue como está, sem retroatividade inventada.

*O crédito continua bruto, de propósito.* O extrato precisa mostrar quanto a
venda gerou. A taxa entra como **débito na mesma data**, categoria `Fee`, no
mesmo recebedor. Como o saldo é `soma de créditos − soma de débitos`
(`balances.service.ts`), o par (crédito 100, débito 20) resulta nos R$ 80 que de
fato entraram — e o vendedor **vê** quanto pagou de taxa, em vez de receber um
número menor sem explicação.

*Um só ponto de montagem.* O `feeTransaction` privado no `WebhooksService` é
usado pelas três confirmações. Corrigir em um lugar só era o motivo de tratar os
três fluxos juntos em vez de só o delivery.

**Validação.** `npx jest`: 10 suítes, **81 testes passando** (10 novos — 8 na
montagem do lançamento, incluindo taxa nula, zero e negativa; 2 na gravação do
valor no checkout). Build e lint limpos. Cadeia `F1 → G1 → H1` verificada em
worktree a partir de `98b4e05`, byte a byte.

**Ordem de aplicação:** o H1 pressupõe **F1 e G1 aplicados**, nessa ordem — os
três tocam `food-orders.service.ts` e `webhooks.service.ts`.

**Depois de aplicar:** `npx prisma migrate deploy && npx prisma generate`.

**Resíduo que continua aberto.** O `commissionAmount` gravado no `FoodOrder` na
criação segue sem consumidor: ele é a comissão calculada pela regra do delivery
(`billingType`), enquanto o `platformFeeAmount` é o que o Mercado Pago
efetivamente reteve. Nos pedidos com split os dois deveriam bater — vale
conferir com dado real quando as credenciais do cliente chegarem, porque
divergência aí significa que a regra de cobrança e a execução da cobrança não
estão dizendo a mesma coisa.
