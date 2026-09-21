### Etapa 1 do repasse — carteira do entregador · ✅ entregue

**Patch:** `Z1-carteira-entregador.patch` · 15 arquivos · +993 / −4
**Base:** `e19ac4b` + `V1` + `W1` + `X1` + `Y1..Y5`

O frete e a gorjeta são retidos pela plataforma no split e viravam crédito do
entregador no razão quando ele finalizava a entrega. A história parava aí:
`FinancialTransactionCategoryEnum.Withdrawal` existia desde a criação do enum e
**nunca havia sido gravado por nenhuma linha do projeto**. O dinheiro do
entregador estava contabilizado e não estava pago.

Esta etapa dá saída ao que só tinha entrada. **O pagamento em si continua
acontecendo fora do sistema** — o admin faz o Pix e registra. O que o backend
passa a garantir é o resto: quanto se deve a quem, que um crédito só seja
quitado uma vez, e que cada saída tenha comprovante.

---

#### Modelo

`DeliveryPayout` (`delivery_payouts`) é um pagamento que saiu de verdade:
valor, meio (`Pix` \| `BankTransfer` \| `Cash` \| `Other`), comprovante,
observação, quantos créditos quitou, quando, para quem e por qual admin.

O vínculo com o razão é **uma coluna**: `FinancialTransaction.payoutId`.

| Estado | Significado |
|---|---|
| `payoutId` nulo num crédito `DeliveryPayout` | ainda devido ao entregador |
| `payoutId` preenchido | quitado, e o lote diz quando e como |

Uma coluna nula resolve as três coisas de uma vez — saldo em aberto, histórico e
idempotência — sem tabela de ligação e sem coluna de status para desencontrar do
razão.

`PaymentReferenceTypeEnum` ganhou `DeliveryPayout`, para o lançamento de saída
apontar para o lote. É o único referenceType que não nasce de um negócio entre
duas pessoas, e sim de a plataforma pagar o que devia.

**Migration `20260921150000_delivery_payouts`, toda aditiva.** Os créditos já
gravados nascem com `payoutId` nulo, que é exatamente o que "ainda devido"
significa — o saldo em aberto de hoje aparece correto **sem backfill nenhum**.

#### Rotas novas — admin com permissão `Financial`

| Método | Rota | O quê |
|---|---|---|
| `GET` | `/v1/admin-delivery-payouts/pending` | quanto se deve a quem, com dados bancários |
| `POST` | `/v1/admin-delivery-payouts` | registra repasse pago e dá baixa |
| `GET` | `/v1/admin-delivery-payouts` | histórico, filtrável por entregador |

Os dados bancários vêm junto do `pending` porque é com eles que o admin paga —
sem isso a tela obrigaria a abrir o cadastro do entregador em outra aba, linha
por linha. Entregador sem conta cadastrada vem sem `bankAccount`: não há para
onde enviar.

#### Tela do entregador

`GET /v1/deliveries/me/earnings` ganhou `available` e `paid`, no mesmo formato
dos campos que já existiam. `available + paid = total`. Os recortes de tempo
não mudaram: continuam somando pago e não pago, porque são faturamento, não
saldo.

#### As três travas

1. **`expectedAmount`** — o admin faz o Pix olhando um número e registra depois.
   Se uma entrega for concluída nesse intervalo, o saldo sobe; liquidar tudo
   daria baixa em dinheiro que não foi pago. Quando o campo vem preenchido e não
   bate, **nada é liquidado** e a resposta é 409 com o valor atual.
2. **`UPDATE ... WHERE payoutId IS NULL`** — dois admins repassando o mesmo
   entregador ao mesmo tempo: o UPDATE alcança menos linhas do que o esperado e
   a transação inteira é desfeita. Melhor o admin repetir do que o entregador
   receber duas vezes.
3. **Contrapartida obrigatória no razão** — o lote e o débito `Withdrawal`
   nascem na mesma transação. Sem isso o saldo fecharia errado: os créditos
   continuariam somando e nada registraria a saída.

#### Uma escolha de desenho, registrada

`availableAt` entra no filtro do saldo (`null` ou `<= agora`). Hoje ele nasce
igual ao momento da entrega, então tudo fica disponível na hora — o filtro não
muda nada. Se amanhã o dinheiro passar a liberar em D+7, já está coberto sem
tocar no código do repasse.

#### Validação

- `nest build` → 0 · `eslint` → limpo
- `jest` → **29 suítes / 227 testes** (eram 27/215; +2 suítes, +12 testes)
- Cadeia `V1 → W1 → X1 → Y1..Y5 → Z1` em worktree limpa sobre `e19ac4b`, com
  identidade byte a byte em **74 arquivos**
- `prisma validate` → schema válido · scan de segredos → limpo
- ⚠️ **Não validado contra banco nem HTTP** — o contêiner não tem MySQL. A
  migration foi escrita e o schema validado, mas **não executada**

#### Pendências funcionais que esta etapa não inventou

1. **Repasse parcial não existe** — o `POST` liquida o saldo inteiro. Parcial
   exigiria decidir quais entregas entram, e não há regra definida
2. **Chave Pix** — `BankAccount` tem banco, agência, conta e CPF, o suficiente
   para TED. A chave Pix precisaria de coluna nova; deixei para a Etapa 2, que é
   quem vai usá-la de fato
3. **Nenhum aviso ao entregador** quando o repasse cai. O `NotificationsService`
   do W1 está pronto para isso — falta decidir se avisa e com que texto
4. **Carência** — hoje o dinheiro fica disponível no instante da entrega. Se
   houver política de D+N, é só preencher `availableAt` diferente no `deliver()`
5. **Estorno depois do repasse** — pedido estornado cujo frete já foi repassado
   não tem tratamento. Depende da regra de estorno, que também não existe

#### O que isso destrava

Com a carteira de pé, a Etapa 2 é só trocar o pagamento manual por uma chamada
de API — o modelo, o saldo, a idempotência e o comprovante continuam iguais.
**Antes disso, vale confirmar com o gerente de conta do Mercado Pago se a
aplicação marketplace do cliente pode enviar Pix a terceiros por API.** Se não
puder, qualquer PSP com Pix out resolve, e o modelo aqui não muda.
