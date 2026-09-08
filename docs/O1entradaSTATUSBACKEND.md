<!-- Cole em docs/STATUSBACKEND.md, na seção 3, depois da Fase N. -->

### Fase O — Ícone de categoria só quando o arquivo existe · ✅ entregue

**Decisão da Brendha:** os ícones ficam no front, que já os traz localmente e os
mapeia por slug. Nada foi transferido para o back — e isso está certo: para as
categorias que vêm do seed, o arquivo local carrega instantâneo, funciona
offline e não corre risco de 404.

**O diagnóstico do documento do front estava incompleto.** Ele registra que
`GET /restaurants/categories` não traz `iconUrl`. A rota **traz** — o campo está
no `select` e na resposta. O que não existe é dado.

**O bug real, e é uma armadilha armada.** O seed montava a URL do ícone para
**todas** as nove categorias de serviço a partir de
`SERVICE_CATEGORY_PUBLIC_URL_BASE`. Existe **um único arquivo de imagem no
repositório inteiro** (`pintor.png`). Com a variável vazia — o padrão — nenhuma
categoria ficava com ícone e o problema não aparecia. No dia em que alguém
preenchesse aquela variável, as nove ganhariam URL e **oito apontariam para
arquivo inexistente**: a vitrine passaria a exibir imagem quebrada exatamente
onde hoje exibe o fallback do app. Um ajuste de ambiente, sem deploy de código,
quebraria a tela.

**Patch O1 — 5 arquivos**

- `serviceCategoryIconExists` em `service-category.constants.ts`, ao lado do
  construtor de URL que já morava lá. Confere o arquivo nos dois diretórios que
  o projeto tem: `assets/service-categories`, que casa com o caminho declarado
  em `localIcon`, e `images/services-categories`, onde a única imagem está de
  fato guardada
- O seed só monta a URL para categoria cuja imagem existe
- `iconUrl` fica **fora do update** quando não há URL a gravar: rodar o seed sem
  a variável configurada não pode apagar ícone que o admin tenha definido pelo
  painel
- `.env.example` explica as duas situações em vez de só avisar que "vazia, as
  categorias ficam sem imagem"

**Validação executada contra o banco:**

- base vazia (o padrão) → 9 categorias, **0 com ícone** — idêntico a hoje
- base preenchida → **1 com ícone** (`pintor`, a única com arquivo), 8 seguem
  nulas. Antes deste patch, seriam 9 URLs, 8 quebradas

`npx jest`: 15 suítes, **116 testes passando** (7 novos). Build e lint limpos.
Cadeia `F1 → … → O1`, onze patches, verificada a partir de `98b4e05`, byte a
byte.

**Nada a rodar depois de aplicar** além do `npm run seed`, se quiser refletir no
banco. Sem migration, sem swagger — o patch não muda contrato.

#### Registro de uma correção de rumo

A primeira versão desta fase construía uma rota pública
`GET /v1/category-icons/:vertical/:arquivo`, um diretório `assets/` versionado e
o mecanismo estendido às cinco verticais — cerca de 200 linhas a mais. Foi
descartada: parti de "servir os ícones pela API" sem antes verificar onde eles
estavam, e eles já estavam no front.

**O que sobreviveu da investigação, e continua valendo:** existe **CRUD de
categoria no admin** (`POST /v1/admin-categories/:context`), e o
`CreateCategoryDto` já aceita `iconUrl` e `iconKey`. Categoria criada pelo
painel depois que o app foi publicado **não tem ícone local no front** — o
fallback por slug não tem para onde cair. Para essas, a tela do admin precisa
subir a imagem em `POST /v1/upload/one-file` e mandar `iconUrl`/`iconKey` na
criação. O caminho já funciona, inclusive sem AWS, por causa da Fase L.
