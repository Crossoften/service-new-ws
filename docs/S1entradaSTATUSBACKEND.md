<!-- Cole em docs/STATUSBACKEND.md, na seção 3, depois da Fase R. -->

### Fase S — Endereço por pedido e agendamento (BE-D2, BE-Q11) · ✅ entregue

**Um patch para dois objetivos, contra a regra do projeto.** Os dois mexem nos
mesmos três arquivos — o DTO de criação, o de resposta e o `create()` do
serviço — e separá-los exigiria reconstruir um estado intermediário que nunca
existiu nem foi testado. Preferi um patch verificado a dois patches sintéticos.

#### BE-D2 — endereço de entrega por pedido

**O diagnóstico do documento do front estava incompleto.** Ele diz que
`POST /food-orders` "não recebia endereço de entrega". Verdade — mas a causa não
é o pedido: **`User.addressId` é `@unique`**. O cliente tem **um** endereço no
cadastro. Não havia lista de onde escolher; quem quisesse receber no trabalho
tinha de editar o perfil antes e desfazer depois.

`CreateFoodOrderDto` passou a aceitar `deliveryAddress` opcional. Informado, o
endereço é gravado como **registro próprio do pedido** e não toca no cadastro.
Omitido, o pedido usa o endereço do perfil — o comportamento de sempre.

*Uma linha nova de `Address` por pedido, de propósito.* O endereço precisa ficar
congelado como estava na entrega; reaproveitar o registro do cadastro faria uma
edição de perfil reescrever para onde pedidos antigos foram entregues.

*E um gap que ninguém tinha registrado: o endereço nunca era devolvido na
resposta do pedido.* Só aparecia na resposta da entrega — o entregador via, o
cliente e o restaurante não. `ResponseFoodOrderDto` agora traz `deliveryAddress`.

#### BE-Q11 — agendamento

`scheduledFor` opcional, ISO 8601, com migration
`20260908120000_food_order_scheduled_for`. Nulo é pedido para agora, o que
inclui todos os já existentes.

**Não altera o `status`.** Quem move o pedido pela cozinha continua sendo o
restaurante; o campo serve para a tela dele separar o que é para já do que é
para depois. Não inventei estado novo de pedido.

*A checagem de "no futuro" fica no serviço*, não no DTO: `@IsDateString` valida
só o formato, e uma data bem formada e passada passaria pela validação
produzindo um pedido agendado para ontem.

#### Validação executada contra a API no ar

Mesmo pedido, mesmo restaurante, mudando só o endereço:

| Pedido | Endereço usado | Frete |
|---|---|---|
| sem `deliveryAddress` | perfil, ~0,5 km | **R$ 6,00** |
| com `deliveryAddress` a ~5 km | o do pedido | **R$ 12,00** |

O endereço correto veio na resposta nos dois casos, e o **perfil do cliente
permaneceu intacto** depois do pedido com endereço próprio — conferido em
seguida no `GET /profile/me`.

Agendamento: no passado → `400` "precisa ser no futuro"; `"hoje à noite"` →
`400` do validador de formato.

`npx jest`: 17 suítes, **138 testes passando** (13 novos). Build e lint limpos.
Cadeia `O2 → P1 → Q1 → R1 → S1` verificada a partir de `11fdde7`, byte a byte.

**Depois de aplicar:** `npx prisma migrate deploy && npx prisma generate`, e
`npm run swagger:generate`.

**Decisões que ficaram de fora, de propósito:**

- **Teto de antecedência do agendamento.** Hoje aceita qualquer data futura,
  inclusive 2099. Um limite (7 dias é o usual no mercado) evita pedido criado por
  erro de digitação, mas o número é seu
- **Janela de horário por restaurante.** O restaurante não declara quando aceita
  agendamento, então nada impede agendar para as 4h da manhã
- **O pedido agendado vai para a cozinha na hora.** Como o `status` não muda, ele
  aparece na lista do restaurante junto com os demais. Se o certo for só
  aparecer perto do horário, isso é filtro na consulta — me peça
