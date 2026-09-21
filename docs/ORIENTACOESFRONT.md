# Orientações para o front

> O que mudou no back-end e o que o front precisa fazer com cada mudança.
>
> Começou cobrindo só a autenticação por telefone e hoje cobre também delivery,
> pagamento, repasse ao entregador, cupons, push e orçamento.
>
> | | |
> |---|---|
> | **Back-end** | `service-new-ws`, branch `ajustes-gerais` |
> | **Atualizado em** | 2026-09-22 (Fases 0, 5, 6 e 8 da auditoria entregues) |
> | **Origem** | mantido em `service-new-ws/docs/`; a cópia em `service-new-web-app/docs/` é espelho |
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
| ✅ | **Validado contra a API rodando**, com banco real |
| 🟡 | **Entregue e com teste unitário**, mas ainda não exercitado contra banco e HTTP |

A diferença é honesta e importa: o que está 🟡 tem o contrato descrito a partir
do código, e não de uma chamada de verdade. Pode codar contra, mas trate o
primeiro teste integrado como parte do trabalho — e me avise se algo divergir
do que está escrito aqui.

**Seções 3 a 8.4 estão ✅.** As seções 8.5 em diante são 🟡: foram entregues em
uma sequência em que o ambiente não tinha MySQL disponível.

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

### Por onde o código chega: WhatsApp primeiro, SMS no reenvio 🟡

**Nenhum contrato mudou** — mesmas rotas, mesmos campos, mesmas respostas. O
que mudou é o canal, e isso afeta só o **texto da tela**.

| Momento | Canal |
|---|---|
| Cadastro (`register`) | WhatsApp; cai para SMS se o WhatsApp recusar na hora |
| Reenvio (`resend-verification`) | **sempre SMS** |
| `forgot` com `channel: "sms"`, 1ª vez | WhatsApp; cai para SMS se recusar na hora |
| `forgot` repetido dentro das 4h | **sempre SMS** |

O motivo do reenvio ser SMS: a API do Twilio **aceita** a mensagem de WhatsApp
para qualquer número e só descobre depois, de forma assíncrona, que o
destinatário não está na plataforma. Não existe como checar antes. Então o
primeiro envio é uma aposta, e o reenvio é o resgate de quem não tem WhatsApp —
o SMS alcança 100% dos números.

**O que isso pede do front:**

- Onde a tela diz "enviamos um SMS", passe a dizer **"enviamos um código por
  WhatsApp ou SMS"**. O front não sabe qual dos dois saiu, e a API não informa —
  de propósito, para não travar o contrato no canal
- O botão de reenvio ganha peso: ele é o caminho de quem não tem WhatsApp.
  Valem os mesmos 60s de contador, mas o texto pode ser **"não recebi, enviar
  por SMS"** em vez de "reenviar"
- Na tela de `forgot`, a segunda tentativa seguida também sai por SMS
  automaticamente. Não precisa de campo novo nem de opção para o usuário

Enquanto o template de OTP não estiver aprovado no Twilio, **tudo continua
saindo por SMS**, exatamente como hoje. A mudança é invisível até lá.

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

## 8.5 Carteira do entregador e repasse 🟡

O frete e a gorjeta são retidos pela plataforma no split e viram crédito do
entregador quando ele finaliza a entrega. Até agora esse crédito era só um
número na tela: nada no sistema o transformava em dinheiro. Agora existe o
repasse, e ele muda duas telas.

### Tela de ganhos do entregador

`GET /v1/deliveries/me/earnings` ganhou **dois campos**, no mesmo formato dos
que já existiam (`{ amount, deliveries }`):

| Campo | O que é |
|---|---|
| `available` | já ganho e **ainda não repassado** — é o que a plataforma deve agora |
| `paid` | já repassado, dinheiro fora da plataforma |

`available + paid = total`. Os recortes de tempo (`day`, `week`, `month`,
`total`) **não mudaram**: continuam somando tudo, pago ou não, porque são
faturamento e não saldo.

Na tela, o destaque passa a ser o `available` — é o número que o entregador quer
ver. O `total` vira histórico.

⚠️ **Pedido em dinheiro não gera repasse.** O entregador recebe frete e gorjeta
em mãos, na porta, e a plataforma não retém nada. Esses valores **não** entram
em `available` nem em `total`. Se a tela hoje promete "ganhos do dia" somando
entregas em dinheiro, o número vai mudar — e o novo está certo.

### Tela de repasses do admin

Três rotas novas, todas exigindo papel de admin **e** permissão `Financial`:

```
GET  /v1/admin-delivery-payouts/pending
POST /v1/admin-delivery-payouts
GET  /v1/admin-delivery-payouts?courierId=42
```

O `pending` devolve, por entregador: nome, telefone, valor devido, quantas
entregas compõem, a data da mais antiga e os **dados bancários** — é com eles
que o admin faz o Pix. Entregador sem conta cadastrada vem sem `bankAccount`:
não há para onde enviar, e a linha deve aparecer marcada na tela.

O `POST` registra um repasse **já pago por fora**. Ele liquida o saldo inteiro
daquele entregador — não existe repasse parcial.

**Mande sempre o `expectedAmount`** com o valor que a tela mostrava. Se uma
entrega for concluída entre o carregamento da tela e o envio do formulário, o
saldo sobe; sem esse campo, o repasse daria baixa em dinheiro que não foi pago.
Com ele, a resposta é `409` e a tela recarrega.

| Código | Quando | O que fazer |
|---|---|---|
| `201` | repasse registrado | atualizar a lista |
| `409` | sem saldo em aberto | recarregar; alguém já repassou |
| `409` | saldo divergente | recarregar e mostrar o valor novo (vem na mensagem) |
| `403` | admin sem permissão `Financial` | esconder a tela desse admin |

### Chave Pix no cadastro bancário

`POST` e `PATCH /v1/bank-accounts/me` aceitam **dois campos novos, opcionais**:

| Campo | Valores |
|---|---|
| `pixKeyType` | `Cpf` · `Cnpj` · `Email` · `Phone` · `Random` |
| `pixKey` | a chave, com ou sem máscara |

Os dois **andam juntos**: mandar um sem o outro devolve `400`. Mandar os dois
vazios apaga o Pix cadastrado. Omitir os dois num `PATCH` não mexe no que já
está lá.

Pode mandar com máscara — o servidor normaliza antes de gravar, e a resposta já
vem normalizada:

| Enviado | Gravado |
|---|---|
| `123.456.789-00` | `12345678900` |
| `(34) 99870-1109` | `+5534998701109` |
| `Maria@Email.COM` | `maria@email.com` |

⚠️ A validação é de **formato**, não de existência: só o banco sabe se a chave
está registrada de verdade. `400` aqui significa "isso não parece um CPF/e-mail/
telefone", não "essa chave não existe".

Na tela do entregador, vale deixar claro que a chave é por onde ele recebe — é
o campo que decide se o repasse sai ou fica esperando.

---

## 8.6 Maquininha própria do estabelecimento 🟡

O estabelecimento pode declarar que cobra cartão na **maquininha dele**, na
entrega. Isso muda o fluxo de pagamento inteiro daquele pedido.

### A rota

```
PATCH /v1/restaurants/me/card-machine
{ "usesOwnCardMachine": true, "acceptResponsibility": true }
```

**Ligar exige `acceptResponsibility: true`** — sem isso, `400`. Desligar não
exige nada. A resposta é o restaurante, agora com `usesOwnCardMachine`.

A tela de ligar precisa mostrar o termo antes do aceite, porque o back grava
**quem aceitou, quando e sobre qual versão do texto**. Desligar limpa esse
registro: religar depois pede o aceite de novo.

### O que muda no pedido

| Meio de pagamento | Com maquininha ligada |
|---|---|
| Crédito e débito | **não geram checkout** — pago na maquininha, na entrega |
| Pix e boleto | seguem pelo gateway, como sempre |
| Dinheiro | segue em mãos, como sempre |

A maquininha é **de cartão**. Pix continua passando pela plataforma.

### O que a tela do cliente precisa fazer

Num restaurante com maquininha, escolher crédito ou débito **não leva ao
checkout online**. Se o app chamar `POST /v1/food-orders/:id/pay` nesse pedido,
recebe `400` com a mensagem explicando. Trate como trata o pedido em dinheiro:
leve direto para o acompanhamento, e avise que o pagamento é na entrega.

A confirmação de recebimento usa a rota que já existe, a mesma do dinheiro:

```
PATCH /v1/food-orders/:id/confirm-cash-payment
```

Ela agora aceita qualquer pedido liquidado fora da plataforma, não só dinheiro.
Quem confirma continua sendo o entregador ou o restaurante.

### O que muda para o entregador

**Nada aparece para ele na hora**, mas o dinheiro vem de outro lugar: como a
plataforma não reteve o frete nem a gorjeta, **quem paga o entregador é o
estabelecimento**. Esses pedidos não entram em `available` nos ganhos dele.

Vale deixar isso visível no histórico de entregas — senão o entregador vê uma
entrega concluída que não somou nada no saldo e pensa que é bug.

### Um aviso importante para o cadastro

Ligar a maquininha **não muda pedidos já criados**. Cada pedido carrega a
própria marca, decidida no momento em que foi feito. Um pedido criado com
checkout online continua tendo checkout online mesmo se o restaurante ligar a
maquininha depois.

---

## 8.7 Estorno: um status novo de pagamento 🟡

`PaymentStatusEnum` ganhou **`Refunded`**. Onde a tela hoje trata
`Pending | Paid | Cancelled`, passa a existir um quarto valor.

| Status | Significa |
|---|---|
| `Pending` | aguardando |
| `Paid` | pago |
| `Cancelled` | **nunca entrou** — Pix vencido, cartão recusado |
| `Refunded` | **entrou e voltou** — estorno ou contestação no cartão |

A distinção importa: no cancelado não há o que reverter, no estornado há
dinheiro que já foi creditado a alguém.

Aparece em `foodOrder.paymentStatus` e no status do pagamento. **Uma tela que
faça `if (status === 'Paid') ... else ...` vai tratar estorno como "aguardando",
o que é errado.** Vale revisar os `switch` e os ternários de status.

Na tela do restaurante, o pedido estornado precisa aparecer como tal — ele já
produziu e entregou, e o dinheiro voltou. É caso de suporte, não de fluxo
normal.

### Na tela de repasse do admin

`GET /v1/admin-delivery-payouts/pending` ganhou dois campos:

| Campo | O que é |
|---|---|
| `refundedDeliveries` | quantas entregas do saldo vieram de pedidos estornados |
| `refundedAmount` | quanto do saldo vem daí, em reais |

Zero na esmagadora maioria dos casos. Maior que zero **não bloqueia o repasse** —
o valor continua somado em `amount`. É informação para o admin decidir, porque
o backend não reverte lançamento sozinho: o entregador fez a entrega, e se ele
fica sem receber é decisão de negócio, não de código.

Na tela, vale destacar a linha quando `refundedDeliveries > 0`.

---

## 8.8 Orçamento: aceite, recusa e serviço sem preço 🟡

### Dois estados novos

`BudgetStatusEnum` ganhou **`Accepted`** e **`Rejected`**, e os dois são
**terminais**: depois deles o orçamento não aceita mais alteração.

| Status | Significa |
|---|---|
| `Pending` | aguardando o profissional |
| `Responded` | proposta na mesa |
| `WaitingInformation` | o profissional pediu mais dados |
| `Accepted` | **novo** — cliente aceitou, e o trabalho nasceu |
| `Rejected` | **novo** — cliente recusou o preço |
| `Cancelled` | desistência do pedido |

⚠️ **`Cancelled` e `Rejected` não são a mesma coisa.** Cancelar é desistir do
pedido; recusar é não aceitar o preço proposto. Se a tela hoje usa `Cancelled`
para as duas, vale separar.

Antes, orçamento aprovado ficava eternamente em `Responded` — a única forma de
saber que fora aceito era procurar se existia um trabalho apontando para ele.
Agora `PATCH /v1/budgets/:id/approve` move o status junto, na mesma transação.

### A rota de recusa

```
PATCH /v1/budgets/:id/reject
{ "rejectReason": "Achei o prazo longo demais." }   // opcional
```

Só o cliente que solicitou, e só em `Responded`.

| Código | Quando |
|---|---|
| `200` | recusado |
| `400` | ainda não respondido, ou já recusado |
| `403` | quem chamou não é quem solicitou |
| `409` | já aceito, já virou trabalho |

A resposta do orçamento ganhou `acceptedAt`, `rejectedAt` e `rejectReason`.

### Serviço sem preço fixo

`Service.price` virou **opcional**, no cadastro e na resposta.

- `POST /v1/services` sem `price` → serviço 100% sob orçamento
- `PATCH` com `price: null` → apaga o preço de um serviço que já tinha
- `PATCH` sem o campo → não mexe no que está lá

**Na resposta, `price` agora pode vir ausente.** Tela que faz
`service.price.toFixed(2)` vai quebrar. Onde não houver preço, o lugar dele é
"Sob orçamento" — e onde houver, vale tratar como referência ("a partir de"),
porque **o valor que de fato é cobrado é o do orçamento respondido**, não o do
cadastro.

Isso vale também para o admin: `platformValueReceived` vem ausente quando o
serviço não tem preço, porque não há como estimar receita de um valor que só
existe depois da negociação.

---

## 8.9 Sacola: agendamento, gorjeta e cupom 🟡

Três campos novos, **todos opcionais**, em `POST /v1/food-orders`. Omitindo os
três, o pedido funciona exatamente como antes.

```jsonc
{
  "restaurantId": 1,
  "items": [ /* ... */ ],
  "paymentMethod": "Pix",

  "scheduledFor": "2026-09-30T20:00:00.000Z",  // opcional
  "tip": 5,                                     // opcional
  "couponCode": "BEMVINDO10"                    // opcional
}
```

### Agendamento

`scheduledFor` em ISO 8601, **no futuro**. Omitido, o pedido é para agora.

**Não muda o status do pedido.** Quem move o pedido pela cozinha continua sendo
o restaurante; o campo serve para ele separar o que é para já do que é para
depois. Na tela do restaurante, vale destacar os agendados numa faixa separada.

### Gorjeta

`tip` em reais, de 0 a 1000. Entra no total cobrado e vai **inteira** para o
entregador — a plataforma não cobra comissão sobre ela.

Na sacola, vale oferecer valores sugeridos e um campo livre. O total exibido
precisa somar a gorjeta, senão o cliente leva um susto no checkout.

### Cupom

Dois passos, e o segundo é o que vale.

**1. Pré-visualizar** — para a sacola mostrar o desconto antes de fechar:

```
POST /v1/coupons/validate
{ "code": "BEMVINDO10", "restaurantId": 1, "itemsValue": 100 }
```

```jsonc
{ "code": "BEMVINDO10", "type": "Percent", "discount": "10.00",
  "description": "10% de desconto na primeira compra" }
```

**2. Aplicar** — mandando `couponCode` na criação do pedido.

⚠️ **O desconto da pré-visualização não é aceito como entrada.** O back
recalcula tudo a partir dos preços reais do cardápio quando o pedido é criado.
Se o valor divergir do que a tela mostrou, o que vale é o do pedido — é assim de
propósito, para a sacola não conseguir negociar o próprio desconto.

Cupom inválido responde `400` com a razão em `message`, tanto no `validate`
quanto na criação. Mostre a mensagem da API: ela já diz se é código inexistente,
fora da validade, abaixo do valor mínimo, ou de outro restaurante.

**Tipos de cupom:** percentual, valor fixo e frete grátis. No frete grátis o
entregador continua recebendo normalmente — quem custeia é a plataforma.

### Quem cria cupom

Só admin, em `/v1/admin-coupons` (`POST`, `GET`, `GET /:id`, `PATCH /:id`,
`DELETE /:id`). Não existe rota de cupom para restaurante nem para cliente além
do `validate`.

---

## 8.10 Notificações push (PWA) 🟡

O back já envia push. **O que falta é tudo do lado do navegador** — este é o
único item do documento em que o trabalho é majoritariamente do front.

### As três rotas

```
GET    /v1/push/public-key      (pública, sem token)
POST   /v1/push/subscriptions
DELETE /v1/push/subscriptions
```

### O fluxo

1. Registrar um **service worker** (o projeto já tem `ngsw-config.json`)
2. `GET /v1/push/public-key` → devolve `{ "publicKey": "..." }`
3. Pedir permissão ao usuário **num gesto dele**, nunca no load da página
4. `pushManager.subscribe()` com a chave, e mandar o resultado em
   `POST /v1/push/subscriptions`:

```jsonc
{ "endpoint": "https://fcm.googleapis.com/fcm/send/abc123",
  "keys": { "p256dh": "...", "auth": "..." } }
```

5. **No logout, `DELETE /v1/push/subscriptions`** com o mesmo `endpoint` — senão
   o aparelho continua recebendo notificação de uma conta que saiu

### Dois detalhes que evitam retrabalho

- **`publicKey` pode vir `null`.** Significa que as chaves VAPID ainda não foram
  configuradas no servidor (está na lista do DevOps). Nesse caso, não peça
  permissão ao usuário: gastar o "sim" dele para depois não enviar nada queima
  a permissão, que o navegador não pergunta de novo
- **O `POST` é idempotente por `endpoint`.** Reenviar a mesma inscrição não
  duplica, então não precisa controlar se já inscreveu

O back remove a inscrição sozinho quando o navegador responde que ela expirou.

---

## 9. O que não muda

- A base `/v1` e as rotas existentes
- O formato do JWT e o header `Authorization: Bearer <token>`
- `profileType` no login — já vinha e continua vindo
- As rotas de upload passaram a exigir `Authorization`. Se o front usa
  interceptor de auth global, nada a fazer

---

## 10. Ordem sugerida de ajuste

### Já validado contra a API ✅ — pode subir com confiança

1. **Telefone e máscara** (seção 3) — base para todo o resto
2. **Login aceitando telefone** (seção 6)
3. **Recuperação de senha** (seção 7)
4. **Cadastro sem e-mail** (seção 4)
5. **Telas de verificação** (seção 5) — **tem que ir junto com o 4**: sem ela
   ninguém conclui um cadastro novo, porque a conta nasce `Pending` e o login
   recusa
6. **Meios de pagamento, frete, confirmação em dinheiro, avaliação e exclusão
   de item** (seção 8.1)
7. **Botão de liberar fornecedor no admin** (seção 8.2) — destrava testar
   qualquer tela de fornecedor
8. **Tratamento do `409` de fornecedor vencido** (seção 8.3) — o texto já vem
   pronto da API; é o ajuste mais barato da lista
9. **Pagamento online do pedido** (seção 8.3)
10. **Vínculo com o Mercado Pago** (seção 8.2)
11. **Coordenadas nas telas de endereço** (seção 8.4) — **maior efeito da
    lista**: sem ele o frete não varia e o mapa não tem destino
12. **Rastreamento no mapa** (seção 8.4) — depende do 11
13. **Tempo de entrega e período no repasse** (seção 8.4)

### Entregue, ainda não exercitado contra banco 🟡

Ordenado por quanto quebra se ficar de fora.

14. **Preço de serviço pode vir ausente** (seção 8.8) — **é o único item que
    quebra tela que hoje funciona**: `service.price.toFixed(2)` estoura no
    primeiro serviço sob orçamento. Faça antes dos outros
15. **`Refunded` nos status de pagamento** (seção 8.7) — tela que faz
    `if (status === 'Paid') … else` passa a tratar estorno como "aguardando"
16. **`Cancelled` ≠ `Rejected` no orçamento** (seção 8.8) — se a tela usa
    `Cancelled` para "cliente recusou", precisa separar
17. **Aceite e recusa de orçamento** (seção 8.8) — a rota de recusa é nova
18. **Sacola: gorjeta e cupom** (seção 8.9) — os dois são visíveis para o
    cliente e mexem no total exibido
19. **Maquininha própria** (seção 8.6) — cadastro do restaurante mais o desvio
    do checkout no cliente
20. **Carteira do entregador** (seção 8.5) — `available` vira o número em
    destaque; o pedido em dinheiro sai da conta
21. **Chave Pix no cadastro bancário** (seção 8.5)
22. **Tela de repasses do admin** (seção 8.5) — é tela nova inteira
23. **Agendamento de pedido** (seção 8.9)
24. **Push / PWA** (seção 8.10) — depende das chaves VAPID, que estão com o
    DevOps. Dá para construir antes; só não dá para testar o envio

> **Nada nesta lista espera entrega do back-end.** O que os itens 14 a 24
> esperam é ambiente com banco para validar ponta a ponta.

---

## 11. Pendências que precisam de decisão sua

### Decisões de produto, sem resposta até agora

- **Estorno: quem absorve?** O entregador entregou, o restaurante produziu, e o
  dinheiro voltou ao cliente. Hoje o back registra, alerta e sinaliza no
  repasse, mas **não reverte nada** — é decisão comercial, não de código
- **Maquininha e comissão.** O estabelecimento que cobra na maquininha própria
  ainda paga comissão à plataforma? Se sim, como se cobra dinheiro que nunca
  passou por ela? Hoje o pedido grava a comissão, mas não há como retê-la
- **Validade do orçamento.** Não existe prazo: um orçamento respondido fica
  aceitável para sempre, com o preço de meses atrás
- **Contraproposta.** O cliente não propõe valor, e o prestador não revisa
  depois da recusa. Reabrir um `Rejected` exigiria decidir se o "não" do
  cliente pode ser desfeito
- **Repasse parcial.** O registro de repasse liquida o saldo inteiro do
  entregador; pagar só uma parte exigiria escolher quais entregas entram
- **Faixas de frete reais.** Com a faixa única semeada, uma entrega de 50 km
  custa o mesmo que uma de 5 km. É configuração, não erro de cálculo — e vale
  resolver antes de qualquer cliente real fazer pedido
- **Conta `Pending` no login.** Implementado como `401` genérico, com o link de
  reenvio como saída (seção 6). Se preferir distinguir, me avise
- **Tempo de bloqueio do botão de reenvio.** Sugeri 60s; quem define é você

### Coisas que a tela pode precisar e hoje não existem

- **Sinalizar fornecedor vencido antes de fechar.** O `409` da seção 8.3 só
  aparece ao criar o pedido; não há campo na listagem dizendo que o fornecedor
  está indisponível. Se a tela precisa avisar antes, é rota ou campo novo
- **Cotação de frete antes de fechar o pedido.** O valor só aparece na resposta
  da criação. Mostrar antes exige rota nova
- **Ordenação e filtro por preço** agora precisam decidir onde fica o serviço
  sem valor (seção 8.8)

### Base de dados existente

- **Usuários antigos sem telefone.** Continuam entrando por e-mail, mas não têm
  recuperação por SMS. Migrar essa base é fluxo novo — tela de "cadastre seu
  telefone" e uma rota para isso
- **Endereços sem coordenadas.** Nenhum dos já cadastrados tem, então todos
  caem na faixa inicial de frete até serem geocodificados
- **Restaurantes sem tempo de entrega.** Os campos existem e estão vazios

---

## 12. Do lado da infraestrutura

Coisas que não são código e que o front sente quando faltam. Estão com o time
de DevOps.

| Falta | O que o front vê |
|---|---|
| Chaves VAPID | `publicKey` vem `null`; não peça permissão de push |
| Content Template do WhatsApp | notificações não chegam por WhatsApp; push e SMS seguem |
| Template de OTP (Authentication) | código de verificação sai por SMS, como antes |
| Credenciais do Mercado Pago | pagamento online não fecha; teste em dinheiro |
| Escopo `money_transfer` | não afeta o front — o repasse é registrado à mão pelo admin |

Nenhuma delas bloqueia construir tela. Todas bloqueiam testar o caminho feliz
completo.
