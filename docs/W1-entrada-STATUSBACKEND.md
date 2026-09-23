### BE-W1 + BE-W7 — Execução da garantia e contador no perfil · ✅ entregue

**Patch:** `W1-garantia-e-contador.patch` · 19 arquivos · +866 / −29
**Base:** `066906c` (`ajustes-gerais`) — primeira fatia gerada direto da branch real

---

#### O problema

`respondWarranty` só gravava o status. **`Approved` e `Rejected` rodavam
exatamente o mesmo `update`**: nada era reaberto, nada era criado, ninguém era
avisado. O cliente aprovava uma garantia e ficava sem rastreio nenhum do
conserto que lhe foi prometido.

#### BE-W1 — o reparo vira um Work próprio

Decisão Q-A, opção B: um `Work` vinculado ao original, não uma reabertura.

Reabrir o trabalho original seria mais barato de escrever e pior de operar — o
histórico do atendimento ficaria sobrescrito, e o cliente perderia a distinção
entre o serviço e o conserto dele. Como `Work`, o reparo reaproveita
`start` / `confirm-arrival` / `finish` / `cancel` **sem endpoint novo**.

| Coluna | Para quê |
|---|---|
| `parentWorkId` | trabalho original; preenchido ⇒ é reparo |
| `isWarranty` | redundante de propósito: badge e travas filtram sem carregar a relação |
| `budgetId` | passa a **opcional** — reparo não nasce de orçamento |

O reparo nasce com `serviceValue = 0`, herda `service`/`requester`/`provider`,
carrega os anexos do acionamento como anexos do cliente (são a evidência do
defeito, e é no reparo que o fornecedor vai olhar para eles) e ganha **chat
próprio** (Q-F).

**Três travas**, todas com exceção explicando a razão:

| Ação | Por quê recusa |
|---|---|
| `pay` em reparo | Q-E, sem custo. Checkout de R$ 0,00 não existe no Mercado Pago — sem a trava, o erro apareceria lá na frente como falha do gateway |
| `request-extra` em reparo | reintroduziria a cobrança pela porta dos fundos: `request-extra` está liberado em quase todo status |
| `request-warranty` num reparo | Q-G. A garantia cobre o serviço original |

A idempotência que já existia (`warrantyRequestStatus === Pending`) passa a
valer para algo concreto: sem ela, dois toques no botão criariam **dois
reparos** para o mesmo acionamento.

#### BE-W7 — o contador

Saía zero porque não havia de onde tirar. Sai de duas fontes que já existiam: o
`warrantyRequestStatus` dos trabalhos originais e os Works de garantia.

Exposto em `GET /profile/me` (`warranties`) e `GET /services/:id`
(`providerWarranties`). Seis números; o de destaque é
**`warrantiesCompleted` / `warrantiesTotal`**.

**Q-H, e a escolha importa:** "atendida" é o **reparo concluído**, não o
acionamento aprovado. Para quem lê o perfil, atendida significa problema
resolvido; aprovada só indica intenção. Tem teste fixando isso — cinco
aprovações com três reparos terminados exibem **3**.

Dois cuidados no cálculo:
- acionamento só conta no trabalho original (`isWarranty: false` no filtro).
  Hoje o Q-G já impede acionar um reparo, mas o filtro mantém o número correto
  se a regra for afrouxada depois;
- reparo `Cancelled` não entra nem em concluídos nem em aberto.

Vive em módulo próprio (`WarrantyStatsModule`, só `PrismaService`) para que
perfil e serviços leiam o contador sem arrastar o módulo de trabalhos junto —
e sem risco de ciclo de importação.

#### Validação

- `nest build` → 0 · `eslint` → limpo · `prisma validate` → válido
- `jest` → **39 suítes / 305 testes** (eram 37/288; +2 suítes, +17 testes)
- Patch aplica limpo em `066906c`, com identidade byte a byte em 19 arquivos
- Scan de segredos → limpo
- ⚠️ **Não validado contra banco nem HTTP** — o contêiner não tem MySQL

#### Contrato do front

| Onde | Mudança |
|---|---|
| todo `Work` | `isWarranty`, `parentWorkId` |
| `Work` detalhe | `warrantyWorks: [{ id, status }]` |
| `Work.budgetId` | **pode vir ausente** |
| `GET /profile/me` | `warranties` |
| `GET /services/:id` | `providerWarranties` |
| `pay` / `request-extra` / `request-warranty` | `400` no reparo |

⚠️ Tela que lê `work.budgetId` sem checar quebra no primeiro reparo. Seção 8.11
do `ORIENTACOESFRONT`.

#### Fora de escopo, de propósito

- **BE-W2 (notificação)** — Q-D decidiu adiar. `respondWarranty` continua sem
  disparar nada, ao contrário de start/finish/cancel
- **Contador na listagem de serviços** — só no detalhe. Um `groupBy` por página
  para um número que a vitrine não exibe não se paga. Se a listagem precisar, é
  consulta em lote (`statsForMany` já existe), não N consultas
- **BE-W5 (mediação da recusa)** — Q-B: recusa é final, só listar no admin
