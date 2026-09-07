<!-- Cole em docs/STATUSBACKEND.md, na seção 3, depois da Fase N. -->

### Fase O — Ícones de categoria pela API (BE-D5) · ✅ entregue

**O diagnóstico do documento do front estava incompleto.** Ele registra que
`GET /restaurants/categories` não traz `iconUrl`. A rota **traz** — o campo está
no `select` e na resposta. O que não existe é dado: consultei as cinco tabelas e
nenhuma linha tinha ícone, incluindo as de serviço, que já tinham seed próprio
para isso.

E o inventário é pior do que parece: **existe um único arquivo de ícone no
repositório inteiro** (`pintor.png`). As outras oito categorias de serviço
apontavam para caminhos sem arquivo, e as quatro tabelas restantes não tinham
mecanismo de ícone nenhum.

**Patch O1 — 18 arquivos**

*Rota pública* `GET /v1/category-icons/:vertical/:arquivo`, servindo de
`assets/category-icons/<vertical>/`. Pública por desenho: é imagem de vitrine,
exibida antes de qualquer login. Responde com `Cache-Control` de um dia — ícone
muda raramente e é pedido em toda abertura de tela.

*O ponto central do desenho: orientado a arquivo.* O seed grava `iconUrl`
**apenas para a categoria que tem imagem em disco**. Antes, a URL era montada às
cegas: com `SERVICE_CATEGORY_PUBLIC_URL_BASE` vazia, ninguém tinha ícone;
preenchida, **todas** as nove categorias de serviço apontariam para lá,
inclusive as oito sem arquivo — nove URLs, oito quebradas.

Agora é só soltar `<slug>.png` na pasta da vertical e rodar `npm run seed`.
Funciona porque o K1 tornou o seed re-executável; sem aquele patch, este
mecanismo seria inútil em qualquer banco já semeado.

*Rodar o seed sem os ícones não apaga os já gravados* — `iconUrl` fica fora do
`update` quando não há arquivo.

*As cinco verticais ganharam o mecanismo*, não só serviço: restaurante, produto,
hospedagem e transporte usam o mesmo resolvedor.

*`SERVICE_CATEGORY_PUBLIC_URL_BASE` mantém precedência.* Quem já hospeda os
ícones em bucket ou CDN não deve passar a servi-los pela API só porque este
mecanismo apareceu — preenchida, as URLs apontam para lá e a rota nova deixa de
ser usada.

**Validação executada contra a API no ar**, com um ícone plantado em duas
verticais:

- URL gravada pelo seed, buscada **sem token** → `200`, `image/png`, bytes
  idênticos ao arquivo em disco
- `Cache-Control: public, max-age=86400` presente
- arquivo inexistente → `404` · vertical desconhecida → `404` · travessia
  (`..%2f..%2f..%2fetc%2fpasswd`) → `404` · extensão fora da lista, **mesmo com
  o arquivo existindo** → `404`
- `GET /v1/products/categories` devolve `iconUrl` só na categoria com arquivo;
  as demais vêm nulas, como projetado

`npx jest`: 15 suítes, **120 testes passando** (11 novos). Build e lint limpos.
Cadeia `F1 → … → O1`, onze patches, verificada a partir de `98b4e05`, byte a
byte.

**Depois de aplicar:**

1. `git mv prisma/seeds/images/services-categories/pintor.png assets/category-icons/services/`
   — o patch não carrega binário, então o único ícone existente precisa ser
   movido à mão
2. `npm run seed`
3. `npm run swagger:generate`

**Resíduo: falta o conteúdo.** O mecanismo está pronto e testado, mas há **um**
ícone para trinta e cinco categorias. Enquanto os arquivos não chegarem,
`iconUrl` continua nulo e o front segue com o fallback local por slug — que é o
comportamento correto, e não quebra nada.
