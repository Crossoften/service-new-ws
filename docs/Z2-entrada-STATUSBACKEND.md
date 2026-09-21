### Etapa 2 do repasse — chave Pix e aviso · 🟡 entregue parcialmente

**Patch:** `Z2-chave-pix.patch` · 13 arquivos · +403 / −9
**Base:** `e19ac4b` + `V1` + `W1` + `X1` + `Y1..Y5` + `Z1`

A Etapa 2 era "automatizar o Pix". **A automação não foi feita, e o motivo não
é de engenharia.**

---

#### Por que a automação ficou de fora

A documentação pública do Mercado Pago é clara: as APIs deles servem para
**receber**, não para transferir dinheiro entre contas. Existe uma API de
transferência, mas ela depende do escopo `money_transfer`, que **não vem
habilitado** — precisa de liberação comercial, pedida ao assessor de conta.

Não dá para escrever integração contra uma API cujo formato só aparece depois
da liberação, e há relato de quem tentou seguir a documentação e recebeu
`Invalid payment_method_id`. Inventar o formato seria pior do que não fazer.

**Ação necessária, e é sua:** pedir ao assessor comercial do Mercado Pago a
habilitação do escopo `money_transfer` para a aplicação do cliente. Com a
resposta — e com a documentação que vem junto dela — a integração é fatia
pequena, porque o modelo do `Z1` não muda: saldo, idempotência, lote e
comprovante continuam iguais. Só o "quem executa o pagamento" troca de mão.

Se a liberação for negada, qualquer PSP com Pix out resolve, e o desenho
também não muda.

#### O que foi entregue: o que serve hoje e serviria em qualquer cenário

Duas das cinco pendências que o `Z1` deixou abertas — as duas que não dependem
de provedor nenhum e que **já são usadas no fluxo manual de hoje**.

**1. Chave Pix (`BankAccount.pixKey` + `pixKeyType`)**

Na prática ninguém faz Pix por agência e conta. Sem a chave, a tela de repasse
mostrava banco, agência, conta e CPF, e o admin descobria a chave por fora.

- Migration `20260921180000_bank_account_pix_key`, aditiva e opcional: a conta
  bancária existe no projeto desde antes, e exigir a chave agora invalidaria
  todos os cadastros já feitos
- Gravada **já normalizada** — CPF e CNPJ só com dígitos, telefone em E.164,
  e-mail em minúsculas. Guardar o que o usuário digitou obrigaria a limpar
  máscara na hora de pagar, e é aí que um erro manda dinheiro para a pessoa
  errada
- O telefone reusa o `normalizePhoneBR` do SMS e do WhatsApp: uma regra só para
  manter em dia, não três
- `pixKey` e `pixKeyType` andam juntos — um sem o outro é `400`, os dois vazios
  apagam. Regra entre dois campos, então mora no service, como a coerência entre
  tipo e valor do cupom
- A chave entra na listagem `/pending` do repasse, ao lado dos dados bancários

**2. Aviso ao entregador quando o repasse sai**

Usa o `NotificationsService` do `W1` — WhatsApp e push, com as falhas de cada
canal engolidas por dentro. Disparado fora da transação e sem `await`: aviso é
acessório e não pode desfazer um repasse que já foi pago de verdade.

#### O que deliberadamente NÃO foi feito

Ciclo de vida do repasse (`Pending` / `Processing` / `Failed`), chave de
idempotência por envio e abstração de provedor. **Todos seriam código morto
até a liberação existir**, e o formato deles depende da API que ainda não
conheço — seria repetir o erro do `Plan.categoryId`, que está no schema desde
a criação e nunca foi lido por ninguém.

Quando a liberação sair, esses três nascem junto com a integração, moldados
pela API de verdade.

#### Validação

- `nest build` → 0 · `eslint` → limpo · `prisma validate` → schema válido
- `jest` → **30 suítes / 242 testes** (eram 29/227; +1 suíte, +15 testes)
- Cadeia `V1 → W1 → X1 → Y1..Y5 → Z1 → Z2` em worktree limpa sobre `e19ac4b`,
  com identidade byte a byte em **81 arquivos**
- Scan de segredos → limpo
- ⚠️ **Não validado contra banco nem HTTP** — o contêiner não tem MySQL

#### Contrato do front

`POST` e `PATCH /v1/bank-accounts/me` aceitam `pixKeyType` e `pixKey`, os dois
opcionais e indissociáveis. Documentado na seção 8.5 do `ORIENTACOESFRONT`.

#### Pendências do Z1 que continuam abertas

1. Repasse parcial — o `POST` liquida o saldo inteiro
2. Carência (`availableAt` já está no filtro, falta a política)
3. Estorno de pedido cujo frete já foi repassado
