<!-- Cole em docs/STATUSBACKEND.md, na seção 3, depois da Fase L. -->

### Fase M — Endereço próprio do restaurante · ✅ entregue

Fecha o que a Fase J deixou pela metade. O endereço do cliente já podia receber
coordenada; faltava a **origem** — e o `Restaurant.addressId` existia no schema
com **nenhuma linha do sistema o preenchendo**. Enquanto a origem fosse nula, o
frete continuava caindo na faixa padrão por mais geolocalizado que estivesse o
cliente.

**Decisão da Brendha:** endereço **próprio do restaurante**, não herdado do
perfil do dono. O fornecedor pode morar longe da cozinha, e é da cozinha que a
entrega sai.

**Patch M1 — 6 arquivos**

- `RestaurantAddressDto` — logradouro, número, bairro, cidade, estado, CEP,
  latitude e longitude. Todos opcionais; coordenada validada por
  `@IsLatitude`/`@IsLongitude` e convertida de texto, como no J1
- `CreateRestaurantDto` e `UpdateRestaurantDto` ganham `address`, aninhado e com
  `@ValidateNested`. Sem esse decorador o objeto passaria **sem checagem
  nenhuma** e a coordenada inválida só estouraria no banco — há teste cobrindo
- No update, o endereço é criado quando não existe e atualizado quando existe.
  Cobrir os dois casos não é zelo: **nenhum restaurante tem endereço hoje**
- `ResponseRestaurantDto` devolve o endereço, com as coordenadas como string —
  mesma convenção do J1

*Detalhe do Prisma que mudou o desenho.* A primeira versão usava escrita
aninhada (`address: { create }`) junto com `categoryId`/`userId` escalares, e o
Prisma recusa a mistura — é a separação entre input "checked" e "unchecked". O
endereço passou a ser criado à parte e ligado pelo `addressId`.

*`toAddressData` manda só o que veio.* `undefined` no Prisma é "não mexe";
`null` apagaria. Atualizar só a coordenada não pode zerar a rua.

**Validação executada contra a API no ar, movendo o restaurante de lugar:**

| Distância do cliente | Faixa aplicável | Frete cobrado |
|---|---|---|
| ~1,5 km | 0-3 km, fixa R$ 6,00 | **R$ 6,00** |
| ~5 km | 3-10 km, fixa R$ 12,00 | **R$ 12,00** |
| ~50 km | 10 km+, 20% dos itens | **R$ 5,00** |

As três faixas responderam. Também criei um restaurante do zero com endereço
(`201`, endereço devolvido na resposta).

`npx jest`: 13 suítes, **102 testes passando** (6 novos). Build e lint limpos.
Cadeia `F1 → … → M1` verificada em worktree a partir de `98b4e05`, byte a byte.

**Depois de aplicar:** `npm run swagger:generate`.

**Achado colateral, e é de negócio.** Com as faixas de exemplo do `seed:test`,
uma entrega de **50 km custa R$ 5,00 — menos que uma de 5 km, que custa R$ 12**.
A faixa percentual (20% dos itens) não tem piso, então pedido pequeno e distante
sai quase de graça. Não é bug de código: é a configuração de exemplo. Mas
mostra que as faixas reais precisam ou de um valor mínimo na faixa percentual,
ou de faixas fixas até um limite maior. Vale decidir antes de qualquer cliente
real fazer pedido.
