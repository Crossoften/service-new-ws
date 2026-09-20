<!-- Cole em docs/STATUSBACKEND.md, na seção 3, depois da Fase U. -->

### Fase V — Cupons de desconto (BE-Q10) · ✅ entregue

**Decisões da Brendha:** a **plataforma** custeia o desconto; **frete grátis
existe** e o entregador recebe normalmente; **só o admin** cadastra cupons.

#### A consequência que a primeira decisão impõe

A plataforma custeia abatendo o desconto da própria retenção no split. Mas a
retenção também é de onde saem o frete e a gorjeta do entregador. Logo, o que
sobra para descontar é **exatamente a comissão do pedido**:

```
retenção = comissão + frete + gorjeta − desconto
líquido da plataforma = retenção − (frete + gorjeta) = comissão − desconto
```

Passar disso exigiria `marketplace_fee` negativo — que o Mercado Pago não
aceita — e deixaria o repasse do entregador sem lastro. Daí duas regras que não
são escolha de implementação, são aritmética:

1. **O desconto de um pedido nunca passa da comissão dele.** Acima disso, o
   cupom é recusado com "tente um pedido de valor maior"
2. **Restaurante que fatura por assinatura não aceita cupom.** Sem comissão, o
   teto é zero. É limite conhecido e está documentado no código

`minOrderValue` e `maxDiscountValue` no cupom existem para o admin manter a
campanha dentro desse limite em vez de descobrir na recusa.

#### Patch V1 — 20 arquivos

*Modelo.* `Coupon` (código único, tipo, valor, teto, mínimo, vigência, limite
total e por cliente, escopo por restaurante, ativo) e `CouponRedemption` (um
resgate por pedido). `FoodOrder` ganhou `discount` e `couponId`. Migration
`20260920120000_coupons`.

*Por que uma tabela de resgates* em vez de contar pedidos: pedido cancelado não
deve consumir o cupom de ninguém, e a contagem por cliente precisa de índice
próprio.

*Cálculo isolado* em `coupon-discount.ts`, sem banco — é onde mora a aritmética
e onde estão 13 dos testes. Regras: percentual e valor fixo incidem **só nos
itens**; frete grátis desconta o frete; **gorjeta nunca é descontada** — é
dinheiro do entregador, e um cupom que a reduzisse daria desconto com o dinheiro
dele.

*Uma trava única para os dois caminhos.* A rota de pré-visualização e a criação
do pedido passam pelo mesmo `findEligible`. Duplicar a regra faria a tela
prometer um desconto que o pedido depois recusaria.

*A pré-visualização é honesta sobre o que não sabe.* `POST /v1/coupons/validate`
recebe o valor dos itens e devolve o desconto — mas o frete depende do endereço
e a comissão do `billingType`, que só a criação resolve. Cupom de frete grátis
volta com desconto zero e o tipo, para a tela mostrar "frete grátis" em vez de
um número inventado. E mandar um `itemsValue` inflado não aumenta desconto
nenhum: o valor definitivo é recalculado dos preços reais do cardápio.

*O resgate nasce dentro da transação do pedido*, senão dois pedidos simultâneos
do mesmo cliente furariam o limite por cliente.

*CRUD administrativo* em `/v1/admin-coupons`, com `DELETE` que **desativa em vez
de apagar** — cupom resgatado tem pedidos apontando para ele. A coerência entre
tipo e valor é validada sobre como o cupom **ficará**, não só sobre o corpo
enviado: mandar só o tipo não pode deixar um percentual sem percentual.

**A conta com cupom** — itens R$ 50, frete R$ 8, comissão R$ 10, cupom de R$ 6:

| Quem | Sem cupom | Com cupom |
|---|---|---|
| Cliente paga | R$ 58 | **R$ 52** |
| Retenção da plataforma | R$ 18 | **R$ 12** |
| Restaurante recebe | R$ 40 | **R$ 40** |
| Entregador recebe | R$ 8 | **R$ 8** |
| Plataforma fica com | R$ 10 | **R$ 4** |

O desconto sai inteiro da plataforma. Restaurante e entregador não sentem.

**Validação.** `npx jest`: 19 suítes, **162 testes passando** (15 novos). Build e
lint limpos. Patch verificado aplicando sobre `e19ac4b` em worktree limpo, byte
a byte.

**⚠️ Não validado contra banco nem HTTP.** O container desta sessão não tem
MySQL nem docker — diferente das fases K a U, que foram exercitadas com a API no
ar. **A migration nunca foi executada.** Antes de confiar nesta fase:

```bash
npx prisma migrate deploy && npx prisma generate
npm run build && npx jest
```

E um teste manual mínimo: criar um cupom pelo admin, validar pela rota de
pré-visualização, criar um pedido com ele e conferir `discount` e `totalValue`
na resposta.

**Depois de aplicar:** `npm run swagger:generate`.

**Resíduos.**

- **Nenhum seed de cupom.** A tabela nasce vazia; o primeiro cupom sai pelo
  admin
- **Cupom em pedido cancelado continua consumido.** O resgate não é removido no
  cancelamento, então um cliente que cancela perde o uso. Corrigir é apagar a
  linha de resgate no cancelamento — não fiz porque muda regra de negócio
  (cupom de uso único devolvido em cancelamento vira brecha de abuso)
- **Pedido em dinheiro aceita cupom** e passa pela mesma regra do teto, embora
  não haja split. O acerto é por fora, como todo o fluxo em dinheiro já é
