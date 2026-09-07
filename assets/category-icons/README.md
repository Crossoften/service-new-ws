# Ícones de categoria

Servidos pela própria API em `GET /v1/category-icons/:vertical/:arquivo`, rota
pública — é imagem de vitrine, exibida antes de qualquer login.

## Como adicionar

Solte o arquivo na pasta da vertical, **nomeado pelo slug da categoria**, e rode
o seed:

```
assets/category-icons/services/pintor.png
assets/category-icons/products/eletronicos.png
assets/category-icons/restaurants/pizzas.svg
```

```bash
npm run seed
```

Extensões aceitas: `png`, `jpg`, `jpeg`, `webp`, `svg`.

## O que o seed faz

Grava `iconUrl` **apenas para a categoria que tem arquivo em disco**. Categoria
sem arquivo fica com `iconUrl` nulo, e o front usa o fallback dele — melhor do
que apontar para uma URL que responde 404.

Rodar o seed sem os ícones em disco **não apaga** os que já estavam gravados.

## Hospedagem externa

Definindo `SERVICE_CATEGORY_PUBLIC_URL_BASE`, as URLs passam a apontar para lá
(`<base>/<vertical>/<arquivo>`) e a rota da API deixa de ser usada. A variável
tem precedência justamente para que quem já serve os ícones por bucket ou CDN
não passe a servi-los pela API só porque este mecanismo existe.

O diretório raiz pode ser trocado com `CATEGORY_ICONS_DIR`.
