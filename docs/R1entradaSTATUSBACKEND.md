<!-- Cole em docs/STATUSBACKEND.md, na seção 3, depois da Fase Q. E remova os
     resíduos 1 e 2 que a Fase Q registrou: os dois estão resolvidos aqui. -->

### Fase R — A plataforma retém taxa e frete no split · ✅ entregue

Fecha o resíduo mais sério que a Fase Q expôs: **o repasse do entregador existia
no razão e não existia no banco.**

**O problema.** A preferência é criada na conta do **restaurante**, então o
dinheiro do cliente entra lá, menos o que a plataforma retém. Como a retenção
era só a comissão, o frete caía fisicamente na conta do restaurante — enquanto o
razão creditava o entregador. A plataforma prometia um repasse com dinheiro que
não tinha passado por ela.

**Decisão da Brendha:** a plataforma retém **taxa + frete** e paga o entregador
a partir daí — como marketplaces de delivery operam.

**Patch R1 — 4 arquivos**

*`createPreference` aceita `marketplaceFeeAmount`*, valor absoluto em reais, com
**precedência** sobre `marketplaceFeeRate`. Existe porque nem toda retenção é um
percentual do que foi cobrado: aqui é comissão sobre os **itens** mais o frete
**inteiro**, o que nenhum percentual sobre o total expressa. Trabalho e
negociação seguem no percentual, sem mudança.

*A guarda do split ficou explícita:* sem token do vendedor não há retenção
nenhuma — sem split, não existe terceiro de quem reter. Antes isso estava
implícito na condição do percentual.

*O checkout do pedido usa o `commissionAmount` que o pedido já gravou* na
criação, calculado sobre os itens. Isso resolve de quebra o outro resíduo da
Fase Q: antes o checkout mandava só o percentual e o Mercado Pago o aplicava
sobre o **total**, de modo que a plataforma cobrava comissão também sobre o
frete e o número divergia do `commissionAmount` guardado no pedido. Agora os
dois são o mesmo número.

*`payment.platformFeeAmount` passa a guardar a COMISSÃO, não a retenção
inteira.* É esse valor que vira débito do restaurante no razão (Fase H);
incluir o frete ali o penalizaria duas vezes, já que ele também não é creditado
pelo frete (Fase Q). A retenção total continua reconstruível somando o
`deliveryFee` do pedido.

**A conta fechando, com o exemplo dos testes** — itens R$ 50, frete R$ 8,
comissão R$ 10:

| Quem | Dinheiro | Razão |
|---|---|---|
| Cliente | paga R$ 58 | débito R$ 58 |
| Mercado Pago retém | R$ 18 para a plataforma | — |
| Restaurante | recebe R$ 40 na conta | crédito R$ 50, débito de taxa R$ 10 |
| Entregador | R$ 8, pagos pela plataforma | crédito R$ 8 |
| Plataforma | fica com R$ 10 | — |

Dinheiro e razão dizem a mesma coisa, nas quatro pontas.

**Validação.** `npx jest`: 15 suítes, **125 testes passando** (8 novos — quatro
na aritmética da retenção no pedido, incluindo o caso sem comissão, e três na
precedência do valor absoluto sobre o percentual dentro do `createPreference`,
com o cálculo real e só a chamada de rede substituída). Build e lint limpos.
Cadeia `O2 → P1 → Q1 → R1` verificada a partir de `11fdde7`, byte a byte.

**Nada a rodar depois de aplicar.** Sem migration, sem swagger.

**Resíduo que continua.** Pedido em dinheiro segue sem gerar lançamento nenhum
para o restaurante, enquanto o entregador recebe o `DeliveryPayout` na entrega
do mesmo jeito. Em dinheiro quem segura o valor é o entregador e o acerto é por
fora, então não há dinheiro errado — mas o razão fica assimétrico entre os dois
meios de pagamento, e um relatório que some os dois vai enganar.

**Não validado com dinheiro real.** Toda a aritmética está coberta por teste,
mas o `marketplace_fee` só pode ser conferido de ponta a ponta quando as
credenciais do Mercado Pago do cliente chegarem. É o primeiro teste a fazer
quando elas vierem.
