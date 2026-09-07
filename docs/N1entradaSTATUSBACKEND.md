<!-- Cole em docs/STATUSBACKEND.md, na seção 3, depois da Fase M. -->

### Fase N — Tempo de entrega e payout por período (BE-D1, BE-F2) · ✅ entregue

#### BE-D1 — tempo de entrega

A vitrine exibia tempo de entrega e **não havia campo nenhum no back** para
alimentá-lo. Sobre o outro item do BE-D1, o logo: `Restaurant.imageUrl` já
existe e já é devolvido na resposta — essa parte da auditoria do front está
desatualizada, nada a fazer.

`deliveryTimeMinMinutes` e `deliveryTimeMaxMinutes`, opcionais, com migration
`20260907230000_restaurant_delivery_time`. Dois campos em vez de um porque a
tela mostra intervalo ("30-45 min"); preenchendo os dois iguais, vira número
único. Nulo é "não informado" — a tela deve **omitir** o tempo, não exibir zero:
restaurante que não configurou é diferente de restaurante que entrega na hora.

Teto de 480 minutos e piso de 1, por campo. E uma regra que o `class-validator`
não cobre sozinho: **máximo não pode ser menor que mínimo**. A comparação entre
dois campos do mesmo objeto exigiria validador próprio, então ficou no serviço,
com exceção dedicada e mensagem que explica o problema em vez de apontar campo.

*A checagem no update compara com o que já está gravado*, não só com o payload.
Mandar apenas o máximo, menor que o mínimo existente, produziria faixa inválida
sem que a requisição sozinha parecesse errada.

#### BE-F2 — recorte por período no payout

`GET /v1/restaurants/me/payouts` aceita `?period=day|week|month`. **Sem o
parâmetro, o comportamento é idêntico ao anterior** — todo o histórico —, então
nada quebra para quem já consome a rota. A resposta ganhou o campo `period`,
que devolve `all` quando nenhum recorte foi pedido.

As fronteiras são as mesmas de `GET /v1/deliveries/me/earnings`: `day` à
meia-noite de hoje, `week` no domingo desta semana, `month` no dia 1º.
Escolhi o parâmetro opcional em vez de devolver os quatro baldes de uma vez
(como faz a rota do entregador) justamente para não alterar o contrato atual.

#### Validação executada contra a API no ar

- gravar `30-45 min` → devolvido na resposta e na listagem da vitrine
- faixa invertida no mesmo payload (`min 60`, `max 20`) → **`400`** com a
  mensagem correta
- só o máximo (`10`), menor que o mínimo **já gravado** (`30`) → **`400`**
- payout com quatro pedidos entregues, plantados em datas diferentes:
  `day` → 2 pedidos · `week` → 2 · `month` → 3 · sem filtro → 4, com os valores
  de itens, comissão e líquido acompanhando
- `?period=ano` → `400` com a lista de valores aceitos

`npx jest`: 14 suítes, **109 testes passando** (7 novos). Build e lint limpos.
Cadeia `F1 → … → N1`, dez patches, verificada em worktree a partir de `98b4e05`,
byte a byte.

**Depois de aplicar:** `npx prisma migrate deploy && npx prisma generate`, e
`npm run swagger:generate`.

#### BE-D5 — não mexi, e o problema é maior do que o registrado

A auditoria do front diz que `GET /restaurants/categories` não traz `iconUrl`.
Conferi: **a rota traz** — o campo está no `select` e na resposta. O que não
existe é **dado**: consultei as cinco tabelas de categoria no banco e
**nenhuma linha tem ícone**, incluindo as de serviço, que têm seed próprio para
isso.

A causa é que o seed de serviço monta a URL a partir de
`SERVICE_CATEGORY_PUBLIC_URL_BASE`, que vem **vazia** no `.env.example` — e o
próprio arquivo documenta que, vazia, "as categorias ficam sem imagem". As
outras quatro tabelas nem têm mecanismo de ícone.

Não resolvi porque a decisão é de infraestrutura, não de código: onde hospedar
os ícones (bucket, CDN, ou servidos pela própria API, como os uploads da Fase L
agora são). O front tem contorno local por slug, então nada está bloqueado.
