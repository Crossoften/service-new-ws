<!-- Cole em docs/STATUSBACKEND.md, na seção 3, depois da Fase I. -->

### Fase J — Coordenadas no endereço (BE-Q7) · ✅ entregue

**O furo era meu.** A Fase C adicionou `latitude` e `longitude` ao modelo
`Address`, com um comentário dizendo "quem preenche é o front, ao geocodificar o
endereço escolhido". **O DTO para o front preencher nunca foi criado.** Nem o
`UpdateAddressDto` aceitava os campos, nem o `ResponseAddressDto` os devolvia.

Consequência: as colunas existiam e ficavam sempre nulas. O frete por distância
— a Fase C inteira — caía na faixa padrão em todos os pedidos, e o app do
entregador não tinha destino para traçar rota. A auditoria do front registrou
isso corretamente como BE-Q7.

**Patch J1 — 4 arquivos**

- `UpdateAddressDto` aceita `latitude` e `longitude`, opcionais, validados por
  `@IsLatitude`/`@IsLongitude` e convertidos por `@Type(() => Number)` — mesma
  convenção do `UpdateDeliveryLocationDto`, que já existia. Coordenada enviada
  como texto (`"-18.9186"`) é convertida, porque é assim que a geocodificação do
  Google devolve e o front raramente converte antes
- `ResponseAddressDto` devolve as duas como **string**, seguindo o
  `currentLat` do `ResponseDeliveryDto` — `Decimal` serializado como número
  perderia precisão nas últimas casas
- `profile.service.ts` grava nos dois caminhos (endereço novo e atualização) e
  devolve no `findMine` e no `updateMyAddress`

**Validação.** `npx jest`: 11 suítes, **87 testes passando** (6 novos, na
validação do DTO: faixa, tipo, conversão de texto e ausência). Build e lint
limpos. Cadeia `F1 → G1 → H1 → I1 → J1` verificada em worktree a partir de
`98b4e05`, byte a byte.

**Depois de aplicar:** `npm run swagger:generate`.

---

### Descoberta durante a Fase J: o restaurante nunca teve endereço

O `Restaurant` tem `addressId` no schema, e **nenhuma linha do sistema o
preenche**. O `restaurants.service.create()` grava nome, descrição, imagem e
categoria — nada de endereço. É o terceiro caso do mesmo padrão neste projeto,
depois do `FoodOrder` no enum de pagamento e do `Expired` na assinatura:
declarado no modelo, nunca usado.

Isso significa que **o J1 sozinho não faz o frete variar**. O cálculo precisa
das duas pontas: o endereço do cliente (resolvido aqui) e o do restaurante, que
é a origem. Com `restaurant.address` sempre nulo, o `calculateDeliveryFee`
continua caindo na faixa padrão.

Para o **mapa**, porém, o J1 basta: a rota do entregador sai do GPS dele — que
já é enviado e transmitido — e chega no endereço do cliente, que agora tem
coordenada.

Resolver a origem exige decidir se o endereço do restaurante é próprio ou
herdado do perfil do dono, e expor os campos no cadastro. Não fiz junto para não
misturar uma correção de contrato com uma decisão de produto.
