# STATUS — Back-end `service-new-ws`

> Documento vivo de contexto e continuidade dos ajustes de back-end.
> **Atualizar ao final de cada fase**, antes de encerrar a sessão de trabalho.
>
> | | |
> |---|---|
> | **Branch de trabalho** | `ajustes-gerais` |
> | **Base** | `b2ae83e` (`luan/develop` @ 14/08/2026) |
> | **Última atualização** | 2026-08-24 — fim da Fase B parcial |
> | **Fases concluídas** | A (segurança herdada), D (robustez), B parcial, S (SMS) |
> | **Próxima fase** | Restante de B e Fase C — bloqueadas em decisões |

---

## 1. Como usar este arquivo

Ao terminar uma fase, atualize nesta ordem:

1. O cabeçalho acima (última atualização, fases, próxima).
2. A seção **3 — Linha do tempo**, com o que foi entregue e como foi validado.
3. A seção **5 — Pendências**, removendo o que saiu e acrescentando o que apareceu.
4. A seção **4 — Correções ao entendimento anterior**, se algo que acreditávamos
   se mostrou errado. Esta seção evita que a próxima pessoa refaça investigação já feita.

Regra de ouro: **verificar contra o código, não contra o Swagger exportado.**
Boa parte das divergências encontradas até aqui veio de documento desatualizado.

---

## 2. Convenções de trabalho

- **Sem `git commit`, `push`, merge ou PR pelo assistente.** Entregas saem como
  arquivos `.patch`, aplicados e commitados pela responsável. A autoria dos
  commits é exclusivamente dela.
- **Um patch por objetivo.** Facilita revisão e permite aplicar parcialmente.
- **Nenhuma alteração no front-end nesta frente.** O repositório
  `service-new-web-app` é tratado como consumidor; necessidades viram nota aqui.
- **Toda entrega é validada antes de sair**: build, lint dos arquivos tocados,
  e quando aplicável teste funcional por HTTP contra o banco local.
- Patches são conferidos **encadeados**, aplicando do zero sobre a base limpa.

---

## 3. Linha do tempo

### Fase A — Segurança herdada do boilerplate · ✅ entregue

Seis patches. Corrigem falhas que atravessaram 96 commits sem revisão porque
vieram do template original.

| Patch | O quê | Impacto no contrato |
|---|---|---|
| `A0` | `SmsService` valida formato do SID antes de instanciar o Twilio | Nenhum |
| `A1` | Reset de senha: exige identificador, código de 6 dígitos, hash em banco, expiração verificada | **Sim** — ver §7 |
| `A2` | Webhook do Mercado Pago falha fechado quando há segredo configurado | Nenhum |
| `A3` | Upload exige JWT; exclusão escopada ao dono | Rotas de arquivo passam a exigir token |
| `A4` | `JwtStrategy` revalida `status` do usuário a cada requisição | Nenhum |
| `A5/A6` | `helmet`/`compression` sempre; CORS por origem; `whitelist` no `ValidationPipe` | Config de deploy — ver §6 |

**Detalhes que valem registro**

- `A1` corrigiu três defeitos no mesmo fluxo: busca só pelo código (permitia
  força bruta e redefinia a conta errada em caso de colisão), `generateCode()`
  com 4 dígitos distintos entre si (5.040 combinações, `Math.random`), e
  `reset()` que **nunca verificava expiração** — um código não usado valia para
  sempre. Passou a 1.000.000 de combinações via `crypto.randomInt`, com hash.
- `A1` inclui migration `20260819215437_widen_and_hash_reset_code`
  (`users.code` de `VARCHAR(4)` para `VARCHAR(72)`) que também **anula os
  códigos em trânsito** — eles não casariam mais com o hash.
- `A6` usa `whitelist: true` **sem** `forbidNonWhitelisted`, de propósito: o
  segundo rejeitaria a requisição inteira com 400 e quebraria clientes que
  enviam campos a mais. Remover em silêncio já elimina o mass assignment.
  Verificado que nenhum DTO de entrada tem propriedade sem decorator de
  validação, então nada é descartado indevidamente.

**Validação executada:** banco recriado do zero, 14 migrations, seed, boot com
206 rotas e zero erros. Testes por HTTP: identificador cruzado rejeitado (404),
contrato antigo rejeitado (400), código expirado (422), upload sem token (401),
conta inativada com token válido (401), 4 de 4 headers do helmet, CORS de origem
estranha bloqueado, `/docs` íntegro sob CSP, cadastro com `role:Master` gravado
como `User`.

---

### Fase D — Robustez · ✅ entregue

Seis patches. Aplicar **depois** dos seis da Fase A; o de registro no
`app.module` vai por último.

| Patch | O quê |
|---|---|
| `D1` | `JwtModule.registerAsync` + `ConfigService` nos 3 módulos que registram JWT |
| `D2` | Filtro global de exceções do Prisma (`P2002→409`, `P2003→409`, `P2025→404`, `P2000→400`) |
| `D3` | Upload passa a persistir em `files` |
| `D4` | Health-check que consulta o banco; middleware de `x-request-id` |
| `D5` | 13 testes cobrindo as regressões de maior risco |
| `D2-D4-registro` | Registra filtro e middleware no `app.module` |

**O achado principal da fase — P0 que nenhuma auditoria tinha visto**

`JwtModule.register({ secret: process.env.JWT_SECRET })` é avaliado quando
`auth.module.ts` é **importado**, na linha 12 do `app.module` compilado.
`ConfigModule.forRoot()` só roda na linha 57. O `JwtModule` recebia `undefined`
e assinar token estourava `500`.

Medido de três formas:

| `JWT_SECRET` chega por | Login |
|---|---|
| Só no arquivo `.env` | **500** |
| `node -r dotenv/config` | 200 |
| Exportado no ambiente do processo | 200 |

Não aparecia em homolog porque deploy via Docker/systemd injeta variáveis no
processo. **Só quebra em ambiente que depende do arquivo `.env`.** Corrigido no
`D1` com `registerAsync`.

O `JwtStrategy` foi deixado como está de propósito: lê `process.env` no
construtor, que roda depois do `ConfigModule` — já é seguro.

**Validação executada:** 12 patches aplicados encadeados sobre `b2ae83e`, build
verde, `jest` 13/13, boot com 206 rotas e zero erros, health-check `200` com
banco no ar e **`503` com o banco derrubado** (antes respondia `200 "Servidor UP"`),
`x-request-id` gerado e ecoado aparecendo no log.

---

### Fase B — Desbloqueio do front · 🟡 parcial

Quatro patches. O item restante depende da decisão 1.

| Patch | O quê | Demanda |
|---|---|---|
| `B1` | `birthDate` deixa de ser `string \| Date` — corrige o `type: object` no Swagger | BE-13 |
| `B2` | `GET /v1/chats` — inbox paginada com contraparte, último trecho e não lidas | BE-Q5 |
| `B3` | `phone` declarado obrigatório no contrato, alinhando ao que a validação já exigia | BE-Q2 · decisão 2 |
| `B4` | `GET /v1/deliveries/me/earnings` — ganhos do entregador por período | BE-17 · decisão 7 |

**Sobre o `B1`.** A união de tipos não era descuido: `admin-users.service.ts`
reatribuía `data.birthDate = new Date(data.birthDate)` **mutando o DTO recebido**,
e a união existia para o TypeScript aceitar. Tipar o campo com um tipo só quebrou
o build — a correção foi montar o payload do Prisma em vez de mutar a entrada:

```ts
const { birthDate, ...rest } = data;
data: { ...rest, ...(birthDate ? { birthDate: new Date(birthDate) } : {}) }
```

DTOs de entrada passam a declarar `string` com `format: date`; os de resposta
usam `Date`, como os outros cinco DTOs de resposta do projeto já faziam.

**Sobre o `B2`.** O modelo já estava preparado — `ChatRoom.lastMessageAt` é
indexado e `ChatParticipant.lastReadAt` é por participante. Faltava expor. Como
o corte de "não lidas" muda de sala para sala, a contagem é feita em **uma única
consulta** com `groupBy` sobre um `OR` montado por sala, em vez de N consultas.

Envelope de paginação idêntico ao do restante do módulo:
`{ chats, currentPage, totalPages, totalRecords }`.

**Validação executada:** 16 patches encadeados sobre `b2ae83e`, build verde,
`jest` 13/13, boot com **208 rotas** e zero erros. Inbox testada com duas salas
reais: ordenação por última mensagem, contagem de não lidas **diferente para
cada lado da mesma sala** (cliente 2/2, fornecedor 0/1), busca casando só o nome
da contraparte, paginação, e isolamento — entregador e admin que não participam
recebem zero conversas. Sem token, `401`.

**Sobre o `B3`.** Nada muda em comportamento: cadastrar sem telefone já devolvia
`400` antes do patch. O que mudou foi a **verdade do contrato** — o campo estava
anotado `@ApiPropertyOptional` e agora aparece em `required` no Swagger. O
telefone sustenta a recuperação de senha por SMS, então declarar opcional era
uma promessa que o back-end nunca cumpriu.

**Sobre o `B4`.** A rota agrega `FinancialTransaction` com
`type: Credit · category: DeliveryPayout · status: Paid`, em quatro janelas —
dia, semana, mês e total — devolvendo valor e contagem de entregas em cada uma.
Protegida por `@ProfileTypes(UserProfileType.Delivery)`.

Não foi preciso criar regra de repasse: **ela já existia em código** (ver seção 4).
O patch apenas expõe o que o back-end já credita.

Validado contra dados semeados para o entregador `id 4` — dia `R$ 20,50` / 2,
semana `R$ 35,50` / 3, mês `R$ 57,50` / 4, total `R$ 156,50` / 5. Um lançamento
de `ReferralCommission` de `R$ 500` presente na mesma conta ficou corretamente
**fora** do resultado. Cliente na rota do entregador, `403`; sem token, `401`.

---

### Fase S — Integração de SMS · ✅ entregue e validada

Credenciais reais chegaram em 25/08. Configuradas no `.env` local (que é
`gitignore`d e não entra em commit nenhum). Com elas, três defeitos apareceram —
nenhum visível enquanto o Twilio estava desabilitado.

| Patch | O quê |
|---|---|
| `S1` | Telefone normalizado para E.164 na escrita e comparado por variantes na leitura |
| `S2` | Falha de envio vira `503` tratado, e o código só é gravado depois do envio |

**O defeito que o `S1` conserta.** Não havia formato canônico de telefone.
O `@IsPhoneNumber('BR')` valida mas não normaliza, então a base guardava
`11955554444` para uns e `+5511955554444` para outros. O `forgot` buscava por
igualdade exata. Resultado medido, mesmo usuário:

| Identificador enviado | Antes | Depois |
|---|---|---|
| `11955554444` | chega ao Twilio | chega ao Twilio |
| `+5511955554444` | **`200` "SMS enviado com sucesso" sem enviar nada** | chega ao Twilio |
| `(11) 95555-4444` | `400` | chega ao Twilio |
| `+55 11 95555-4444` | `400` | chega ao Twilio |

A linha do meio é a pior: a resposta genérica existe de propósito, para não
revelar quais telefones estão cadastrados — e acabava escondendo a falha do
próprio sistema. O usuário esperava um SMS que nunca tinha sido pedido a
ninguém.

O `in` com as variantes (`+5511955554444`, `5511955554444`, `11955554444`, e a
entrada crua) alcança os registros gravados antes da normalização, então **não
é preciso migrar os dados existentes**. Novos cadastros já gravam E.164, e a
checagem de duplicidade passa a pegar o mesmo telefone escrito de outro jeito.

**O defeito que o `S2` conserta.** Duas coisas na mesma função:

1. Qualquer erro do Twilio subia como `500` genérico, sem o código do erro em
   lugar nenhum. Agora é `503` com mensagem própria, e o `code` numérico do
   Twilio vai para o log — é ele que identifica a causa no painel.
2. O código era gravado **antes** do envio. Um envio que falhasse já tinha
   sobrescrito `code` e `codeExpiresIn`: o código anterior, ainda válido,
   morria, e nenhum novo chegava. Medido e confirmado na base. Agora envia
   primeiro e grava depois — provedor fora deixa a conta intacta.

A troca de ordem vale para os dois canais, porque o problema era do fluxo, não
do SMS.

**O que a validação na máquina da Brendha mostrou (25/08).** A saída para
`api.twilio.com` está bloqueada pela política de rede da sessão do Claude — o
`403` no log vem do proxy de egress, não do Twilio. A validação foi feita por
fora, com o `validar-twilio.sh`:

| Item | Resultado |
|---|---|
| Credenciais | ✅ Aceitas. Conta `active`, tipo `Full` — não é trial, então não há restrição a números verificados |
| `TWILIO_PHONE_NUMBER` | ❌ O `+18777804236` **não existe nesta conta** |
| Número real da conta | `+12527134087` — long code americano, SMS e voz habilitados. É o único número comprado, e não há subcontas |
| Entrega no Brasil | ✅ **`delivered`** para celular `+5534…`, a partir do `+12527134087` — duas mensagens, uma do script e uma da API |

O número informado junto com as credenciais estava errado. Vale conferir a
origem dessa informação: pode ter vindo de outra conta.

**A rota para o Brasil funciona.** Envio real de `+12527134087` para um celular
`+5534…` saiu `queued` e virou `delivered` em 10 segundos. As Geo Permissions
já estão liberadas para o Brasil — se não estivessem, a mensagem teria sido
recusada na origem com `21408`, e não foi.

Isso derruba a hipótese que este documento registrava antes: eu havia anotado
que rota internacional para `+55` costuma esbarrar em exigência de remetente
registrado. Para este número e esta rota, não esbarra.

**A ressalva que fica.** O teste valida a rota para uma mensagem, hoje. Tráfego
A2P internacional em volume às vezes passa a ser filtrado pelas operadoras
brasileiras depois de algum tempo. Se aparecer `30007` intermitente em homolog,
é esse o motivo — e aí a saída é número brasileiro com remetente registrado.
Não é motivo para antecipar a troca; é motivo para olhar o log quando o volume
subir.

**Não é preciso console para diagnosticar.** O `validar-twilio.sh` consulta o
status final pela API e traduz o código de erro (`--logs` lista as últimas
mensagens), o que cobre o mesmo que o Messaging Logs mostraria.

**Fluxo completo da API validado em 25/08.** Não só o Twilio: o caminho inteiro,
com o telefone escrito na máscara que o front usa, contra um registro gravado
em E.164.

| Passo | Entrada | Resultado |
|---|---|---|
| `POST /no-auth/register/client` | `phone: "(34) 99870-1109"` | `201` · gravou `+5534998701109` |
| `POST /no-auth/forgot` | `identifier: "(34) 99870-1109"` | `200` · SMS `delivered` |
| `POST /no-auth/reset` | mesma máscara + código recebido | `200` |
| `POST /login` | senha nova | `200` com token |

Os três formatos que antes divergiam (`400`, `200` silencioso, sucesso) agora
convergem para o mesmo usuário. O código de 6 dígitos do `A1` — gerado com
`randomInt`, gravado como hash, conferido com `compareSync` — passou pelo seu
primeiro teste contra envio real.

**Um detalhe que atrapalhou o diagnóstico e vale lembrar:** o `.env` é lido uma
única vez, no boot. Trocar credencial com a API no ar não tem efeito — o
sintoma foi um `20003` persistente enquanto o script, que lê o arquivo a cada
execução, autenticava normalmente.

---

## 4. Correções ao entendimento anterior

Registro do que se mostrou errado, para ninguém refazer a investigação.

| Origem | Afirmava | Verificado no código |
|---|---|---|
| Auditoria de back-end (minha, item H-07) | Erro do Prisma vaza como `500` com stack | **Não vaza.** Sondagem em 6 módulos com ids inexistentes, criação duplicada e validação devolveu `404`/`409`/`400` tipados, zero `500`. O tratamento por módulo do time é sólido. O filtro `D2` fica como rede de segurança, não como conserto |
| Auditoria de back-end (minha) | Frontend não consome API alguma | Verdade para o código publicado no repositório, **falso para a cópia local** — existe `environment.ts` com `apiBaseUrl`. O front está integrado |
| `backend-demandas.md` · BE-Q1 | Conta `Pending` consegue logar — falha de segurança | **Diagnóstico invertido.** O cadastro cria a conta já `Active` com `code: NULL`; nenhuma conta chega a ser `Pending`. Não existe fluxo de verificação no back-end: `MailService.confirmEmail()` existe e **nunca é chamado**. `verify-code` pertence só à recuperação de senha |
| `backend-demandas.md` · BE-Q4 | `/login` nem sempre traz `profileType` | **Já resolvido.** O login devolve `profileType` junto com token, role e permissões |
| `backend-demandas.md` · BE-D5 | `/restaurants/categories` sem `iconUrl` | **Já resolvido.** Existe no schema, no DTO e é selecionado em 5 pontos do service |
| Análise minha, no plano da Fase B | Não existe regra de repasse ao entregador — só `deliveryFee`, que é o que o cliente paga | **Existe, e em código.** `deliveries.service.ts` (linha 250 em `b2ae83e`) credita `amount: foodOrder.deliveryFee` como `FinancialTransaction` de categoria `DeliveryPayout` ao concluir a entrega. Procurei por colunas de valor no schema; a regra estava no service. O repasse hoje é **100% da taxa de entrega** |
| `backend-demandas.md` · BE-Q2 | `phone` é opcional no contrato | **O contrato mente.** Anotado `@ApiPropertyOptional`, mas o `@IsPhoneNumber` não tem `@IsOptional` — cadastrar sem telefone devolve `400`. Testado |

---

## 5. Pendências

### 5.1 Decisões de produto — bloqueiam as fases B e C

| # | Pergunta | Trava |
|---|---|---|
| 1 | Conta verificada é obrigatória? Se sim, para todos os perfis? | Fase B |
| 2 | ~~Telefone é obrigatório?~~ **Decidido em 25/08: sim.** Entregue no `B3` | ✅ |
| 3 | Débito e Dinheiro são meios de pagamento válidos? | Fase C |
| 4 | Quem calcula o frete? Hoje o cliente envia `deliveryFee` e nada valida | Fase C |
| 5 | Avaliação, tempo de entrega e logo entram no modelo de restaurante? | Fase C |
| 6 | Assinatura bloqueia o quê exatamente — publicar, receber demanda, navegar? | Fase C |
| 7 | ~~Quanto o entregador ganha por entrega?~~ **Decidido em 25/08:** manter a regra que já existe — 100% do `deliveryFee`. Exposto no `B4` | ✅ |

> **A decisão 3 tem urgência própria.** Hoje o front mapeia Débito→`CreditCard` e
> Dinheiro→`BankSlip`. Cada pedido em homolog grava um meio de pagamento errado,
> e isso **não se corrige depois sem auditoria manual** dos registros.

### 5.2 Fase B — desbloqueio do front (parcialmente entregue)

Entregue: `birthDate` (BE-13), inbox de chats (BE-Q5), `phone` obrigatório
(BE-Q2) e ganhos do entregador (BE-17).

Falta, bloqueado na **decisão 1**:

- Fluxo de verificação de conta: implementar ou remover a etapa (BE-Q1)
- Rota de reenvio de código (BE-Q1)

> **Recomendação para a decisão 1:** verificação bloqueante (opção A), mas
> **só depois que o SMTP funcionar em homolog** — senão nenhuma conta nova
> consegue entrar. E com colunas próprias (`verificationCode` /
> `verificationExpiresIn`): reaproveitar o campo `code`, que hoje é da
> recuperação de senha, faz um fluxo invalidar o outro.

### 5.2.1 Fase S — SMS (validado; resta o homolog e a rotação do token)

- ✅ Credenciais confirmadas em 25/08
- ✅ `TWILIO_PHONE_NUMBER` corrigido para `+12527134087` — o número informado
  originalmente (`+18777804236`) não existe na conta
- ✅ Entrega no Brasil validada: `delivered` em 10s
- ✅ Fluxo completo da API validado: cadastro → forgot → reset → login
- Configurar as mesmas variáveis em homolog — hoje só o `.env` local tem os
  valores reais. Lembrar de reiniciar o serviço depois: o `.env` só é lido no boot
- **Rotacionar o `TWILIO_AUTH_TOKEN`.** Ele trafegou por uma conversa de chat;
  trate o valor atual como exposto

### 5.3 Fase C — delivery e cobrança (não iniciada)

Campos de restaurante (BE-D1) · endereço no pedido (BE-D2) · meios de pagamento
(BE-D3/Q6) · frete calculado no servidor (BE-D4) · `DELETE` de cardápio ou
soft-delete (BE-F1) · payout por período (BE-F2).

### 5.4 Fase E — débito técnico (não iniciada)

Renomear o pacote (`boilerplate_nest_prisma`) · corrigir "NestJS 10.0" na
descrição do Swagger · remover `users()` morto em `no-auth.service` · renomear
`dockerfile` para `Dockerfile` (o `docker-compose` referencia com maiúscula e o
build falha em filesystem sensível a caixa) · 3 erros de lint pré-existentes em
`deliveries`, `food-orders` e `works` · ligar `strictNullChecks` por módulo.

### 5.5 Adiados com justificativa

| Item | Por que ficou de fora |
|---|---|
| Refresh token e revogação no `logout` | Muda contrato de sessão. Encurtar o access token sem o front implementar refresh derruba o usuário a cada poucos minutos. Precisa de fatia coordenada |
| Limite de tentativas no reset | Exige coluna nova, ou seja migration. Com 1.000.000 de combinações e throttler de 100/min, o risco caiu de ~50 minutos para ~7 dias |
| Log estruturado (JSON/pino) | O middleware do `D4` já entrega correlação. Trocar o logger inteiro é mudança arquitetural que merece decisão própria |
| Owner-scope nas **leituras** de arquivo | O `A3` escopou só a exclusão. Restringir leitura pode quebrar fluxos legítimos (anexo de orçamento visível para a contraparte) |

---

## 6. Endereços do ambiente local

A API roda em **`PORT=8000`** no ambiente local da equipe (mesmo valor do
`.env.example` original; homolog usa `:8029`). Os endereços que o front aponta:

| Recurso | Endereço | Observação |
|---|---|---|
| REST | `http://localhost:8000/v1` | O `/v1` é prefixo global (`main.ts`) — sem ele tudo dá 404 |
| WebSocket · chat | `http://localhost:8000/chats` | **Sem `/v1`** — o prefixo não vale para Socket.IO |
| WebSocket · entrega | `http://localhost:8000/deliveries` | Idem |
| Swagger | `http://localhost:8000/docs` | Requer `ACTIVATE_SWAGGER=YES` |

No front, o valor fica em `src/environments/environment.ts` e
`environment.development.ts`, campo `apiBaseUrl`.

O token do WebSocket vai no handshake, em `auth.token` ou no header
`Authorization`. O CORS dos gateways está em `origin: '*'`, então a porta do
dev server não afeta o socket — só o REST.

> **Atenção:** o `.env.example` versionado sugere `PORT=3000`. Vale alinhar para
> `8000` numa próxima passada, para quem clonar o projeto não divergir da equipe.

---

## 7. Notas para o deploy

**CORS** — a partir do `A5`, a API só aceita as origens de `CORS_ORIGINS` ou, na
falta dela, `FRONTEND_URL`. Em homolog é preciso apontar para a origem real do
app:

```
CORS_ORIGINS=https://<origem-do-app-em-homolog>
```

Vazia nas duas, a API libera qualquer origem (comportamento antigo). **Errada, o
navegador bloqueia tudo** — e o erro aparece só no console do browser, nunca no
log da API.

**JWT_SECRET** — se hoje vem do ambiente do processo, nada muda. Sem o `D1`,
migrar para arquivo `.env` quebra o login inteiro.

**Migration** — o `A1` traz uma migration nova. Rodar `npx prisma migrate deploy`
no deploy. Ela anula os códigos de recuperação em trânsito, o que é intencional.

**Variáveis renomeadas no `.env.example`** — o código lê `AWS_BUCKET_NAME` e
`MAIL_CONTACTUS`. Versões anteriores do arquivo declaravam `AWS_S3_BUCKET` e
`MAIL_MESSAGE_CONTACTUS`, que **nunca são lidos**. Se upload e fale-conosco
parecem configurados mas não funcionam em homolog, é isso. Também foi
documentada a `CORS_ORIGINS` e removidas `ENABLE_NGROK`, `NGROK_*` e
`AWS_S3_FORCE_PATH_STYLE`, que nenhum ponto do código lê.

---

## 8. Adaptação necessária no front-end

O `A1` muda o contrato de dois endpoints. São duas alterações pontuais:

```diff
  POST /v1/no-auth/verify-code
- { "code": "1234" }
+ { "identifier": "joao@email.com", "code": "123456" }

  POST /v1/no-auth/reset
- { "code": "1234", "password": "...", "confirmPassword": "..." }
+ { "identifier": "joao@email.com", "code": "123456", "password": "...", "confirmPassword": "..." }
```

O `identifier` é o **mesmo valor** já enviado em `POST /no-auth/forgot` — basta
carregá-lo adiante entre as telas. A máscara do campo de código passa de 4 para
6 dígitos.

Do `A3`: as rotas de arquivo passam a exigir `Authorization`. O front já tem
interceptor de auth, então deve passar — confirmar em homolog.

Do `B3`: nenhuma adaptação. O telefone já era obrigatório na prática; só o
Swagger passa a dizer a verdade. Se o front marcava o campo como opcional no
formulário, agora convém marcar como obrigatório.

Do `B4`: rota nova, nada quebra. A tela de ganhos do entregador pode consumir
`GET /v1/deliveries/me/earnings`, que devolve `day`, `week`, `month` e `total`,
cada um com `{ amount, deliveries }`. `amount` vem como **string decimal**
(`"156.50"`) — é `Decimal(10,2)` no banco, e serializar como número perderia
precisão. Formatar no front sem converter para `Number` antes de arredondar.

---

## 9. Retomando do zero

Ambiente local: ver `docs/` e o runbook de setup. Resumo:

```bash
git checkout ajustes-gerais
npm install && npx prisma generate
cp .env.example .env          # ajustar JWT_SECRET, DATABASE_URL, FRONTEND_URL
npx prisma migrate deploy
npm run seed
npm run start:dev             # 208 rotas · Swagger em http://localhost:8000/docs
```

Credenciais dos seeds, todas com senha `12345678`: `admin.master@`,
`admin.one@`, `client.one@`, `supplier.one@`, `delivery.one@`,
`influencer.one@` — todos `@email.com`.

**Números de referência da branch:** 208 rotas (206 + inbox + ganhos) · 46 modelos ·
32 módulos · 14 migrations · 48 tabelas · 26 testes.

---

## 10. Registro de fases

| Fase | Escopo | Status | Patches | Testes |
|---|---|---|---|---|
| **A** | Segurança herdada | ✅ Entregue | 6 | — |
| **D** | Robustez | ✅ Entregue | 6 | 13 |
| **B** | Desbloqueio do front | 🟡 Parcial (BE-13, BE-Q5, BE-Q2, BE-17) | 4 | — |
| **S** | Integração de SMS | ✅ Entregue e validada de ponta a ponta | 2 | 13 |
| **C** | Delivery e cobrança | ⏸ Bloqueada nas decisões 3 a 6 | — | — |
| **E** | Débito técnico | ⏸ Não iniciada | — | — |
