<!-- Cole em docs/STATUSBACKEND.md, na seção 3, depois da Fase O. Se você já
     colou a entrada da Fase O que descrevia a rota de ícones, substitua-a por
     esta: aquela descreve código que deixou de existir. -->

### Fase O (revisada) — Ícone de categoria só quando o arquivo existe · ✅ entregue

**A Fase O foi refeita menor, depois de uma pergunta da Brendha que mudou o
diagnóstico:** os ícones já estavam todos no front, mapeados por slug. A
primeira versão construiu uma rota pública `GET /v1/category-icons/...`, um
diretório `assets/` versionado e o mecanismo estendido às cinco verticais — para
um problema que não existia. Parti de "servir os ícones pela API" sem antes
verificar onde eles estavam.

Este patch **remove** aquela infraestrutura (módulo, controller, README,
`.gitkeep`s, e o `iconUrl` que eu tinha enfiado nos quatro seeds de categoria) e
mantém só a parte que corrigia um bug de verdade. Saldo: **342 linhas removidas,
119 adicionadas**.

**Manter os ícones no front está certo.** Para categoria que vem do seed, o
arquivo local carrega instantâneo, funciona offline e não corre risco de 404.

**O bug que sobrevive, e é uma armadilha armada.** O seed montava a URL para
**todas** as nove categorias de serviço a partir de
`SERVICE_CATEGORY_PUBLIC_URL_BASE`. Existe **um único arquivo de imagem no
repositório inteiro** (`pintor.png`). Com a variável vazia — o padrão — ninguém
fica com ícone e nada aparece. No dia em que alguém preenchesse aquela variável,
as nove ganhariam URL e **oito apontariam para arquivo inexistente**: a vitrine
passaria a exibir imagem quebrada exatamente onde hoje exibe o fallback do app.
Um ajuste de ambiente, sem deploy de código, quebraria a tela.

**Patch O2 — 20 arquivos**

- `serviceCategoryIconExists` em `service-category.constants.ts`, ao lado do
  construtor de URL que já morava lá. Procura em `assets/category-icons/services`
  — onde a imagem está depois do `git mv` — e nos dois diretórios herdados
- O seed só monta a URL para categoria cuja imagem existe
- `iconUrl` fica **fora do update** quando não há URL a gravar: rodar o seed sem
  a variável configurada não pode apagar ícone que o admin definiu pelo painel
- Remoção de tudo que a primeira versão criou. **O `pintor.png` é preservado**
  onde está — patch não carrega binário, e movê-lo de volta exigiria `git mv`
  manual sem ganho nenhum

**Validação executada contra o banco:**

- base vazia (o padrão) → 9 categorias, **0 com ícone** — idêntico a hoje
- base preenchida → **1 com ícone** (`pintor`), 8 seguem nulas. Antes, seriam
  9 URLs e 8 quebradas

`npx jest`: 15 suítes, **116 testes passando** (7 novos). Build e lint limpos.
Patch verificado aplicando sobre `11fdde7`, com conferência byte a byte, mais a
checagem explícita de que o módulo sumiu e o ícone continua lá.

**Nada a rodar depois de aplicar** além de `npm run seed`, se quiser refletir no
banco. Sem migration, sem swagger — não muda contrato.

#### O que continua valendo da investigação

Existe **CRUD de categoria no admin** (`POST /v1/admin-categories/:context`), e
o `CreateCategoryDto` já aceita `iconUrl` e `iconKey`. Categoria criada pelo
painel **depois** que o app foi publicado não tem ícone local no front — o
fallback por slug não tem para onde cair. Para essas, a tela do admin precisa
subir a imagem em `POST /v1/upload/one-file` e mandar `iconUrl`/`iconKey` na
criação. O caminho já funciona, inclusive sem AWS, por causa da Fase L.

É o único ponto em que o `iconUrl` do back é de fato necessário.
