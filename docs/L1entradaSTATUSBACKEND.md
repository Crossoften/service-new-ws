<!-- Cole em docs/STATUSBACKEND.md, na seção 3, depois da Fase K. -->

### Fase L — Upload com fallback em disco (BE-Q8) · ✅ entregue

**O problema.** `UploadService` construía o `S3Client` sem checar se as
credenciais existiam, e gravava **exclusivamente** no S3. Sem as quatro `AWS_*`
— que nem estavam no `.env.example` — o `send` estourava e a rota devolvia
`500`. Isso derrubava **todo upload com imagem**: cardápio, serviços, produtos,
hospedagem, transporte e foto de perfil. A descrição da própria rota já
prometia "armazena local/nuvem"; só a nuvem existia.

**Patch L1 — 6 arquivos**

*Estratégia escolhida na construção.* Com `AWS_REGION`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY` e `AWS_BUCKET_NAME` presentes, vai para o S3 como
sempre. Faltando qualquer uma, grava em disco e registra um `warn` no boot
dizendo onde. Nada de comportamento novo em ambiente configurado.

*Rota pública nova para o arquivo local* — `GET /v1/files/:fileKey`. Foi a
correção de um erro meu no meio do caminho: a primeira versão apontava a
`fileUrl` para `GET /v1/one-file/download/:id`, que é autenticada. Uma tag
`<img>` não manda header `Authorization`, então nenhuma imagem carregaria — só
descobri buscando a URL sem token, como o navegador faria.

*Por que a nova rota é pública, e por chave.* Os objetos vão para o S3 com
`ObjectCannedACL.public_read`: hoje, quem tem a URL baixa o arquivo, sem
autenticação. A rota local reproduz **exatamente** essa postura — nem mais
aberta, nem menos. Servir por id sequencial, em vez de pela chave, seria pior
que o S3: qualquer um baixaria todos os anexos contando de 1 em diante.

*Travessia de caminho.* `file.originalname` vem do cliente e ia **direto** para
a chave do storage. No S3 isso rendia no máximo uma chave estranha; com destino
em disco, vira escrita fora da pasta de uploads. O `safeKey` descarta o
diretório, restringe o conjunto de caracteres e limita o tamanho; o
`storeLocally` confere de novo se o caminho final continua dentro da pasta.

*Download unificado.* A rota de download montava um `S3Client` próprio no
controller — o que amarrava o download à nuvem mesmo com o upload em disco.
Passou para o serviço, que resolve pela estratégia ativa. O mesmo vale para os
dois `DELETE`.

*`uploadManyFiles` virou sequencial.* A chave usa `Date.now()`; em paralelo,
dois arquivos enviados no mesmo milissegundo colidiriam.

*`.env.example`* ganhou a seção 7.1 com as quatro `AWS_*`, o `UPLOAD_LOCAL_DIR`
e o aviso de que o disco não serve a produção com mais de uma instância — cada
uma teria seus próprios arquivos e o download cairia em 404 conforme o
balanceador escolhesse a máquina. `.gitignore` passou a ignorar `/uploads`.

**Validação executada contra a API no ar, sem nenhuma variável da AWS:**

- upload de PNG → **`201`** (antes: `500`), arquivo presente no disco
- `fileUrl` buscada **sem token**, como uma tag `<img>` faria → `200`, bytes
  **idênticos** ao enviado
- chave inexistente → `404`
- travessia pela URL (`..%2f..%2f..%2fetc%2fpasswd`) → `404`
- upload com nome `../../../../tmp/invadido.png` → gravado como
  `1788819912009-invadido.png`, e **nada** escrito em `/tmp`

`npx jest`: 12 suítes, **96 testes passando** (9 novos: escolha de estratégia e
saneamento da chave). Build e lint limpos. Cadeia `F1 → … → L1` verificada em
worktree a partir de `98b4e05`, byte a byte.

**Depois de aplicar:** `npm run swagger:generate` — a rota `/v1/files/:fileKey`
é nova no contrato.

**Resíduo.** O disco resolve desenvolvimento e homologação. Produção com mais de
uma instância exige S3 configurado, ou um volume compartilhado entre elas.
