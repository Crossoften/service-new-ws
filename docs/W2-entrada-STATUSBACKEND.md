### BE-CHAT-1 + BE-Q5 (complemento) — Chat no orçamento e badge de não lidos · ✅ entregue

**Patch:** `W2-chat-orcamento-e-badge.patch` · 8 arquivos · +453 / −34
**Base:** `722ab84` (`ajustes-gerais`)
**Sem migration.** Nenhuma coluna nova — o `ChatContextType` já previa `Budget`.

---

#### BE-CHAT-1 — a conversa nasce com o orçamento

O `ChatRoom` só aparecia no `approve`. Durante toda a fase de negociação, que é
exatamente quando cliente e prestador precisam acertar escopo e preço, não
havia por onde conversar.

A sala passa a nascer em `budgets.create`, na **mesma transação** do orçamento,
com contexto `Budget` e os dois participantes. O `chat.id` sai em
`ResponseBudgetDto` e no item de lista — que é tudo o que o front precisava
para ligar o botão nas telas que já existem.

**Ao aprovar, a sala é movida, não recriada** (Q-UX1):

```ts
data: { contextType: ChatContextType.Work, referenceId: createdWork.id }
```

Um `update` de uma linha. O **`id` permanece o mesmo**, o histórico segue
junto, e quem estava com o chat aberto na tela de aprovação não troca de sala
quando o trabalho nasce. Copiar mensagens para uma sala nova daria o mesmo
resultado visível e duplicaria dados por nada.

**Orçamentos anteriores a esta fase não têm sala.** No aceite deles o caminho
antigo continua valendo — a sala nasce no trabalho. Sem isso, aprovar um
orçamento que já estava no banco quebraria. Tem teste.

#### BE-Q5 (complemento) — `GET /v1/chats/unread-count`

O inbox (`GET /v1/chats`) **já existia** com contraparte, última mensagem e
`unreadCount` por conversa. Faltava só o total barato, para os badges que
precisam do número em toda navegação.

Duas consultas: as participações do usuário com a data da última leitura, e um
`count` sobre as mensagens posteriores a ela. Sem `groupBy` — o detalhe por
sala não interessa aqui, e é justamente o que torna o inbox caro demais para
servir de badge.

**Detalhe de rota que vale registrar:** `@Get('unread-count')` foi declarada
**antes** de `@Get(':id')`. O Nest casa na ordem de declaração, e o `:id`
engoliria "unread-count" — o `ParseIntPipe` devolveria `400` para uma rota que
existe. Está comentado no controller para não ser desfeito por engano.

#### Validação

- `nest build` → 0 · `eslint` → limpo
- `jest` → **41 suítes / 317 testes** (eram 39/305; +2 suítes, +12 testes)
- Patch aplica limpo em `722ab84`, com identidade byte a byte em 8 arquivos
- Scan de segredos → limpo
- ⚠️ **Não validado contra banco nem HTTP** — o contêiner não tem MySQL

#### Contrato do front

| Onde | Mudança |
|---|---|
| `GET /v1/budgets` e `/budgets/:id` | campo `chat: { id }` — **opcional** |
| `POST /v1/budgets` | idem na resposta |
| `GET /v1/chats/unread-count` | **nova** → `{ total }` |

`budget.chat` é opcional de propósito: orçamentos antigos não têm sala. Seção
8.12 do `ORIENTACOESFRONT`.

#### Estado da fila do front

| Item | Situação |
|---|---|
| BE-W1 garantia | ✅ entregue (`722ab84`) |
| BE-W7 contador | ✅ entregue (`722ab84`) |
| BE-Q5 inbox | ✅ já existia · total entregue aqui |
| BE-CHAT-1 | ✅ entregue aqui |
| BE-Q8 upload | ✅ já estava resolvido |

**A fila priorizada do front está zerada.** O que resta são os itens adiados
por decisão de produto: BE-W2 (notificação de garantia, Q-D) e BE-W5 (mediação
da recusa, Q-B).
