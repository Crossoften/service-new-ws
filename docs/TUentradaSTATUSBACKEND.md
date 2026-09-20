<!-- Cole em docs/STATUSBACKEND.md, na seção 3, depois da Fase S. -->

### Fase T — Mais quatro arquivos duplicados · ✅ entregue

**Falha minha na Fase Q.** Lá eu encontrei `webhooks.service 2.ts`, removi
aquele e segui em frente — sem varrer o repositório. Havia mais quatro, todos
rastreados no git:

```
src/modules/works/works.service 2.ts
src/modules/commercial-transactions/commercial-transactions.service 2.ts
src/modules/food-orders/food-orders.service 2.ts
src/modules/food-orders/food-orders.pay.spec 2.ts
prisma/schema 2.prisma
```

**4.338 linhas de código morto**, e não eram inertes: um deles quebrou o
`tsc --noEmit` assim que a Fase U adicionou um campo ao `ResponseFoodOrderDto`,
porque a cópia congelada do serviço ainda montava a resposta sem ele. Fossem
mantidos, cada mudança de DTO passaria a exigir editar dois arquivos — ou
quebrar o build sem motivo aparente.

O `prisma/schema 2.prisma` era o mais perigoso: 1.492 linhas de schema paralelo,
convidando alguém a editar o arquivo errado.

Ninguém os importava. Nenhum era alcançado pelo `testRegex` (o nome termina em
`spec 2.ts`, não em `.spec.ts`). Removidos.

---

### Fase U — Gorjeta ao entregador (BE-Q12) · ✅ entregue

Só foi possível depois da Fase R: antes, a gorjeta cairia no mesmo erro do
frete — creditada no razão a quem nunca recebeu o dinheiro.

**Patch U1 — 8 arquivos**

`tip` em `FoodOrder`, `Decimal @default(0)`, com migration
`20260908140000_food_order_tip`. Default zero e não nulo: gorjeta ausente e
gorjeta de zero são a mesma coisa economicamente, e o default evita nulo no meio
das somas.

*A gorjeta entra no total cobrado, mas NÃO na base da comissão.* É dinheiro do
entregador, não receita da venda do restaurante — cobrar comissão sobre ela
seria a plataforma tirar uma fatia da gorjeta.

*A plataforma retém comissão + frete + gorjeta* no split, e repassa frete +
gorjeta ao entregador na entrega. A descrição do lançamento menciona a gorjeta
quando existe, para o entregador entender o valor no extrato.

*Teto de R$ 1.000 e piso de zero, com no máximo duas casas.* O teto existe para
um erro de digitação não virar cobrança de milhares de reais no cartão.

**A conta, com o exemplo dos testes** — itens R$ 50, frete R$ 8, gorjeta R$ 5,
comissão R$ 10:

| Quem | Dinheiro |
|---|---|
| Cliente | paga R$ 63 |
| Mercado Pago retém | R$ 23 para a plataforma |
| Restaurante | R$ 40 — itens menos comissão, a gorjeta não passa por ele |
| Entregador | R$ 13 — frete mais gorjeta |
| Plataforma | R$ 10 — só a comissão |

**Validação executada contra a API no ar**, com o fluxo de entrega inteiro:

- pedido com gorjeta de R$ 5 → `201`, e `itens + frete + gorjeta = total`
  conferido na resposta
- gorjeta negativa → `400`; gorjeta de 99.999 → `400` com o teto na mensagem
- restaurante aceita → entregador aceita, coleta e entrega → **repasse de
  R$ 11,00** (frete R$ 6 + gorjeta R$ 5), com a gorjeta citada na descrição do
  lançamento
- e o valor aparece em `GET /v1/deliveries/me/earnings`

`npx jest`: 18 suítes, **147 testes passando** (13 novos). Build e lint limpos.
Cadeia `O2 → … → U1`, sete patches, verificada a partir de `11fdde7`, byte a
byte.

**Um teste pegou uma regressão real durante o desenvolvimento:** o fixture do
spec de pagamento não tinha `tip`, e `Number(undefined)` virou `NaN` na
retenção. Em produção a coluna é `NOT NULL DEFAULT 0` e isso não aconteceria,
mas mostrou que a aritmética não tem rede: mantive o código estrito, sem
`?? 0`, justamente para o teste continuar gritando se alguém esquecer o campo em
algum `select`.

**Depois de aplicar:** `npx prisma migrate deploy && npx prisma generate`, e
`npm run swagger:generate`.

**Resíduo.** Em pedido pago em dinheiro, a gorjeta é entregue em mãos ao
entregador — mas o `DeliveryPayout` credita frete + gorjeta no razão do mesmo
jeito, como já fazia com o frete. É a mesma assimetria registrada na Fase R, e
continua sem correção.
