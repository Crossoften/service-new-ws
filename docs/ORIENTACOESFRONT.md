# Orientações para o front — autenticação por telefone

> Documento de apoio para ajustar o front depois que o back-end estiver fechado.
>
> | | |
> |---|---|
> | **Back-end** | `service-new-ws`, branch `ajustes-gerais` |
> | **Atualizado em** | 2026-08-26 (Fase C entregue) |
> | **Base da API local** | `http://localhost:8000/v1` |
> | **Swagger** | `http://localhost:8000/docs` |
| **Contrato OpenAPI** | `docs/openapi.json` — regerado com `npm run swagger:export` |

---

## 0. O contrato em arquivo

`docs/openapi.json` traz as 217 rotas e 319 schemas, pronto para gerar cliente.

Copie o arquivo para a raiz do projeto do front, junto com o
`ng-openapi-gen.json`, e rode:

```bash
npx ng-openapi-gen
```

Sai em `src/app/api`: 319 modelos e 36 serviços `@Injectable`, um por tag do
Swagger, com as descrições das rotas já em JSDoc.

> **Não use o `@openapitools/openapi-generator-cli`.** Ele é um invólucro de uma
> ferramenta Java e falha com *"Unable to locate a Java Runtime"* em Mac sem JDK.
> O `ng-openapi-gen` é Node puro, específico para Angular, e não precisa de nada
> além do que você já tem.

Três coisas sobre o código gerado:

- **`rootUrl` sai de `ApiConfiguration`** e vem do primeiro `server` do
  contrato, hoje `http://localhost:8000`. **Sem `/v1`** — os caminhos já o
  incluem. Para apontar para homolog, use `provideApiConfiguration('https://...')`
- **Os métodos dos serviços devolvem `Promise`.** Se você prefere `Observable`,
  as funções soltas em `fn/` devolvem — as duas formas são geradas
- **O cliente gerado não injeta o token sozinho.** Ele respeita o
  `HttpInterceptor` de auth que o projeto já tem, então não há nada a fazer além
  de garantir que o interceptor cubra a nova base

Duas coisas mudaram no contrato e valem saber antes de gerar:

- **Autenticação agora é o padrão.** O documento declara `bearerAuth` na raiz, e
  só as 29 rotas realmente públicas trazem `security: []`. Antes, 22 rotas
  protegidas — `food-orders` e `deliveries` inteiros, e os uploads — apareciam
  sem exigência de token, e um cliente gerado a partir daquilo não mandaria o
  header.
- **Doze rotas ganharam tipo de resposta** que antes só tinham descrição em
  texto, entre elas os quatro endpoints de cardápio e os rankings do admin.

O arquivo é gerado. Rode `npm run swagger:export` depois de puxar mudanças do
back-end, senão ele mente com cara de verdade.

---

## 1. Como ler este documento

Cada item está marcado com o estado real no back-end:

| Marca | Significa |
|---|---|
| ✅ | **Já está no ar.** Pode ajustar o front e testar |

Nesta revisão **tudo está ✅** — não há mais nada esperando entrega do back-end.
Cada comportamento descrito aqui foi testado contra a API rodando com banco
real, não deduzido do código.

---

## 2. A mudança em uma frase

O telefone passa a ser a identidade principal do usuário: obrigatório no cadastro,
verificado por SMS, e aceito no login. O e-mail vira **permanentemente opcional**.

---

## 3. Telefone — a regra que atravessa tudo ✅

O back-end normaliza todo telefone para **E.164** (`+5534998701109`) antes de
gravar, e normaliza de novo antes de comparar. Isso vale para cadastro, login,
recuperação de senha e verificação.

**O que isso significa para o front:** você pode enviar o telefone no formato que
for mais confortável. Todos estes chegam no mesmo usuário:

```
(34) 99870-1109
34998701109
+5534998701109
+55 34 99870-1109
```

**Recomendação mesmo assim:** envie E.164. Não porque a API exija, mas porque é
o formato que não depende de interpretação — e se um dia o app atender outro
país, a máscara brasileira deixa de servir e o E.164 continua valendo.

**O que o front não deve fazer:** guardar o telefone em duas formas diferentes
(uma para exibir, outra para enviar) sem uma função única de conversão. Foi
exatamente esse descasamento que quebrava a recuperação de senha antes.

---

## 4. Cadastro

### Estado atual ✅

```
POST /v1/no-auth/register/client
POST /v1/no-auth/register/supplier
POST /v1/no-auth/register/delivery
POST /v1/no-auth/register/influencer
```

```jsonc
{
  "name": "João da Silva",        // obrigatório, 3 a 120 caracteres
  "email": "joao@email.com",      // OPCIONAL — pode ser omitido inteiro
  "phone": "+5534998701109",      // obrigatório
  "password": "12345678",         // obrigatório, 8 a 32 caracteres
  "confirmPassword": "12345678",  // obrigatório, tem que ser igual a password
  "acceptedTerms": true,          // obrigatório, tem que ser true
  "birthDate": "1990-05-20",      // opcional, formato ISO date (YYYY-MM-DD)
  "inviteCode": "joaosilva"       // opcional
}
```

O telefone **já é obrigatório** — sempre foi, na prática. O contrato é que
declarava como opcional, e isso foi corrigido. Se o formulário do front marca o
campo como opcional, precisa passar a marcar como obrigatório.

O `birthDate` espera `string` no formato `YYYY-MM-DD`. Antes o Swagger
declarava `type: object`, o que atrapalhava geração de client.

### O que mudou ✅

- `email` é **opcional**. Cadastro sem e-mail funciona; a resposta traz
  `"email": null`
- A conta nasce com `status: "Pending"`, não mais `"Active"`
- O cadastro dispara automaticamente um SMS com o código de verificação
- A resposta continua `201`, mas **o usuário ainda não pode logar** — a tela
  seguinte tem que ser a de verificação, não a home. Leia
  `user.status === "Pending"` da própria resposta para decidir
- **Se o SMS falhar, o cadastro inteiro falha com `503` e nada é gravado.** É
  proposital: conta criada sem código seria uma conta que nunca poderia ser
  verificada e ainda ocuparia o telefone. Na tela, ofereça "tentar novamente"

### Travas de UI para o cadastro

| Campo | Trava |
|---|---|
| `name` | mínimo 3, máximo 120 |
| `phone` | obrigatório · máscara brasileira · validar antes de enviar |
| `email` | opcional ✅ · se preenchido, validar formato |
| `password` | mínimo 8, máximo 32 |
| `confirmPassword` | comparar no front antes de enviar — a API devolve `400` genérico |
| `acceptedTerms` | precisa ser `true`; `false` devolve `400` |

**Duplicidade:** telefone e e-mail já cadastrados devolvem `409` com
`"Já existe usuário cadastrado com os dados informados."` A mensagem é
propositalmente genérica — **não diga ao usuário qual dos dois colidiu**, isso
revelaria quem está cadastrado na base.

---

## 5. Verificação por SMS ✅

Fluxo novo. Três telas:

```
cadastro  →  [ inserir código de 6 dígitos ]  →  home
                        ↑
                 [ reenviar código ]
```

### Contrato

```
POST /v1/no-auth/verify-account
{ "identifier": "+5534998701109", "code": "638593" }
```
→ `200` `{"message": "Conta verificada com sucesso!"}`
→ `404` `{"message": "Usuário ou código inválido."}`

```
POST /v1/no-auth/resend-verification
{ "identifier": "+5534998701109" }
```
→ `200` `{"message": "SMS enviado com sucesso!"}`

**O `404` do verify-account é sempre o mesmo**, em todos os casos de falha:
conta inexistente, código errado, código expirado, código já usado, conta já
verificada. Não tente distinguir na tela — a API não distingue de propósito.

**O `200` do resend-verification também aparece quando não houve envio** —
conta inexistente ou já verificada. Mesma razão. Na tela, diga "se a conta
estiver pendente, você receberá um novo SMS".

O `identifier` é o **mesmo telefone** enviado no cadastro — carregue entre as
telas em vez de pedir de novo.

### Travas de UI

- Campo de código: exatamente **6 dígitos numéricos**
- Botão de reenvio com **contador regressivo** (sugestão: 60s). Cada reenvio
  gera um SMS de verdade, e SMS custa dinheiro
- O código expira em **4 horas**, igual ao da recuperação de senha
- **Cada reenvio invalida o código anterior.** Se o usuário pedir reenvio e
  depois digitar o código do primeiro SMS, vai tomar `404`. Vale avisar na tela
- Enquanto a conta estiver `Pending`, **qualquer** chamada autenticada devolve
  `401`. Não é bug: o back-end revalida o status a cada requisição

### O detalhe que evita um bug clássico

O código de verificação de conta e o de recuperação de senha são **coisas
separadas**, guardados em campos diferentes no banco. Um não invalida o outro.
No front, trate como fluxos independentes — não reaproveite a mesma tela nem o
mesmo estado.

---

## 6. Login ✅

```
POST /v1/login
{ "email": "+5534998701109", "password": "12345678" }
```

**O campo continua se chamando `email`** e aceita e-mail *ou* telefone. O nome
ficou por compatibilidade — renomear para `identifier` seria quebra de contrato,
e foi adiado para uma fatia coordenada entre front e back.

A API decide pelo `@`: o que tem arroba é tratado como e-mail, o resto como
telefone (e passa pela normalização da seção 3).

Testado e funcionando, todos para o mesmo usuário: `testelogin@email.com`,
`+5534998701109`, `34998701109`, `(34) 99870-1109`, `+55 34 99870-1109`.

### Resposta

```jsonc
{
  "token": "eyJhbGciOi...",
  "id": 10,
  "role": "User",
  "profileType": "Client",      // Client | Supplier | Delivery | Influencer
  "adminPermissions": []
}
```

### Travas de UI

- O rótulo do campo deve dizer **"E-mail ou telefone"**, não "E-mail"
- Se o usuário digitar algo sem `@`, aplique a máscara de telefone
- `401` devolve sempre `"Acesso não autorizado."` — mensagem única para senha
  errada e usuário inexistente. **Não tente distinguir os dois na tela**: a API
  não distingue de propósito, para não revelar quais contas existem
- Conta `Pending` (não verificada) também cai em `401` ✅, com a mesma mensagem
  de senha errada. **Não há como distinguir os dois pela resposta** — foi a
  escolha conservadora, para não revelar quais telefones existem e quais estão
  pendentes.

  Isso cria um risco de beco sem saída: quem fechou o app antes de verificar
  volta, tenta logar, toma `401` e não entende. **A saída sugerida para o
  front:** na tela de login, oferecer sempre um link "não recebeu o código de
  confirmação?" que chama `resend-verification`. Como essa rota responde `200`
  em qualquer caso, o link é seguro de mostrar a todo mundo, e quem estiver
  pendente recebe um SMS novo.

  Se preferir distinguir de verdade (levar direto para a tela de verificação),
  dá para devolver um código de erro próprio — mas aí a API passa a confirmar
  que aquele telefone existe e está pendente. É troca sua; me avise

---

## 7. Recuperação de senha ✅

Três passos. **O contrato mudou** em relação ao que o front usa hoje.

### Passo 1 — pedir o código

```
POST /v1/no-auth/forgot
{ "channel": "sms", "identifier": "+5534998701109" }
```

`channel` aceita `"sms"` ou `"email"`. Com e-mail opcional, **`sms` passa a ser
o caminho principal** — quem não tem e-mail cadastrado só consegue por SMS.

Resposta `200` com `{"message": "SMS enviado com sucesso!"}`.

> **Atenção:** esse `200` também aparece quando o telefone **não existe** na
> base. É intencional — responder "usuário não encontrado" entregaria quais
> números estão cadastrados. Na tela, diga sempre "se o número estiver
> cadastrado, você receberá um SMS".

### Passo 2 — validar o código (opcional)

```
POST /v1/no-auth/verify-code
{ "identifier": "+5534998701109", "code": "638593" }
```

Serve para validar antes de mostrar a tela de nova senha. Pode ser pulado.

### Passo 3 — trocar a senha

```
POST /v1/no-auth/reset
{
  "identifier": "+5534998701109",
  "code": "638593",
  "password": "novaSenha123",
  "confirmPassword": "novaSenha123"
}
```

### O que mudou em relação ao contrato antigo

```diff
  POST /v1/no-auth/verify-code
- { "code": "1234" }
+ { "identifier": "+5534998701109", "code": "123456" }

  POST /v1/no-auth/reset
- { "code": "1234", "password": "...", "confirmPassword": "..." }
+ { "identifier": "+5534998701109", "code": "123456", "password": "...", "confirmPassword": "..." }
```

Duas coisas:

1. **O código passou de 4 para 6 dígitos.** Ajuste a máscara
2. **`identifier` é novo e obrigatório.** É o mesmo valor do passo 1 — carregue
   entre as telas

O `identifier` foi adicionado porque buscar só pelo código permitia adivinhá-lo
por força bruta contra a base inteira, e em caso de colisão trocava a senha da
conta errada.

---

## 8. Códigos de resposta — o que a tela deve fazer

| Código | Quando | Tela |
|---|---|---|
| `400` | Validação de campo | Mostrar as mensagens do array `message` |
| `401` | Senha errada, usuário inexistente, token expirado, conta `Pending` | "Acesso não autorizado" · deslogar se veio de rota autenticada |
| `403` | Perfil sem permissão para a rota | "Você não tem acesso a esta área" |
| `409` | Telefone ou e-mail já cadastrado | Mensagem genérica, sem dizer qual campo |
| `409` | **Fornecedor com assinatura vencida** (seção 8.3) | Mostrar a mensagem da API · não é erro do cliente |
| `503` | SMS não pôde ser enviado (inclusive no cadastro) | Mostrar a mensagem da API · **oferecer retry** |

O `503` é novo e vale explicar: antes, falha no envio de SMS virava `500`
genérico **e apagava o código anterior do usuário**. Agora a conta fica intacta
quando o provedor está fora — um retry do usuário resolve. No cadastro, o `503`
significa que **nenhuma conta foi criada**: pode repetir a mesma requisição sem
medo de `409`.

O `400` devolve `message` como **array de strings**, uma por campo inválido.
Se o front espera string única, precisa tratar.

---

## 8.1 Delivery — o que mudou na Fase C ✅

### Meios de pagamento

`paymentMethod` agora aceita cinco valores:

```
CreditCard · DebitCard · Pix · BankSlip · Cash
```

`DebitCard` e `Cash` são novos. Se a tela já oferecia "Débito" mapeando para
`CreditCard`, e "Dinheiro" para `BankSlip`, **troque pelos valores próprios** —
o dado que estiver sendo gravado hoje está errado.

### A taxa de entrega saiu do contrato

```diff
  POST /v1/food-orders
  {
    "restaurantId": 1,
    "paymentMethod": "Pix",
-   "deliveryFee": 8,
    "items": [ ... ]
  }
```

**O campo foi removido.** Enviar não causa erro — é descartado em silêncio —
mas não tem efeito nenhum. A taxa é calculada no servidor, pela distância entre
o restaurante e o endereço do cliente, segundo faixas que o admin configura.

O valor cobrado vem na resposta do pedido, em `deliveryFee`. Se a tela precisa
mostrar o frete **antes** de fechar o pedido, hoje não há rota de cotação — me
avise que eu faço.

### O front precisa mandar coordenadas

O cálculo depende de `latitude` e `longitude` no endereço. **Nenhum endereço
cadastrado tem**, e quem preenche é o front, ao geocodificar o endereço
escolhido pelo usuário (autocomplete de mapa, ou consulta de CEP que devolva
coordenadas).

Sem coordenadas nada quebra: o pedido cai na faixa que começa em zero. Mas o
frete fica igual para todo mundo, o que anula a decisão.

### Confirmação de pagamento em dinheiro

Pedidos nascem com `paymentStatus: "Pending"`. Para `Cash`, quem entrega
confirma o recebimento:

```
PATCH /v1/food-orders/:id/confirm-payment
```

- Sem corpo. Responde o pedido atualizado, com `paymentStatus: "Paid"`
- Chamável pelo **entregador designado** ou, quando não há entrega atribuída
  (retirada no balcão), pelo **dono do restaurante**
- Outros meios respondem `400` — são quitados pelo provedor de pagamento
- **Idempotente**: chamar duas vezes não é erro. Ainda assim, desabilite o botão
  após o primeiro toque

Um botão simples na tela do pedido, visível só quando
`paymentMethod === "Cash"` e `paymentStatus === "Pending"`.

> **Atenção ao que isso não cobre.** Cartão, Pix e boleto ficam `Pending` para
> sempre: pedidos de delivery não passam pelo Mercado Pago hoje. Não trate
> `paymentStatus` como verdade financeira para esses meios — só para dinheiro.

### Avaliação de restaurante

```
POST /v1/restaurants/:id/reviews
{ "rating": 5, "comment": "Comida ótima" }
```

- `rating` obrigatório, inteiro de **1 a 5**. `comment` opcional, até 2000
- Só quem tem **pedido entregue** no restaurante pode avaliar → senão `403`
- **Uma avaliação por cliente** → a segunda responde `409`. Esconda o botão de
  quem já avaliou, em vez de deixar o usuário descobrir pelo erro

Na listagem e no detalhe, o restaurante passa a trazer:

```jsonc
{
  "ratingAverage": 4.5,   // ausente quando ninguém avaliou ainda
  "ratingCount": 12
}
```

Distinga "sem avaliação" de "nota baixa": com zero avaliações, `ratingAverage`
não vem e `ratingCount` é `0`.

### Exclusão de item de cardápio

```
DELETE /v1/restaurants/menu-items/:id
```

A resposta traz `deleted`, e **a tela precisa tratar os dois casos**:

| `deleted` | O que aconteceu |
|---|---|
| `true` | O item nunca foi pedido e foi apagado de verdade |
| `false` | O item já consta em pedidos e foi **desativado** — some do cardápio do cliente, mas continua na listagem administrativa como inativo |

O segundo caso não é falha. Pedidos antigos dependem do item para descrever o
que foi vendido; apagar deixaria o histórico sem o nome do produto. Mostre a
mensagem que a API devolve em vez de um "excluído com sucesso" genérico.

### Taxas de entrega no admin

```
GET    /v1/admin-delivery-fees
POST   /v1/admin-delivery-fees
PATCH  /v1/admin-delivery-fees/:id
DELETE /v1/admin-delivery-fees/:id
```

Cada faixa tem `minKm` (inclusivo), `maxKm` (exclusivo, ausente = sem limite),
`type` e `value`:

- `Fixed` — valor em reais
- `Percent` — percentual sobre o **valor dos itens**, não sobre o total

Faixas se sobrepondo não é erro: vence a de maior `minKm`, a mais específica.
`maxKm` menor ou igual a `minKm` responde `400`.

> **Existe hoje uma faixa única de R$ 8,00 para qualquer distância**, criada
> pela migration para reproduzir o comportamento anterior. Enquanto ela for a
> única, o frete não varia. Cadastrar as faixas reais é a primeira coisa a
> fazer na tela de admin.

---

## 8.2 Liberação de contas — como testar sem pagamento real ✅

Até aqui, tudo que um fornecedor faz no sistema passa por uma trava: **só opera
quem tem assinatura ativa**. Isso é correto em produção e é exatamente o que
impede testar hoje, porque a conta do Mercado Pago do cliente ainda não chegou —
sem ela não existe cobrança real, e sem cobrança real não existe assinatura.

A saída não foi afrouxar a regra. A trava continua igual: quem não tem
assinatura ativa continua recebendo `403`. O que existe agora é uma forma de a
**plataforma conceder** a assinatura, sem passar pelo gateway.

### Concessão administrativa de assinatura

```
POST /v1/admin-providers/:id/subscriptions/grant
```

Só administrador. Cria (ou estende) uma assinatura ativa para o fornecedor, com
a origem registrada — a assinatura concedida fica marcada como tal e sabe-se
**quem concedeu**. Não é um "modo de teste" escondido no código: é um ato
administrativo auditável, que continua existindo depois que o pagamento real
entrar no ar.

Para o front isso significa uma coisa só: **a tela de admin ganha um botão de
liberar fornecedor**. Do lado do fornecedor, nada muda — ele simplesmente deixa
de tomar `403` e passa a ver as telas que já existem.

> **O front nunca decide liberação.** Não existe flag de bypass no cliente, nem
> query param, nem header. Se a tela precisa saber se o fornecedor pode operar,
> ela lê o estado da assinatura pelas rotas que já existem — nunca infere.

### Ambiente de teste pronto

```
npm run seed:test
```

Roda no back e deixa o banco com um cenário completo e navegável: um cliente, um
fornecedor, um restaurante e um entregador, todos `Active`, todos com telefone
válido, senha `12345678`. O fornecedor e o restaurante já nascem com assinatura
concedida; o restaurante já vem com cardápio; os endereços já vêm com
coordenadas a ~1,5 km de distância, o que faz as faixas de frete (seção 8.1)
realmente variarem em vez de cair sempre na mesma.

É idempotente — pode rodar quantas vezes quiser — e se recusa a rodar com
`NODE_ENV=production`.

> Peça as credenciais dessas contas ao back antes de começar os testes de tela.
> Elas não estão neste documento de propósito.

### Pedido em dinheiro não exige Mercado Pago

Enquanto a conta do gateway não chega, existe um caminho que fecha o ciclo
inteiro sem tocar em pagamento online: **pedido em dinheiro**. Um pedido com
`paymentMethod: "Cash"` não verifica vínculo com o Mercado Pago e segue direto
para o fluxo de entrega e confirmação (seção 8.1).

Pedido com qualquer outro meio, sim: se o dono do restaurante ainda não vinculou
a conta do Mercado Pago, a criação responde `403`. A tela precisa tratar esse
caso — não é erro de validação do formulário, é estado do fornecedor. O texto
certo é do tipo *"este restaurante ainda não aceita pagamento online"*, com o
meio em dinheiro como saída.

> **Consequência prática:** enquanto as credenciais não chegarem, teste o
> delivery ponta a ponta em dinheiro. É o único caminho que hoje chega até o
> fim; pedidos não-dinheiro ficam parados aguardando o gateway.

### Vínculo do fornecedor com o Mercado Pago

O fornecedor conecta a própria conta do Mercado Pago por OAuth — a plataforma
não guarda cartão nem recebe pelo fornecedor, ela intermedia e retém a comissão.
São três rotas, e o front participa de duas:

```
GET  /v1/mercado-pago/status
GET  /v1/mercado-pago/connect-url?redirectUri=...
POST /v1/mercado-pago/oauth/callback
```

1. **`status`** — devolve `{ isLinked, mpUserId?, linkedAt? }`. É o que decide
   entre mostrar o botão "conectar" e o selo "conectado"
2. **`connect-url`** — devolve `{ url }`. O front leva o fornecedor até lá. O
   `redirectUri` é opcional; se você mandar aqui, **tem que mandar exatamente o
   mesmo no callback** — o Mercado Pago compara os dois e recusa se diferirem
3. **`oauth/callback`** — o Mercado Pago devolve o usuário com um `code` na
   query; o front repassa esse `code` para cá e o vínculo é criado

Nenhum token do vendedor sai da API: eles são gravados cifrados e a resposta
devolve só o identificador público. O front não guarda credencial de pagamento
em lugar nenhum.

### Notificações por WhatsApp — sem impacto no front

As notificações assíncronas passaram da Cloud API da Meta para o **Twilio**, a
mesma conta que já envia o SMS de verificação. É uma troca de provedor no back:
nenhuma rota mudou, nenhum contrato mudou, o front não faz nada.

O que muda é operacional — o ambiente passa a precisar de `TWILIO_WHATSAPP_FROM`
e `TWILIO_WHATSAPP_CONTENT_SID`. Sem elas, a notificação é apenas registrada em
log e ignorada; **nenhuma operação de negócio falha por causa disso**, por
desenho. Se em homologação o WhatsApp não chegar, é configuração de ambiente, não
bug de tela.

---

## 8.3 Pagamento online do pedido e fornecedor vencido ✅

Duas mudanças que o front **precisa** absorver antes de publicar qualquer tela
de delivery: apareceu uma rota de pagamento que não existia, e apareceu um `409`
em seis rotas de criação.

### O pedido não-dinheiro agora tem como ser pago

Até aqui, um pedido em Pix ou cartão era criado e **ficava parado para sempre**.
Não era falha de integração: não existia rota de cobrança. Só o caminho em
dinheiro fechava o ciclo.

Agora existe:

```
POST /v1/food-orders/:id/pay
```

Corpo opcional: `{ "payerEmail": "cliente@example.com" }` — serve só para
pré-preencher o checkout. Resposta:

```json
{
  "message": "Checkout de pagamento gerado com sucesso.",
  "checkoutUrl": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...",
  "foodOrder": { }
}
```

O front leva o cliente até a `checkoutUrl`. **A confirmação não vem por esta
rota** — quem confirma é o Mercado Pago, de forma assíncrona, chamando o webhook
do back. Depois de mandar o cliente para o checkout, a tela precisa reconsultar
o pedido para ver o `paymentStatus` virar `Paid`. Não existe resposta síncrona
dizendo "pago".

### As travas desta rota, e o que a tela faz com cada uma

| Situação | Código | O que mostrar |
|---|---|---|
| Pedido em dinheiro | `400` | Não deveria acontecer: esconda o botão de pagar quando `paymentMethod` for `Cash` |
| Pedido já pago | `400` | Recarregar o pedido — a tela está com dado velho |
| Pedido cancelado | `400` | Recarregar o pedido |
| **Já existe checkout em aberto** | `400` | "Você já tem um pagamento em andamento para este pedido" |
| Restaurante sem conta do Mercado Pago | `400` | "Este restaurante não aceita pagamento online" |
| Quem chama não é o cliente do pedido | `403` | Não deveria acontecer: só o cliente vê o botão |
| Pedido inexistente | `404` | Voltar para a lista de pedidos |

> **O checkout em aberto é o caso que mais vai aparecer na prática.** Se o
> cliente gerar o checkout e fechar o app sem pagar, ele **não consegue gerar
> outro** enquanto aquele não vencer ou for recusado. Dois checkouts abertos
> continuariam ambos válidos no Mercado Pago e ele poderia pagar os dois — por
> isso a trava. Vale a tela avisar antes de gerar: *"você será levado ao
> pagamento"*.

### Pagamento recusado não cancela o pedido

Se o Pix vencer ou o cartão for recusado, o pedido **continua de pé** com
`paymentStatus: Pending` — a cozinha pode já estar preparando. O que acontece é
que o checkout anterior é marcado como cancelado, e aí **o cliente pode gerar um
novo** pela mesma rota. Do ponto de vista da tela: o botão de pagar volta a
funcionar sozinho.

### O `409` novo: fornecedor com assinatura vencida

Seis rotas de criação passaram a responder `409` quando o **fornecedor do outro
lado** está com a assinatura vencida:

```
POST /v1/food-orders
POST /v1/budgets
POST /v1/bookings
POST /v1/rentals
POST /v1/transport-requests
POST /v1/commercial-transactions
```

A mensagem vem pronta da API e pode ir direto para a tela: *"Este fornecedor
está temporariamente indisponível e não pode receber novos pedidos."*

Três coisas que valem entender para não tratar isso errado:

**Não é erro do cliente.** Ele não tem pendência nenhuma — a pendência é do
fornecedor. Por isso é `409` e não `403`: `403` diria que o usuário não tem
permissão, o que é falso. A tela **não deve** deslogar, nem mandar para
"acesso negado", nem sugerir que ele fez algo errado.

**O fornecedor continua aparecendo nas listagens.** Foi decisão de produto: ele
mantém vitrine, avaliações e histórico visíveis, só não recebe negócio novo. Ou
seja, **a tela de detalhe de um fornecedor pode existir normalmente e o `409` só
aparecer no momento de fechar**. Se você quiser evitar a frustração, não há hoje
um campo dizendo "este fornecedor está vencido" — se a tela precisar disso
antes, é rota nova, me peça.

**O que já estava em andamento não é afetado.** Pedido aceito, trabalho em
execução, reserva confirmada — tudo segue até o fim, inclusive o pagamento.
A trava só vale para começar coisa nova. Então não trate o `409` como "este
fornecedor sumiu": os pedidos antigos do cliente com ele continuam funcionando.

---

## 8.4 Mapa, rastreamento e o que mudou no cadastro ✅

Esta seção existe por causa do pedido de integrar o Google Maps. A primeira
coisa a dizer é que **a maior parte já está pronta no back** — o risco aqui é
reconstruir o que existe.

### O rastreamento em tempo real já está no ar

Nada disso precisa ser construído:

| Peça | Onde |
|---|---|
| Entregador envia a posição | `PATCH /v1/deliveries/:id/location` com `{ lat, lng }` |
| WebSocket autenticado por JWT | namespace `/deliveries` |
| Cliente entra no canal da entrega | evento `delivery:track` com `{ deliveryId }` |
| Posição chega em tempo real | evento `delivery:location` → `{ deliveryId, lat, lng, updatedAt }` |
| Mudança de status da entrega | evento `delivery:status` → `{ deliveryId, status }` |
| Sair do canal | evento `delivery:untrack` |

O token vai no handshake, em `auth.token` ou no header `Authorization`, com ou
sem o prefixo `Bearer` — as duas formas são aceitas.

A última posição também fica **gravada** no pedido (`currentLat`, `currentLng`,
`locationUpdatedAt`). Quem abre a tela no meio do trajeto vê onde o entregador
está antes do próximo evento chegar, em vez de um mapa vazio.

> **A posição só pode ser enviada depois da coleta.** Antes disso, o
> `PATCH .../location` responde `400`. E a primeira chamada muda o status da
> entrega para `OnTheWay` sozinha — o app do entregador não precisa de uma
> chamada separada para isso.

### O que o Google Maps faz, e é tudo no front

- **App do entregador:** pega o GPS do aparelho, manda para o `PATCH`, e desenha
  a rota chamando o Directions com origem no GPS e destino no endereço do
  cliente
- **App do cliente:** assina `delivery:track` e move o marcador a cada
  `delivery:location`

O back **não chama o Google**. Não há geocodificação no servidor: quem converte
endereço em coordenada é o app, no momento em que o usuário escolhe o endereço.

> **Sobre a chave.** Uma chave do Maps JavaScript é pública por natureza — ela
> fica no bundle e qualquer um lê no DevTools. O que protege não é o segredo, é
> a **restrição por referenciador HTTP e por API**, no console do Google Cloud.
> Sem isso, qualquer pessoa que a veja consome a cota. Se algum dia o back
> precisar chamar o Google, aquilo exige uma **chave separada, restrita por IP**,
> que nunca vai para o cliente.

### As coordenadas agora existem — e são obrigatórias na prática

Faltava exatamente isto para o mapa ter destino e para o frete variar.

**Endereço do cliente** — `PATCH /v1/profile/me/address` aceita `latitude` e
`longitude`, e `GET /v1/profile/me` devolve as duas. Aceitam número ou texto
(`-18.9186` e `"-18.9186"` funcionam, porque é assim que a geocodificação do
Google costuma devolver). Voltam como **string**, para não perder as últimas
casas decimais.

**Endereço do restaurante** — `POST /v1/restaurants` e `PATCH /v1/restaurants/:id`
aceitam um objeto `address` aninhado, com os campos de endereço mais
`latitude`/`longitude`. É endereço **próprio do estabelecimento**, não o do
perfil do dono: o fornecedor pode morar longe da cozinha, e é da cozinha que a
entrega sai.

> **Sem as duas pontas, o frete não varia.** O cálculo por distância precisa da
> coordenada do cliente **e** da do restaurante. Faltando qualquer uma, o pedido
> cai na faixa padrão — foi o que aconteceu em todos os pedidos até agora. Com as
> duas, medimos: 1,5 km cobrou R$ 6,00, 5 km cobrou R$ 12,00 e 50 km cobrou o
> percentual. As telas de endereço **precisam** mandar as coordenadas.

### Tempo de entrega no cadastro do restaurante

`deliveryTimeMinMinutes` e `deliveryTimeMaxMinutes`, aceitos na criação e na
edição, devolvidos na vitrine. Dois campos porque a tela mostra faixa
("30-45 min"); preenchendo os dois iguais, vira número único.

**Ausente significa não informado, e a tela deve omitir o tempo** — não mostrar
zero, nem "0 min". Restaurante que não configurou é diferente de restaurante que
entrega na hora.

Validações: 1 a 480 minutos por campo, e **máximo não pode ser menor que
mínimo** — inclusive quando você manda só um dos dois e o outro já está gravado.
Nos dois casos a resposta é `400` com mensagem pronta para a tela.

### Relatório de repasse com recorte por período

`GET /v1/restaurants/me/payouts` aceita `?period=day|week|month`. **Sem o
parâmetro, o comportamento é o mesmo de antes** — todo o histórico —, então
nada quebra em quem já consome a rota. A resposta ganhou o campo `period`, que
devolve `all` quando nenhum recorte foi pedido.

As fronteiras são as mesmas de `GET /v1/deliveries/me/earnings`: `day` à
meia-noite de hoje, `week` no domingo desta semana, `month` no dia 1º.

### Ícones de categoria: o caso que o fallback local não cobre

Os ícones continuam no app, mapeados por slug, e isso está certo — carrega
instantâneo e funciona offline.

Só que **existe CRUD de categoria no admin** (`POST /v1/admin-categories/:context`).
Categoria criada pelo painel **depois** que o app foi publicado é um slug que o
front nunca viu: o fallback local não tem para onde cair.

Para essas, a tela do admin precisa **subir a imagem** em
`POST /v1/upload/one-file` e mandar o `iconUrl` e o `iconKey` recebidos na
criação da categoria. É o único ponto em que o `iconUrl` do back é de fato
necessário — e é responsabilidade da tela de admin, não das telas de vitrine.

---

## 9. O que não muda

- A base `/v1` e as rotas existentes
- O formato do JWT e o header `Authorization: Bearer <token>`
- `profileType` no login — já vinha e continua vindo
- As rotas de upload passaram a exigir `Authorization`. Se o front usa
  interceptor de auth global, nada a fazer

---

## 10. Ordem sugerida de ajuste

1. **Telefone e máscara** (seção 3) — base para todo o resto
2. **Login aceitando telefone** (seção 6) — já dá para testar hoje ✅
3. **Recuperação de senha** (seção 7) — contrato já mudou, o front atual está
   desatualizado ✅
4. **Cadastro sem e-mail** (seção 4) ✅
5. **Telas de verificação** (seção 5) ✅

6. **Meios de pagamento e frete** (seção 8.1) ✅
7. **Confirmação em dinheiro, avaliação e exclusão de item** (seção 8.1) ✅
8. **Botão de liberar fornecedor no admin** (seção 8.2) ✅ — é o que destrava
   testar qualquer tela de fornecedor hoje, então vale subir antes do resto do
   delivery
9. **Tratamento do `409` de fornecedor vencido** (seção 8.3) ✅ — são seis rotas
   de criação e o texto já vem pronto da API; é o ajuste mais barato da lista e
   evita a tela mostrar "acesso negado" para um cliente que não errou nada
10. **Pagamento online do pedido** (seção 8.3) ✅ — a rota existe e funciona,
    mas só dá para validar de ponta a ponta quando as credenciais do Mercado
    Pago do cliente chegarem. Até lá, teste em dinheiro
11. **Vínculo com o Mercado Pago** (seção 8.2) ✅ — as três rotas estão no ar e
    documentadas; pode codar sem esperar as credenciais, só não dá para
    concluir o OAuth
12. **Coordenadas nas telas de endereço** (seção 8.4) ✅ — **é o item de maior
    efeito da lista**: sem ele o frete não varia e o mapa não tem destino. Vale
    antes de qualquer tela de mapa
13. **Rastreamento no mapa** (seção 8.4) ✅ — o back já está pronto; é consumir
    o WebSocket e desenhar. Depende do item 12 para ter o ponto de chegada
14. **Tempo de entrega e período no repasse** (seção 8.4) ✅ — os dois são
    pequenos e independentes do resto

**Tudo já está no ar.** Não há mais nada esperando entrega do back-end.

> **Ordem importa no item 5.** Enquanto o front não tiver a tela de verificação,
> ninguém consegue concluir um cadastro novo: a conta nasce `Pending` e o login
> recusa. Se for publicar o front em partes, o item 5 tem que ir junto com o 4.

---

## 11. Pendências que precisam de decisão sua

- **Conta `Pending` no login.** Implementado como `401` genérico, com o link de
  reenvio como saída (seção 6). Se preferir distinguir, me avise
- **Tempo de bloqueio do botão de reenvio.** Sugeri 60s; quem define é você
- **Faixas de frete reais.** Com as faixas de exemplo, medimos uma entrega de
  50 km custando **menos** que uma de 5 km: a faixa percentual (20% dos itens)
  não tem valor mínimo, então pedido pequeno e distante sai quase de graça. Não
  é erro de cálculo, é a configuração. Precisa de um piso na faixa percentual ou
  de faixas fixas até um limite maior — decisão de negócio, e vale resolver
  antes de qualquer cliente real fazer pedido
- **Sinalizar fornecedor vencido antes de fechar.** Hoje o `409` (seção 8.3) só
  aparece no momento de criar o pedido — não existe campo dizendo, na listagem
  ou no detalhe, que aquele fornecedor está indisponível. Se a tela precisar
  avisar antes, é rota (ou campo) novo; me peça
- **Cotação de frete antes de fechar o pedido.** Hoje o valor só aparece na
  resposta da criação. Se a tela precisa mostrar antes, é uma rota nova — peça
- **Tempo de entrega do restaurante.** Ficou de fora da Fase C por não ter sido
  pedido. Os carimbos de tempo já são gravados, então dá para fazer depois sem
  perder histórico
- **Usuários antigos sem telefone.** As contas que já existem foram preservadas
  como `Active` e continuam entrando por e-mail. Elas não têm telefone, então
  não conseguem usar recuperação por SMS. Se o cliente quiser migrar essa base,
  é fluxo novo — tela de "cadastre seu telefone" e uma rota para isso
