### Fase 6 — Orçamento: aceite, recusa e serviço sem preço · ✅ entregue

**Patch:** `Z5-orcamento-decisao.patch` · 15 arquivos · +482 / −17
**Base:** `e19ac4b` + a cadeia até `Z4`

Último bloco prioritário da reunião. Entregue a parte especificada; validade e
contraproposta seguem como pendências funcionais.

---

#### 1. O aceite vira estado

`BudgetStatusEnum` ganhou `Accepted` e `Rejected`, mais `acceptedAt`,
`rejectedAt` e `rejectReason`.

Antes, orçamento aprovado ficava **eternamente em `Responded`**: `approve()`
criava o `Work` e não tocava no status. A única forma de saber que um orçamento
fora aceito era procurar se existia um trabalho apontando para ele — tanto no
back quanto na tela. Agora o status muda na mesma transação que cria o trabalho.

#### 2. A recusa passa a existir

Não havia caminho. O cliente que não aceitasse o preço tinha duas opções, as
duas erradas:

- marcar como `Cancelled`, que é **desistência do pedido**, não recusa de preço
- apagar o orçamento, levando junto o histórico da negociação

`PATCH /v1/budgets/:id/reject`, só para quem solicitou, só de `Responded`, com
motivo opcional — sem ele a recusa chega ao prestador como um "não" sem
contexto.

#### 3. Os dois estados são terminais

A trava do `Y3`, que já bloqueava edição depois do aceite, passa a valer também
para a recusa.

Reabrir um orçamento recusado para o prestador oferecer outro preço é
**contraproposta**, e não há regra definida para ela. Deixar a edição solta
faria a contraproposta existir por acidente, apagando o "não" que o cliente deu.
Bloquear é a escolha conservadora; reabrir continua sendo pendência.

#### 4. Serviço sem preço fixo

`Service.price` virou opcional, como a reunião pediu: *"o serviço não precisa
possuir um valor fixo no cadastro"*.

O preço que vale sempre foi o `Budget.responseValue` — é dele que `Work` e
`Payment` tiram o total, e isso já funcionava. O campo do cadastro vira vitrine
("a partir de R$ X") ou some.

**`strictNullChecks: false` escondeu o problema.** Afrouxar a coluna compilou
sem um único erro, e quatro `service.price.toFixed(2)` teriam estourado em
runtime no primeiro serviço sem preço. Os seis pontos foram corrigidos à mão,
incluindo o `platformValueReceived` do admin, que passaria a exibir `R$ 0,00` —
dando a entender que o serviço não gera receita, quando na verdade a receita só
existe depois da negociação.

É mais um argumento para a dívida do `strictNullChecks` (146 erros, seção 5.4).

#### Validação

- `nest build` → 0 · `eslint` → limpo · `prisma validate` → válido
- `jest` → **37 suítes / 288 testes** (eram 35/274; +2 suítes, +14 testes)
- Cadeia de **14 patches** sobre `e19ac4b`, com identidade byte a byte em
  **108 arquivos**
- Scan de segredos → limpo
- ⚠️ **Não validado contra banco nem HTTP** — o contêiner não tem MySQL

#### Contrato do front

| Onde | Mudança |
|---|---|
| `budget.status` | novos valores `Accepted` e `Rejected` |
| `budget` | novos campos `acceptedAt`, `rejectedAt`, `rejectReason` |
| `PATCH /v1/budgets/:id/reject` | **nova** |
| `POST`/`PATCH /v1/services` | `price` opcional, aceita `null` |
| `service.price` na resposta | **pode vir ausente** |
| `platformValueReceived` (admin) | ausente quando não há preço |

⚠️ **Dois pontos que quebram tela:**

1. `service.price.toFixed(2)` estoura quando o serviço é só sob orçamento
2. Tela que trata `Cancelled` como "recusado" precisa separar os dois — agora
   são coisas diferentes

Detalhes na seção 8.8 do `ORIENTACOESFRONT`.

#### PENDÊNCIAS FUNCIONAIS

1. **Validade do orçamento** (I.9) — não há prazo nem expiração. Um orçamento
   respondido fica aceitável para sempre, com o preço de meses atrás
2. **Contraproposta** (I.10) — o cliente não tem como propor valor, e o
   prestador não tem como revisar depois da recusa. Reabrir um `Rejected`
   exigiria decidir se o "não" do cliente pode ser desfeito
3. **Reflexo do preço opcional nas vitrines** — ordenação e filtro por preço
   precisam decidir onde fica o serviço sem valor
