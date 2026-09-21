### Fase 5 — Maquininha própria do estabelecimento · ✅ entregue

Dois patches, aplicados nesta ordem:

| Patch | Objetivo | Arquivos |
|---|---|---|
| `Y2b-relatorio-restaurante` | **Correção**: um ponto do `Y2` ficou para trás | 2 |
| `Z3-maquininha-propria` | A modalidade, o aceite e as três travas | 15 |

---

#### Y2b — correção de um erro meu no Y2

O `Y2` separou `commissionRate` (influenciador) de `deliveryCommissionRate`
(delivery) e mudou os dois pontos que eu tinha mapeado. **Faltou um terceiro**:
`restaurants.service.ts:244`, o relatório de repasse do estabelecimento, que
continuava lendo `user.commissionRate`.

O efeito: dono de restaurante que também fosse influenciador via, no próprio
relatório de comissão do delivery, a taxa de indicação dele. Exatamente o bug
que o `Y2` existia para matar, sobrevivendo num terceiro lugar que eu não varri.

A correção passa pelo mesmo `resolveCommissionRate` do cálculo do pedido, então
o relatório mostra a taxa que de fato foi cobrada — e quem está no modelo de
comissão sem taxa própria passa a ver os **20% do padrão**, em vez do campo
vazio de antes, que dava a entender que não pagava nada.

---

#### Z3 — a modalidade

Decisão da reunião: o estabelecimento pode sinalizar que cobra cartão na própria
maquininha, mediante aceite de responsabilidade, e passa a ser responsável pelo
repasse ao entregador.

**A decisão é uma só, tomada uma vez:** *este pedido passa pela plataforma?*
Dela dependem as três coisas que, se divergirem, custam dinheiro.

| Depende | Como era | Como ficou |
|---|---|---|
| Gera checkout com split? | `paymentMethod !== Cash` | `!settledOffPlatform` |
| Aceita confirmação manual? | `paymentMethod === Cash` | `settledOffPlatform` |
| Credita repasse ao entregador? | `paymentMethod !== Cash` | `!settledOffPlatform` |

`FoodOrder.settledOffPlatform` é gravado **na criação do pedido**, não deduzido
do restaurante na hora de ler. Ligar ou desligar a maquininha hoje não reescreve
a verdade de ontem: um pedido criado com checkout online continua tendo checkout
online.

**A maquininha é de cartão.** Crédito e débito saem do gateway; Pix e boleto
continuam passando pela plataforma, e dinheiro continua em mãos.

#### O aceite

`PATCH /v1/restaurants/me/card-machine` com `acceptResponsibility: true`.
Sem o aceite, `400`.

Grava **quem aceitou, quando e sobre qual versão do termo**
(`CARD_MACHINE_TERMS_VERSION`). A versão é o que torna o aceite verificável
depois: sem ela não dá para dizer sobre qual texto o estabelecimento concordou.

Desligar limpa os três campos — religar exige aceitar de novo, porque o texto
pode ter mudado no intervalo. E ligar quando já está ligado é no-op: sem isso, a
data do aceite viraria a do último toque na tela em vez da do momento em que a
responsabilidade foi assumida.

#### O risco que isto fecha

Era o que a auditoria marcou como o maior do bloco: *"o sistema continuar
tratando como split normal mesmo com maquininha física"*. Sem a trava, o
checkout seria gerado (segunda cobrança do mesmo pedido), o entregador seria
creditado por um frete que ninguém reteve, e o razão acumularia passivo
inexistente. As três travas estão no backend, não na tela.

#### A migration faz backfill, e é de propósito

```sql
UPDATE food_orders SET settledOffPlatform = true WHERE paymentMethod = 'Cash';
```

Pedido em dinheiro sempre foi liquidado fora da plataforma. Marcar os antigos
deixa a coluna ser a **única** fonte de verdade, em vez de obrigar o código a
perguntar as duas coisas ("é dinheiro OU está marcado?") em cada um dos três
pontos. Não muda comportamento: é o que `paymentMethod = 'Cash'` já significava.

#### Três testes que falharam de propósito

Ao trocar a fonte de verdade, `food-orders.pay.spec` e `delivery-payout.spec`
quebraram — as fixtures diziam `Cash` mas não diziam `settledOffPlatform`. Foi o
sinal certo: provou que a decisão de fato mudou de lugar, e não ficou duplicada.
Fixtures corrigidas, mais dois casos novos para o cartão na maquininha.

#### Validação

- `nest build` → 0 · `eslint` → limpo · `prisma validate` → válido
- `jest` → **33 suítes / 256 testes** (eram 30/242; +3 suítes, +14 testes)
- Cadeia de **12 patches** (`V1 → … → Z3`) em worktree limpa sobre `e19ac4b`,
  com identidade byte a byte em **91 arquivos**
- Scan de segredos → limpo
- ⚠️ **Não validado contra banco nem HTTP** — o contêiner não tem MySQL

#### Contrato do front

| Rota | Mudança |
|---|---|
| `PATCH /v1/restaurants/me/card-machine` | **nova** |
| `GET /v1/restaurants/me` e `/:id` | ganham `usesOwnCardMachine` |
| `POST /v1/food-orders/:id/pay` | `400` no cartão de restaurante com maquininha |
| `PATCH /v1/food-orders/:id/confirm-cash-payment` | aceita cartão de maquininha, não só dinheiro |

Detalhes na seção 8.6 do `ORIENTACOESFRONT`, incluindo o aviso de que esses
pedidos não entram no saldo do entregador.

#### PENDÊNCIAS FUNCIONAIS

1. **O estabelecimento com maquininha ainda paga comissão à plataforma?** Se
   sim, como é cobrada, já que o dinheiro não passa por ela? Hoje o pedido grava
   `commissionAmount` normalmente, mas **não há como retê-la** — não existe
   split. É a pendência I.5 da auditoria, e continua aberta: a proteção e a
   rastreabilidade eram uma fatia, a cobrança é outra.
2. **A dívida do estabelecimento com o entregador não é registrada.** Sabemos
   que ela existe (o pedido está marcado), mas nada no razão a expressa. Seria o
   espelho da carteira do `Z1`, do outro lado.
3. **Trilha de auditoria dos aceites.** Hoje o registro é o estado atual, e
   desligar apaga o anterior. Um histórico exigiria tabela própria.
