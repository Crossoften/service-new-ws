### Fase 0 — Correções de integridade · ✅ entregue

Cinco patches independentes, sobre `e19ac4b` + `V1` + `W1` + `X1`.
Pré-requisito das fases seguintes da auditoria de 21/09.

| Patch | Objetivo | Arquivos | Testes novos |
|---|---|---|---|
| `Y1-billing-type-restrito` | Modelo de cobrança deixa de ser campo aberto | 4 | 2 |
| `Y2-comissao-separada` | Comissão do delivery ganha coluna própria | 7 | 8 |
| `Y3-orcamento-travado` | Orçamento aceito vira imutável | 3 | 6 |
| `Y4-repasse-dinheiro` | Pedido em dinheiro para de gerar repasse fantasma | 2 | 4 |
| `Y5-retry-pagamento-trabalho` | Pagamento recusado deixa de trancar o trabalho | 3 | 3 |

**Total: 19 arquivos, 23 testes novos.** Suíte passa de 22/192 para **27 suítes
/ 215 testes**.

---

#### Y1 — `PATCH /v1/profile/me/billing-type`

`billingType` só é consultado para quem vende: o gate de assinatura e o cálculo
de comissão do delivery. Antes, qualquer conta autenticada gravava o campo —
cliente, entregador, influenciador.

- Rota restrita a `@ProfileTypes(UserProfileType.Supplier)` (admin passa, como em
  todas as outras)
- Troca sem mudança vira no-op, para o log não encher com o PATCH que o front
  dispara ao salvar a tela inteira
- Transição registrada em log: quem trocou, de quê para quê

**Correção ao relatório de auditoria.** Eu classifiquei isto como "elevação de
privilégio". Reverificando: `allowCommissionBilling` só é honrado no cadastro de
restaurante e na criação de pedido de delivery, e nos dois casos o modelo de
comissão **cobra** comissão — não é passe livre. O risco real é outro e mais
estreito: **um restaurante com assinatura ativa pode alternar para `None` entre
pedidos e parar de pagar comissão, continuando a vender pelo gate da
assinatura.** O Y1 não fecha isso; fecha quem pode escrever o campo. A regra de
transição depende da decisão de "assinatura reduzida + comissão", que é a Fase 4.

Também inclui um `moduleNameMapper` no Jest para `^src/(.*)$` — sem ele nenhum
spec consegue importar um controller, porque `update-profile.dto.ts` importa
`src/decorators/isCpfOrCnpj`. Era por isso que não havia teste de controller.

#### Y2 — `commissionRate` separado em dois domínios

A mesma coluna era lida pela comissão do influenciador sobre indicações (escrita
pelo admin) e pela comissão do restaurante sobre pedidos (nunca escrita por
ninguém, sempre caindo no padrão de 20%). Quem fosse as duas coisas tinha a taxa
de indicação aplicada aos próprios pedidos, em silêncio.

- Coluna nova `User.deliveryCommissionRate`, migration
  `20260921120000_user_delivery_commission_rate`
- `commissionRate` fica com o influenciador — é de quem são os valores já
  gravados, então **não há backfill e nenhum dado muda de significado**
- A coluna nova nasce nula: todo restaurante continua no padrão de 20%,
  exatamente como antes
- `food-orders.service` e `coupons.service` passam a ler a coluna certa
- O cálculo, que estava duplicado nos dois arquivos com a constante escrita duas
  vezes, vira `food-orders/commission.ts` — puro, testável sem banco
- `deliveryCommissionRate` entra no `UpdateUserDto` do admin, para a coluna não
  nascer morta como a `Plan.categoryId`

Um teste pegou uma sutileza e ela foi **preservada**: taxa 0 gravada vale 0%, não
cai no padrão. É o que o código já fazia; esta fase corrige colisão de domínio,
não muda regra de negócio.

#### Y3 — orçamento aceito vira imutável

No aceite, `Budget.responseValue` é copiado para `Work.serviceValue`/`totalValue`,
e é dali que `works.pay()` tira o valor cobrado. O `update` não tinha trava
nenhuma de estado: dava para alterar o valor depois do aceite e **depois do
pagamento aprovado**, sem nada reconciliar os três registros.

- `update` recusa com **409** quando o orçamento já tem `Work` — vale para admin
  também, porque não existe caminho de reconciliação
- A mensagem aponta o caminho legítimo: `PATCH /v1/works/:id/request-extra`
- `payload.status` deixa de ser escrito livremente. Só `Cancelled` vem do
  cliente — é o único estado sem rota própria. Os demais continuam derivados do
  que a requisição faz, e um `status` diferente é **ignorado, não recusado**,
  para não quebrar o front que hoje manda `Responded` junto da resposta

#### Y4 — repasse em pedido pago em dinheiro

`deliver()` creditava `deliveryFee + tip` como `DeliveryPayout` sem olhar a forma
de pagamento. No pedido em dinheiro o entregador já recebeu os dois em mãos, na
porta, e a plataforma não reteve nada — o crédito era passivo de dinheiro que
nunca entrou.

Isso importa agora e não antes: o repasse era só número na tela. Na Etapa 1 do
plano de pagamento ele vira dinheiro saindo, e o entregador receberia duas vezes.

#### Y5 — pagamento recusado trancava o trabalho

`works.pay()` recusava gerar checkout se existisse **qualquer** `Payment`,
inclusive `Cancelled`. Um pagamento recusado — que o webhook marca como
`Cancelled` — trancava o trabalho para sempre, sem rota para destravar. O
`food-orders.pay()` já filtrava por `Pending`/`Paid`; as duas rotas divergiam sem
motivo.

---

#### Validação

- `nest build` → 0
- `jest` → **27 suítes / 215 testes**
- `eslint src/**/*.ts` → limpo
- Cadeia `V1 → W1 → X1 → Y1 → Y2 → Y3 → Y4 → Y5` aplicada em worktree limpa
  sobre `e19ac4b`, com identidade byte a byte confirmada em **62 arquivos**
- Scan de segredos nos cinco patches → limpo
- ⚠️ **Nada validado contra banco nem HTTP** — o contêiner não tem MySQL. A
  migration do Y2 não foi executada, só escrita

#### Impacto no contrato do front

| Rota | Mudança |
|---|---|
| `PATCH /v1/profile/me/billing-type` | passa a devolver **403** para perfil que não seja Supplier |
| `PATCH /v1/budgets/:id` | passa a devolver **409** para orçamento já aceito |
| `PATCH /v1/budgets/:id` | `status` diferente de `Cancelled` é ignorado |
| `POST /v1/works/:id/pay` | passa a **funcionar** onde antes dava erro permanente |
| `PATCH /v1/admin/users/:id` | aceita `deliveryCommissionRate` |

#### Pendências que a Fase 0 deixou de propósito

1. Regra de transição do `billingType` — depende da Fase 4
2. Trilha de auditoria em banco para a troca de modelo de cobrança — hoje é só log
3. Orçamento `Cancelled` continua editável — nenhuma regra definida sobre isso
4. Pedido não-dinheiro **entregue antes da confirmação do pagamento** continua
   creditando o repasse. Mexer aqui exigiria creditar na confirmação em vez de na
   entrega, o que é redesenho e pertence à Etapa 1 do plano de pagamento
5. Conciliação do pedido em dinheiro: o entregador segura o valor dos itens e
   deve ao restaurante. Nada no razão expressa isso — **PENDÊNCIA FUNCIONAL**
