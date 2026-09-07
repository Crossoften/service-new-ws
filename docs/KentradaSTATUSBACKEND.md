<!-- Cole em docs/STATUSBACKEND.md, na seção 3, depois da Fase J. -->

### Fase K — Seeds: idempotência e categorias faltantes (BE-Q9) · ✅ entregue

**Primeira validação contra banco real deste projeto.** O container desta sessão
tinha MySQL 8 disponível, então pela primeira vez eu não só compilei: subi o
banco, apliquei todas as migrations, rodei os seeds e a API, e exercitei as
rotas por HTTP. Boa parte do que está registrado abaixo só apareceu porque o
código foi executado.

#### Patch K1 — seeds idempotentes (pré-requisito do K2)

`npm run seed` **nunca pôde rodar duas vezes.** O `admin.seeds.ts` usava
`create` direto em e-mail único e estourava `P2002` na primeira linha — e como
ele é o primeiro do `index.ts`, derrubava tudo que vinha depois: categorias,
planos, textos. Na prática o seed era executável uma única vez na vida de cada
banco, e qualquer categoria nova adicionada depois nunca chegaria às bases
existentes.

Isso torna o K1 **pré-requisito do K2**: sem ele, o patch das categorias não tem
efeito em nenhum banco que já tenha admin — ou seja, em todos.

- `admin.seeds.ts` → `upsert` por e-mail e por nome de permissão. A senha só é
  gravada na criação: rodar o seed de novo não pode sobrescrever senha trocada.
  As permissões são reconectadas no update, para cobrir valor novo do enum
  adicionado depois que a conta já existia
- `user.seeds.ts` → `createMany` com `skipDuplicates`
- `text.seeds.ts` → **bug silencioso**: `Text.type` não tem constraint única e o
  seed usava `createMany` puro. Cada execução inseria mais cinco linhas, e a
  leitura passava a devolver uma versão arbitrária entre as duplicatas. Agora
  atualiza no lugar quando já existe

#### Patch K2 — categorias de produto, hospedagem e transporte (BE-Q9)

Três tabelas de categoria sem seed nenhum. Como
`GET /{products|accommodations|transportations}/categories` filtra
`isActive: true`, o dropdown vinha vazio e **o fornecedor não conseguia
cadastrar** produto, hospedagem nem transporte. Serviço e delivery funcionavam
porque tinham seed.

Oito categorias de produto, sete de hospedagem, seis de transporte, no mesmo
padrão do seed de restaurante (`upsert` por slug). `isActive` fica de fora do
update de propósito: se o admin desativou uma categoria, rodar o seed de novo
não pode reativá-la sozinho.

**As listas são ponto de partida genérico.** Quem define as categorias reais é o
negócio — o que não podia continuar era a tabela vazia.

#### Validação executada, não inferida

- Migrations: **todas aplicadas** num MySQL 8.0.46 real, incluindo o
  `ALTER TABLE` do F1 (enum) e do H1 (coluna), que até aqui nunca tinham sido
  executados
- Seed rodado **três vezes seguidas** numa base já povoada: `exit 0` nas três, e
  as contagens de textos, usuários, categorias, permissões e planos ficaram
  estáveis
- `GET /products/categories` → 8 · `/accommodations/categories` → 7 ·
  `/transportations/categories` → 6, todas com acentuação correta
- **J1**: `PATCH /v1/profile/me/address` grava e devolve `latitude`/`longitude`;
  voltam também no `GET /v1/profile/me`; latitude 999 responde `400`
- **G1**: pedido com assinatura vigente → `201`; assinatura do restaurante
  vencida no banco, mesmo pedido → **`409`** com a mensagem correta. E o
  restaurante **continua aparecendo** em `GET /v1/restaurants`, que é exatamente
  a decisão tomada: continua visível, sem vender
- **F1**: pagar pedido em dinheiro → `400`; restaurante tentando pagar pedido do
  cliente → `403`
- **Fase C**: pedido com as duas pontas geolocalizadas saiu com frete de
  **R$ 6,00** — a faixa 0-3 km, não a padrão de R$ 8,00. O cálculo por distância
  funciona; o que faltava era coordenada, que é o que o J1 destravou

`npx jest`: 11 suítes, 87 testes passando. Build limpo. Cadeia `F1 → G1 → H1 →
I1 → J1 → K1 → K2` verificada em worktree a partir de `98b4e05`, byte a byte.

**Ordem de aplicação:** K1 antes do K2. Depois: `npm run seed`.

**Resíduo.** `Text.type` continua sem constraint única — o K1 contorna, mas a
correção de raiz é uma migration com `@unique`, que só pode entrar depois de
limpar as duplicatas que já existam em cada banco.
