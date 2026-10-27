# Orientações para o front — correções de back-end (27/10)

Contexto: as cinco demandas levantadas na integração do Service App foram
atendidas. Abaixo, o que mudou em cada uma, o contrato exato, e o que o front
precisa fazer. No fim, a regra da porcentagem do delivery e a mensagem que o app
precisa montar.

Tudo o que está aqui já está no `docs/swagger.json` regenerado.

---

## 1. Código de indicação do influencer — resolvido

**Diagnóstico corrigido:** o back-end já retornava `referralCode` nos dois
endpoints, e o cadastro já gerava um código para todo usuário registrado. O
campo vinha ausente porque estava **nulo no banco** — a conta de exemplo
`influencer one` era criada pelo seed sem código, e o campo é opcional, então
`null` virava ausência no JSON. Vocês testaram com a conta semeada.

**O que mudou:**

- `GET /v1/referrals/me/summary` e `GET /v1/referrals/me` agora **geram o código
  na primeira leitura** se ele estiver faltando, gravam e devolvem. Nenhuma
  conta de influencer fica sem código a partir do primeiro acesso.
- O seed passou a criar o `influencer one` com o código fixo **`influencer-one`**
  — usem esse valor como código de convite nos testes manuais.

**Para o app:** nada a mudar na chamada. `referralCode` passa a vir preenchido.

> Observação: `GET /v1/profile/me` devolve o mesmo campo, mas **não** gera sob
> demanda — ele só reflete o que está gravado. Se a tela "Meu link" ler o
> perfil, chame um dos endpoints de indicação primeiro, ou leia o código de lá.

---

## 2. Coordenadas de coleta e entrega — resolvido

**Diagnóstico corrigido:** a estrutura dos dois pontos já existia na resposta.
O que faltava eram as coordenadas dentro dela.

**O que mudou:** `ResponseDeliveryAddressDto` ganhou `latitude` e `longitude`,
**em texto**, no mesmo formato de `currentLat`/`currentLng`. Os dois pontos:

```
foodOrder.restaurant.address      -> COLETA
foodOrder.deliveryAddress         -> ENTREGA
```

Cada um traz, hoje:

```json
{
  "street": "Rua da Consolação",
  "neighborhood": "Centro",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "01301000",
  "number": "100",
  "latitude": "-23.5505199",
  "longitude": "-46.6333094"
}
```

Não foram criados `pickupLat`/`pickupLng`/`dropoffLat`/`dropoffLng` soltos: o
endereço legível que vocês pediram "se possível" **já vinha** nesse mesmo
objeto, e dois caminhos para o mesmo dado divergem com o tempo.

Os três pontos do mapa saem no mesmo formato (texto):
`currentLat`/`currentLng` do entregador, e `latitude`/`longitude` dos dois
endereços.

**Atenção — isto vai acontecer em produção:** as coordenadas são **opcionais** no
banco. Quem as preenche é o front, ao geocodificar o endereço escolhido;
endereço cadastrado antes disso **não tem**. Quando faltam, o campo vem
**ausente** — nunca `0`, de propósito, porque `0,0` no mapa é o meio do
Atlântico e um marcador lá é pior que marcador nenhum.

Então a tela precisa de um caminho para o caso de faltar coordenada: mostrar o
endereço escrito e desabilitar a rota, em vez de assumir que sempre vem.

E a chave do Google Maps precisa da **Directions API** habilitada.

---

## 3 e 4. Motivo da recusa — reserva e aluguel — resolvido

**Obrigatório na recusa**, conforme a regra do cliente.

```
PATCH /v1/bookings/{id}/respond
PATCH /v1/rentals/{id}/respond
```

Corpo:

```json
{ "status": "Rejected", "rejectReason": "A acomodação está indisponível nessas datas." }
```

- `status: 'Rejected'` **sem** `rejectReason` responde **400** com
  `"Informe o motivo da recusa."` — a tela precisa exigir o campo antes de enviar.
- Motivo só com espaços também é recusado (o texto é aparado antes de validar).
- Não há limite de tamanho.
- Na **aprovação** (`Confirmed` para reserva, `Accepted` para aluguel) o campo
  não é necessário; se vier, é ignorado sem erro.

**Leitura:** `rejectReason` volta em `ResponseBookingDto` e `ResponseRentalDto`,
junto do `rejectedAt` que já existia.

---

## 5. Motivo da recusa — compra e venda — resolvido

**Nada muda no envio.** Vocês já mandam `message` ao responder, e esse texto já
era postado no chat da negociação. Agora, quando o status é `Rejected`, o
**mesmo texto** passa a ser gravado no registro e devolvido na leitura:

```
PATCH /v1/commercial-transactions/{id}/respond
{ "status": "Rejected", "message": "O item já foi vendido." }
```

**Leitura:** `rejectReason` em `ResponseCommercialTransactionDto`, no detalhe e
na listagem.

Aqui o motivo **não é obrigatório** — diferente de reserva e aluguel. A regra de
justificativa obrigatória foi definida para hospedagem e aluguel; em compra e
venda o fluxo que já está no ar permite recusar sem mensagem, e não quebramos
isso. O chat continua tendo o mesmo texto: a coluna é o registro da decisão,
para a tela de detalhe não depender de abrir a conversa.

---

# A regra da porcentagem do delivery, e a mensagem no app

Esta é a parte nova de produto, e precisa de tela.

## A regra, exatamente como está no código

**Quem opera delivery paga assinatura E porcentagem, sem exceção.**

1. **Assinatura ativa é condição para criar restaurante.** `POST /v1/restaurants`
   responde **403** sem assinatura vigente. Antes havia uma isenção para quem
   faturava por comissão — ela deixou de existir.
2. **A assinatura também é verificada a cada pedido.** Restaurante com
   assinatura vencida para de receber pedido novo (409 no lado do cliente).
3. **A porcentagem não é cobrada na criação e não impede nada.** Ela só existe
   quando há pedido.
4. **A porcentagem incide por pedido, sobre o valor dos ITENS.** Frete e gorjeta
   **não** entram na base — são do entregador.
5. **A retenção é na fonte, pedido por pedido**, pelo split do Mercado Pago. Não
   existe fatura mensal, nem boleto, nem cobrança posterior.
6. **Sem pedido, sem porcentagem.** Zero faturamento, zero retenção.
7. **Pedido pago na entrega não tem retenção** — dinheiro ou cartão na
   maquininha do próprio estabelecimento. O valor não passa pela plataforma.
8. **O percentual é definido pelo administrador**, não fixo no código. Há um
   padrão global no painel e pode haver uma taxa individual por fornecedor, que
   prevalece sobre o padrão.

## O que a mensagem NÃO deve dizer

- Não prometer **fatura mensal** nem "cobrança sobre o faturamento do mês": não
  existe. É retenção automática por pedido.
- Não dizer "porcentagem sobre o pedido" sem qualificar: a base é **só os itens**.
- Não omitir o caso do **pagamento na entrega**, que não tem retenção.

## Texto sugerido

Para a tela de criação de restaurante, depois de confirmada a assinatura:

> **Além da assinatura, há uma comissão por pedido**
>
> Para operar delivery você precisa de assinatura ativa — e ela está em dia.
>
> Além dela, a plataforma retém **{X}%** sobre o valor dos **itens** de cada
> pedido pago pelo aplicativo. O desconto é automático, no recebimento de cada
> pedido: não há fatura mensal nem cobrança posterior.
>
> Frete e gorjeta não entram nesse cálculo, e pedidos pagos na entrega (dinheiro
> ou maquininha do estabelecimento) não têm retenção.

Versão curta, para rodapé ou aviso de confirmação:

> Assinatura ativa + **{X}%** sobre os itens de cada pedido pago pelo app.
> Descontado automaticamente por pedido. Frete e gorjeta não entram.

## De onde vem o {X}

Do perfil do fornecedor autenticado:

```
GET /v1/profile/me
{
  ...
  "profileType": "Supplier",
  "deliveryCommissionRate": 20,
  ...
}
```

É o percentual **já resolvido**: a taxa própria daquele fornecedor quando o
administrador cadastrou uma, senão a taxa global do painel. A tela não precisa
conhecer essa precedência — e não corre o risco de divergir dela.

Três coisas a saber:

- O campo vem **apenas no perfil de fornecedor** (`profileType: "Supplier"`).
  Nos outros perfis ele é ausente, porque delivery é vertical de fornecedor.
- Vem como **número** (`20`, não `"20.00"`), igual ao `commissionRate` que já
  existe nesse mesmo endpoint.
- `0` é um valor legítimo: significa que o administrador isentou aquele
  fornecedor. A tela deve mostrar `0%`, não cair em um padrão.

**Não codifiquem o percentual no app.** Ele é configurável pelo administrador e
muda sem deploy; um número fixo na tela vira informação errada na primeira
alteração. Leiam sempre do perfil.

Depois que o restaurante existe, o painel do fornecedor já tem tudo:

```
GET /v1/restaurants/me/payouts?period=...
{
  "billingType": "...",
  "commissionRate": "20.00",      // o percentual que vale para ele
  "totalOrders": 12,
  "totalItemsValue": "1500.00",
  "totalCommission": "300.00",    // total contribuído à plataforma
  "netAmount": "1200.00",
  "period": "all"
}
```

O `totalCommission` é o "total de contribuição" pedido, e conta **apenas** os
pedidos que passaram pela plataforma — pedido pago na entrega não entra, porque
dele não houve retenção.

---

## Resumo do que precisa de trabalho no front

| | |
|---|---|
| Indicação | nada — `referralCode` passa a vir preenchido |
| Rota do entregador | ler `latitude`/`longitude` dos dois endereços **e tratar ausência** |
| Recusa de reserva | campo de motivo **obrigatório** antes de enviar |
| Recusa de aluguel | idem |
| Recusa de negociação | nada no envio; exibir `rejectReason` no detalhe |
| Delivery | **tela nova**: aviso de assinatura + porcentagem na criação do restaurante |
| Painel do fornecedor | consumir `/restaurants/me/payouts` (já pronto no back) |
