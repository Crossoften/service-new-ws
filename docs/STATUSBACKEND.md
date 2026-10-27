# STATUS — Back-end `service-new-ws`

> Documento vivo de contexto e continuidade dos ajustes de back-end.
> **Atualizar ao final de cada fase**, antes de encerrar a sessão de trabalho.
>
> | | |
> |---|---|
> | **Branch de trabalho** | `ajustes-gerais` |
> | **Base** | `b2ae83e` (`luan/develop` @ 14/08/2026) |
> | **Última atualização** | 2026-10-20 — fim das Fases P, Q, AWS e X |
> | **Fases concluídas** | A, D, B, S, E, C, MP, W, P, Q, AWS e X · T em andamento |
> | **Próxima fase** | Nenhuma em código. O que resta é operação: rotação de credenciais, WABA do WhatsApp e SEC-1 (ver 5.6) |

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

### Fase B — Desbloqueio do front · ✅ entregue

Sete patches. Fase concluída.

| Patch | O quê | Demanda |
|---|---|---|
| `B1` | `birthDate` deixa de ser `string \| Date` — corrige o `type: object` no Swagger | BE-13 |
| `B2` | `GET /v1/chats` — inbox paginada com contraparte, último trecho e não lidas | BE-Q5 |
| `B3` | `phone` declarado obrigatório no contrato, alinhando ao que a validação já exigia | BE-Q2 · decisão 2 |
| `B4` | `GET /v1/deliveries/me/earnings` — ganhos do entregador por período | BE-17 · decisão 7 |
| `B5` | E-mail opcional: schema, migration e cadastro | decisão 1 · 3 |
| `B6` | Verificação de conta por SMS: cadastro nasce `Pending`, rotas de verificar e reenviar | decisão 1 |
| `B7` | Login por telefone: normalização na busca e fim da dependência do e-mail | decisão 1 |

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

**Sobre o `B7`.** Login por telefone já existia pela metade: `validateUser` chama
`findByEmailOrPhone`, que decide pelo `@`, e `phone` já é `@unique` no schema.
Faltavam duas coisas.

A primeira é o mesmo defeito que o `S1` corrigiu no `forgot`: a busca comparava
telefone por igualdade exata, então quem se cadastrasse com `(34) 99870-1109` —
gravado como `+5534998701109` — não conseguia entrar digitando o que digitou no
cadastro. E o erro sairia como `401` genérico, indistinguível de senha errada.

A segunda quebra com e-mail opcional:

```ts
// auth.service.ts, dentro de login()
const user = await this.loginService.findByEmail(userArg.email);
```

Uma segunda consulta, por `findUnique` no e-mail, só para montar a resposta. Com
`email: null` o Prisma recusa — o usuário passaria pela autenticação e estouraria
depois. Trocado por `findById`, que sempre funciona. O `findByEmail` ficou sem
uso e foi removido.

**Validação:** cinco formatos do mesmo número (`e-mail`, `+5534998701109`,
`34998701109`, `(34) 99870-1109`, `+55 34 99870-1109`) chegam ao mesmo usuário.
Senha errada e telefone inexistente seguem em `401`. Registro legado gravado em
formato nacional é encontrado por E.164. Login de admin ainda devolve as 5
permissões — o `findById` mantém o `include`. Token emitido pelo login por
telefone funciona em rota autenticada.

**Sobre o `B5`.** `email` passa a `String?` no schema e `NULL` no banco. O índice
único fica: no MySQL ele admite vários `NULL`, então a unicidade só vale para
quem informa e-mail — testado com dois cadastros sem e-mail convivendo.

Dois cuidados no código. O `OR` da checagem de duplicidade passou a montar a
condição de e-mail só quando ela existe: uma entrada vazia ali não seria neutra,
buscaria por e-mail vazio. E a gravação passou a usar `trimmedEmail`, que é
`null` quando o campo não vem, em vez de `email.trim()`, que estouraria.

Cheguei a suspeitar que o `checkExistingUser` tivesse um problema parecido —
ele monta `OR: [{id}, {document}, {email}, {phone}]` com valores possivelmente
`undefined`, e uma condição vazia num `OR` poderia casar com tudo. **Sondei
contra o banco: o Prisma remove as condições `undefined`, e o resultado é `null`,
não a base inteira.** O helper está correto; não precisou de mudança.

**Sobre o `B6`.** O cadastro nasce `Status.Pending` e grava
`verificationCode` (hash) e `verificationExpiresIn` (4h). O bloqueio veio de
graça: o `A4` já recusa token de conta que não esteja `Active`.

**O SMS sai antes de criar a conta.** Na ordem inversa, uma falha do provedor
deixaria uma conta órfã, impossível de verificar e ocupando o telefone — a
segunda tentativa de cadastro bateria em `409`. Falhando antes, nada é gravado.
Testado: com o Twilio inalcançável, cadastro devolve `503` e o telefone segue
livre.

Rotas novas, ambas com mensagem genérica por decisão de segurança:

| Rota | Falha responde |
|---|---|
| `POST /no-auth/verify-account` | `404 "Usuário ou código inválido."` para conta inexistente, código errado, expirado, já usado ou conta já verificada |
| `POST /no-auth/resend-verification` | `200` mesmo sem enviar nada — conta inexistente ou já verificada |

A mensagem do `503` do SMS deixou de sugerir "use o e-mail": o mesmo envio
agora atende recuperação de senha e verificação, e no cadastro a sugestão não
faz sentido — ainda mais com e-mail opcional.

**Validação executada** (210 rotas), com o envio de SMS interceptado localmente
para capturar o código em claro:

| Caso | Resultado |
|---|---|
| Cadastro sem e-mail | `201` · `status: Pending` · `email: null` |
| Login antes de verificar | `401` |
| Código errado / telefone inexistente | mesma mensagem, `404` |
| Verificação com máscara diferente da do cadastro | `200` |
| Login depois de verificar | `200` com token |
| Reusar o código já usado | `404` · colunas zeradas no banco |
| Reenvio invalida o código anterior | código antigo `404`, novo `200` |
| Reenvio para conta ativa / telefone inexistente | `200`, **zero SMS gerado** |
| Cadastro com Twilio fora | `503` · nenhuma conta criada |
| Contas antigas (admins inclusive) | continuam entrando por e-mail |

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

### Fase E — Débito técnico · ✅ entregue

| Patch | O quê |
|---|---|
| `E1` | Nome do pacote, descrição e versão do NestJS no Swagger |
| `E2` | `/my-self` deixa de devolver o hash do código de recuperação · remoção de método morto |
| `E3` | Dois erros de lint pré-existentes e `forceConsistentCasingInFileNames` |

**O `E2` virou mais do que limpeza.** A tarefa era remover o `users()` morto em
`no-auth.service`. Ao abrir o arquivo, o método vizinho — `mySelf`, esse **em
uso**, servindo `GET /v1/my-self` — tinha o mesmo `select`, e ambos incluíam
`code`.

Confirmado contra a API rodando: a rota devolvia, para o próprio usuário
autenticado, o **hash bcrypt do código de recuperação de senha**.

```jsonc
{ "id": 3, "name": "client one",
  "code": "$2b$10$yTvb1g0rFw.mGRHJQBNeQ.kIa8ickl…" }
```

O risco é contido — é o hash do próprio usuário, e quem tem o token já tem a
conta. O que incomoda é que o hash sai do servidor: ele passa a existir em log
de proxy, ferramenta de suporte, relatório de erro. E de posse dele o ataque
vira offline, longe do throttler, contra **1.000.000** de combinações de 6
dígitos dentro de uma janela de 4 horas.

Nada no produto consumia o campo. Saiu do `select` e do `ResponseAllUserDto`,
que também o prometia no Swagger.

**O que a lista dizia e não batia mais:**

- Eram **2** erros de lint pendentes, não 3 — o de `deliveries` já tinha sido
  corrigido de passagem no `B4`
- `forceConsistentCasingInFileNames: true` custou **zero** erro. Ligado

**O que ficou de fora, de propósito:**

- **`strictNullChecks`.** Medi: **146 erros** de tipo. Não é item de faxina, é
  fatia própria — e a mais barata seria por módulo, começando pelos que já têm
  teste. Não fiz
- **Renomear `dockerfile` para `Dockerfile`.** O `docker-compose.yml` referencia
  com maiúscula e o build quebra em filesystem sensível a caixa (Linux, CI).
  **Não vai como patch**: no macOS, que é *insensível* a caixa, um patch que
  apaga `dockerfile` e cria `Dockerfile` corrompe o arquivo. É comando, não
  diff — está na seção 5.4

---

### Fase C — Delivery e cobrança · ✅ entregue

Decisões 3 a 6 tomadas em 26/08. Oito patches.

| Patch | O quê | Decisão |
|---|---|---|
| `C1` | `DebitCard` e `Cash` no enum de meios de pagamento | 3 |
| `C2` | Situação de pagamento no pedido e confirmação de recebimento em dinheiro | 3 |
| `C3` | Frete calculado no servidor por faixa de distância, configurável no admin | 4 |
| `C4` | Avaliação de restaurante com nota de 1 a 5 e trava de uma por cliente | 5 |
| `C5` | Exclusão de item de cardápio | BE-F1 |
| `C6` | Contratos do Swagger: respostas tipadas, autenticação e enums nomeados | — |
| `C7` | `postinstall` roda `prisma generate` | — |
| `C8` | Curinga de rota no formato do Express 5 | — |

**Sobre o `C1`.** O enum tinha três valores e `mapPaymentMethod()` dobrava
`debit_card` em `CreditCard` — uma linha deliberada, não um acidente. Débito e
dinheiro passam a existir. A migration é aditiva; nenhuma linha muda de valor.

> **Conciliação histórica.** Os pedidos gravados antes desta migration que
> foram pagos no débito continuam como `CreditCard`, e o banco não permite
> distingui-los. A origem está no Mercado Pago, via `mpPaymentId` na tabela
> `payments`, se for preciso reclassificar.

**Sobre o `C2`, e o que ele revelou.** Ao implementar a confirmação, descobri
que **pedidos de comida nunca criaram linha em `payments`**. O pedido guardava o
meio escolhido e nada registrava se o dinheiro entrou — para nenhum meio, não só
dinheiro. Não havia onde marcar o recebimento.

Daí as colunas novas em `FoodOrder`: `paymentStatus`, `paidAt` e
`paidConfirmedById`. A rota `PATCH /food-orders/:id/confirm-payment` aceita
apenas `Cash`; os demais meios respondem `400`, porque marcar cartão à mão
abriria caminho para dar como pago o que não foi. Confirma quem entrega — o
entregador designado ou, sem entrega atribuída, o dono do restaurante. O cliente
não confirma o próprio pagamento. Idempotente, para o duplo toque no botão não
virar erro na tela.

A migration dá como pagos os pedidos já entregues: foram concluídos sob a regra
antiga, em que a entrega encerrava o assunto, e deixá-los pendentes criaria uma
fila de cobrança falsa no primeiro relatório.

**Sobre o `C3`.** O cliente enviava `deliveryFee` e recebia de volta, no
repasse, exatamente esse número — quem pagava a conta definia quanto o
entregador ganhava. O campo saiu do contrato. A taxa agora é medida no servidor:
distância entre os endereços, faixa correspondente em `DeliveryFeeRule`, valor
fixo em reais ou percentual sobre o valor dos itens.

Distância por Haversine, em linha reta. O trajeto real é maior — algo entre 20%
e 40% em malha urbana — mas para escolher faixa isso basta, e evita depender de
um serviço de rotas que cobra por chamada e entra no caminho crítico de criar
pedido. Se um dia incomodar, o ponto de troca é o `src/utils/haversine.ts`
sozinho.

`Address` ganhou `latitude` e `longitude`, com a precisão que
`DeliveryAssignment` já usava. **Quem preenche é o front**, ao geocodificar o
endereço escolhido. Sem coordenada em qualquer das pontas, o cálculo cai na
faixa que começa em zero — degradar assim é melhor que recusar o pedido, porque
o cliente não tem como resolver a ausência de um dado que nem sabe que existe.

A migration semeia uma faixa única de R$ 8,00 para qualquer distância,
reproduzindo o comportamento anterior. **Substitua pelas faixas reais**; sem
isso o frete continua fixo.

**Sobre o `C4`.** Não era só expor um campo: `Review` não tinha **nenhuma** nota,
e avaliação de restaurante era a única dos cinco tipos sem `@@unique` — o mesmo
cliente podia avaliar infinitas vezes. Também não existia rota de avaliação de
restaurante.

`rating` é nulável no modelo de propósito: as avaliações de serviço, produto,
hospedagem e transporte nunca tiveram nota e seguem válidas. Só a rota de
restaurante exige. A média é agregada na consulta, em lote para a página
inteira, em vez de guardada em coluna — média materializada desatualiza sem
avisar quando uma avaliação é corrigida.

`type` continua obrigatório no modelo, herdado das avaliações de polegar. É
derivado da nota: 4 e 5 viram `Positive`, o resto `Negative`. Regra minha, não
sua — se o corte for outro, é uma linha.

**Sobre o `C5`.** O comportamento depende do histórico, e o motivo é concreto:
`FoodOrderItem` guarda o preço praticado mas **não o nome** do item. Apagar um
item já pedido deixaria pedidos entregues sem descrição do que foi vendido, além
de esbarrar na chave estrangeira. Então: nunca pedido, apaga; já pedido,
desativa. A resposta traz `deleted` dizendo qual dos dois aconteceu, para a tela
não prometer o que não fez.

**Sobre o `C6`, e o que a auditoria do contrato encontrou.** O Swagger é gerado
dos decorators, então os patches anteriores já o tinham mudado. O que faltava
era conferir o que ele publica de fato — decorator esquecido não aparece em
build nenhum. Três problemas:

**1. Vinte e duas rotas protegidas apareciam como abertas.** O guard é global e
só o `@IsPublic()` escapa, mas a documentação dependia de cada rota declarar
`security` à mão no `@ApiOperation`. As que esqueciam ficavam sem declaração
alguma — e sem exigência global, um gerador de cliente lê isso como "não
precisa de token".

Estavam nessa situação **`food-orders` e `deliveries` inteiros**, além das
rotas de upload que o `A3` justamente fechou.

A correção inverte o padrão: `addSecurityRequirements('bearerAuth')` na raiz, e
o `@IsPublic()` passou a carimbar `x-public`, removido do documento depois de
zerar o `security` daquela operação. Agora a documentação segue o código sem
ninguém precisar lembrar — rota nova nasce protegida na documentação, como já
nascia no código.

**2. Catorze rotas sem contrato de resposta**, documentadas com texto em vez de
tipo. O front não gera cliente a partir delas. Doze foram tipadas — os quatro
endpoints de cardápio (os DTOs já existiam, faltava exportá-los), os quatro
rankings do admin, `health-check`, `admin-users`, o `DELETE` de faixa de frete
que eu mesmo deixei sem tipo, e o download de arquivo, que ganhou declaração
binária para o cliente usar blob em vez de tentar interpretar JSON.

Sobra o webhook do Mercado Pago, e de propósito: quem o chama é o Mercado Pago,
não o front.

**3. `PATCH /admin-influencers/:id/commission` declarava `204 No Content`** e
respondia `200` com corpo. Contrato mentindo.

Também nomeei os enums do delivery — `FoodOrderStatusEnum`,
`DeliveryAssignmentStatusEnum` e `DeliveryFeeTypeEnum` saíam inline, o que gera
tipo anônimo no cliente. Os outros 45 enums inline do projeto ficaram como
estão: seria varredura ampla sem pedido.

**A configuração do Swagger saiu do `main.ts`** para `src/swagger.ts`, porque
agora dois pontos a consomem — o boot e o `npm run swagger:export`, que grava
`docs/openapi.json`. Duplicar a configuração faria o arquivo exportado divergir
da documentação publicada sem ninguém perceber.

> **O `docs/openapi.json` envelhece.** Rode `npm run swagger:export` depois de
> qualquer mudança em rota ou DTO. Contrato exportado desatualizado é pior que
> nenhum, porque parece confiável.

**Sobre o `C7`, que nasceu de um tropeço real.** Aplicados todos os patches, o
`start:dev` devolveu **42 erros de compilação** — `DeliveryFeeRule` inexistente,
`Cash` fora do enum, `paymentStatus` desconhecido, `rating` idem. Nenhum era de
código: o Prisma Client em `node_modules` ainda descrevia o schema antigo.

O sintoma que entrega o diagnóstico:

```
Property 'Cash' does not exist on type
  '{ CreditCard: "CreditCard"; Pix: "Pix"; BankSlip: "BankSlip"; }'
```

Três valores — o enum de antes do `C1`.

O projeto nunca teve `postinstall`, então `prisma generate` dependia de alguém
lembrar. Passa a rodar sozinho depois de todo `npm install` e `npm ci`, o que
cobre também o time e o deploy. **Não substitui o `migrate deploy`**: o
`generate` lê o `schema.prisma` e conserta o TypeScript; quem altera o banco é
a migration.

Depois de aplicar patches com migration, a sequência é sempre:

```bash
npx prisma migrate deploy   # altera o banco
npx prisma generate         # atualiza o cliente TypeScript
```

E reinicie o `start:dev` — o watch não recompila o que está em `node_modules`.

**Sobre o `C8`, que veio do mesmo boot.** O log trazia:

```
WARN [LegacyRouteConverter] Unsupported route path: "/v1/*"
```

Culpa minha, do `D4`: o middleware de correlação usava
`forRoutes('*')`. O NestJS 11 roda sobre o Express 5, cujo `path-to-regexp`
exige curinga nomeado — `'*path'`. Ele converte sozinho e avisa, mas a
conversão automática não é para durar.

Trocado e verificado: o aviso sumiu, o `x-request-id` continua saindo em todas
as rotas e o log de requisição do `D4` segue funcionando.

**Validação executada**, 217 rotas, contra banco real:

| Caso | Resultado |
|---|---|
| Pedido em `Cash` e em `DebitCard` | `201`, valores novos aceitos |
| Cliente confirma o próprio pagamento | `403` |
| Restaurante confirma pedido em dinheiro | `200`, `Paid`, com autor registrado |
| Confirmar de novo | `200`, idempotente |
| Confirmar pedido no débito | `400` |
| Frete a ~1,5 km / ~6 km / ~30 km | R$ 6,00 · R$ 12,00 · R$ 10,00 (20% de R$ 50) |
| Cliente envia `deliveryFee: 0` | Ignorado; cobrada a faixa correta |
| Endereço sem coordenadas | Cai na faixa inicial, pedido não é recusado |
| Faixa com máximo menor que o mínimo | `400` |
| Cliente na rota de admin | `403` |
| Avaliar sem pedido entregue | `403` |
| Avaliar duas vezes | `409` |
| Nota fora de 1 a 5 | `400` |
| Média na listagem | `ratingAverage: 5`, `ratingCount: 1` |
| Excluir item nunca pedido | Apagado, `deleted: true` |
| Excluir item já pedido | Desativado, `deleted: false`, histórico intacto |

---

### Fase T — Ambiente de teste · 🟡 em andamento

Motivada por uma necessidade concreta: **não havia como ter um fornecedor
operante sem pagamento real.** A assinatura nasce `Pending` e só é ativada pelo
webhook do provedor. A rota de bônus do admin, que parecia resolver, apenas
estende o `currentPeriodEnd` de uma assinatura existente — não cria nem ativa.

| Patch | O quê |
|---|---|
| `T1` | `POST /admin-providers/:id/subscriptions/grant` — concessão administrativa de assinatura |
| `T2` | Confirmação de pagamento deixa de estourar `403` para o entregador |
| `T3` | `npm run seed:test` — cenário completo em um comando |

**Por que rota, e não variável de ambiente.** A alternativa barata seria um
`BYPASS_SUBSCRIPTION=true`. Ficaria a um `.env` de distância de desligar a
cobrança em produção, e ninguém perceberia até o fechamento do mês não bater.
A concessão, além de não abrir esse caminho, é funcionalidade que o negócio vai
querer de qualquer forma: cortesia a parceiro, acordo comercial, compensação por
indisponibilidade, migração de base antiga.

**O que a concessão registra.** `grantedById` e `grantReason` são colunas novas
em `Subscription`. Sem elas, uma cortesia seria indistinguível de uma assinatura
paga — e a diferença importa, porque numa entrou dinheiro e na outra não. O
`amount` vai zerado e **nenhum lançamento financeiro é criado**: o razão
continua refletindo só o que de fato entrou.

**Uma assinatura ativa por vez.** Conceder por cima de uma ativa responde `409`
apontando para a rota de bônus, que é o caminho de estender. Duas assinaturas
válidas ao mesmo tempo fariam o guard depender de qual o banco devolvesse
primeiro.

**Validação executada** contra banco real:

| Caso | Resultado |
|---|---|
| Fornecedor publica serviço **antes** da concessão | `403` "assinatura ativa" |
| Concessão de 12 meses | `201` · `Active` · validade em 2027 |
| Fornecedor publica serviço **depois** | `201` |
| Conceder de novo a quem já tem | `409` apontando a rota de bônus |
| Bônus de 6 meses sobre a concessão | `200` · validade estendida para 2028 |
| Fornecedor concedendo para si mesmo | `403` |
| Plano inexistente · duração acima de 120 meses | `404` · `400` |
| Razão financeiro | Nenhum `payment` criado, nenhum lançamento novo |

**Ainda por fazer nesta fase:**

**Sobre o `T3`, e o bug que ele encontrou.** O seed monta o cenário inteiro de
forma idempotente — quatro contas com telefone em E.164 e status `Active`,
assinatura concedida para fornecedor e restaurante, restaurante com cardápio,
endereços com coordenadas a ~1,5 km um do outro, e três faixas de frete reais
no lugar da faixa única que a migration do `C3` semeia.

Rodar o ciclo completo em cima dele expôs um defeito do `C2` que os testes
isolados não pegaram: **o entregador confirmava o pagamento em dinheiro e
recebia `403`.**

A gravação funcionava; o que estourava era a montagem da resposta.
`confirmCashPayment` terminava chamando `findById`, que só autoriza cliente e
dono do restaurante. O entregador via erro numa operação que tinha dado certo, e
o segundo toque no botão dava o mesmo erro — porque o caminho idempotente também
terminava em `findById`.

Corrigido no `T2`, separando a montagem da resposta da checagem de acesso. A
política de leitura ficou intacta de propósito: `GET /food-orders/:id` continua
recusando o entregador, que já enxerga o pedido pelas rotas de entrega.

> **A lição vale além deste caso:** teste de unidade não pega isso. Só apareceu
> quando o cenário foi exercitado de ponta a ponta com os quatro perfis reais,
> que é exatamente para o que o seed serve.

**Ainda por fazer nesta fase:**

- Ao trazer o split, mover o `verifySellerLinked` para valer só quando o
  pagamento passa pelo Mercado Pago — hoje ele bloqueia até pedido em dinheiro,
  o que mata o caminho de teste que não depende de gateway

---

### Fase MP — Split automático do Mercado Pago · ✅ entregue

Trazido da `luan/develop` (commits de 18 a 20/08), com as correções que a
revisão levantou. Reescrito em cima da nossa base em vez de mesclado: os dois
lados tinham tocado os mesmos arquivos, e as seis ressalvas precisavam ser
endereçadas de qualquer forma.

| Patch | O quê |
|---|---|
| `MP1` | Vínculo da conta do vendedor por OAuth, com tokens cifrados |
| `MP2` | Split nos fluxos que cobram, com taxa vinda de configuração |
| `MP3` | A trava de vínculo vale só quando o pagamento passa pelo gateway |

**Como funciona.** O vendedor autoriza a plataforma pelo OAuth do Mercado Pago.
A partir daí o checkout é criado **com o token dele**, e o `marketplace_fee`
informa quanto a plataforma retém — o dinheiro é dividido na origem. Isso
fecha a lacuna registrada na seção 4: até então o razão creditava 100% ao
prestador e a plataforma não retinha nada.

**As seis correções, uma a uma:**

| # | O que estava | O que ficou |
|---|---|---|
| 1 | Sem migration, commits marcados `[RESET DB]` | Migration escrita. Homolog e produção têm caminho |
| 2 | 10% fixos no código | `PlatformSettings.marketplaceFeeRate`, ajustável pelo admin sem deploy. A categoria do serviço, quando define taxa própria, tem precedência |
| 3 | Tokens em texto puro | AES-256-GCM antes de gravar (`src/utils/secretBox.ts`) |
| 4 | Refresh token guardado e nunca usado | `refreshSellerLink()` renova o vínculo |
| 5 | Restaurante sem vínculo não recebia nem pedido em dinheiro | A trava vale só quando o meio de pagamento passa pelo gateway |
| 6 | Delivery ganhou a trava mas não a cobrança | A trava saiu do caminho do dinheiro. A cobrança de delivery pelo Mercado Pago continua pendente, e agora está registrada como tal |

**Sobre a cifragem.** O formato guardado carrega a versão do esquema —
`v1:<iv>:<tag>:<cifra>` — para permitir trocar algoritmo ou chave sem precisar
adivinhar como cada registro antigo foi cifrado. O GCM autentica além de cifrar:
texto adulterado falha na decifragem em vez de devolver lixo.

> **Trocar `MERCADOPAGO_TOKEN_ENCRYPTION_KEY` invalida os vínculos existentes.**
> Os tokens gravados não poderão ser decifrados e cada vendedor terá que
> autorizar de novo. A chave é dado de infraestrutura, não configuração casual.

**Onde a renovação acontece.** No ponto de uso, não em rotina agendada: é onde
se descobre que o token venceu, e é onde o vendedor perderia a venda se nada
fosse feito.

**Rotas novas** — três, todas autenticadas:

| Rota | O quê |
|---|---|
| `GET /mercado-pago/status` | Se a conta do usuário está vinculada |
| `GET /mercado-pago/connect-url` | Endereço para onde levar o vendedor |
| `POST /mercado-pago/oauth/callback` | Troca o código pelos tokens e vincula |

Nenhum token sai da API: o callback devolve só o identificador público do
vendedor.

**Validação executada** (221 rotas), com o vínculo simulado por um token cifrado
inserido direto no banco — as credenciais reais do cliente ainda não chegaram:

| Caso | Resultado |
|---|---|
| Pedido em **dinheiro**, restaurante sem vínculo | `201` — o caminho de teste segue de pé |
| Pedido no **cartão**, restaurante sem vínculo | `400` "vendedor não vinculou conta" |
| `GET /mercado-pago/status` sem vínculo | `{"isLinked": false}` |
| `GET /mercado-pago/status` com vínculo | `isLinked`, `mpUserId` e `linkedAt` — nenhum token |
| `connect-url` sem `CLIENT_ID` | `503` explicando qual variável falta |
| Token no banco | `v1:a92ca77e…` · zero ocorrências de texto em claro |
| Admin lê e altera a taxa | `10` → `15` → `10`, refletido no banco |
| Configuração ausente | Criada com o padrão do schema, em vez de virar taxa zero silenciosa |
| Cifragem | 8 testes: ida e volta, IV aleatório, chave errada, conteúdo adulterado, acentuação |

**O que continua pendente**, e é importante não confundir com entregue:

- **Nada foi exercitado contra o Mercado Pago de verdade.** Faltam as
  credenciais do cliente. O fluxo OAuth completo, o split real e o webhook só
  podem ser validados com uma aplicação de teste do Mercado Pago
- **Delivery continua sem cobrança pelo gateway.** Pedido de comida não cria
  `Payment`; só dinheiro é confirmado, pela rota do `C2`

---

### Fase W — WhatsApp no Twilio · ✅ entregue

**Objetivo.** Trocar o provedor das notificações assíncronas por WhatsApp da
Cloud API da Meta para o Twilio, unificando o canal com o SMS de verificação,
que já roda no Twilio desde a Fase S.

**Motivo técnico.** Manter dois provedores significava duas contas, dois
processos de aprovação de template e dois modos de falha para depurar. O SMS já
estava validado no Twilio com número real (`+12527134087`), então o WhatsApp
passar a usar a mesma conta elimina um fornecedor inteiro do caminho crítico.

**Patch W1 — `src/modules/whatsapp/whatsapp.service.ts`, `whatsapp.service.spec.ts`, `.env.example`, `env.example`**

- Envio passa a usar o SDK do Twilio (`messages.create`) com **Content
  Template** (`contentSid` + `contentVariables`), no lugar do `fetch` direto
  contra `graph.facebook.com`
- Destino vira `whatsapp:+E164`, derivado do **`normalizePhoneBR` já existente**
  (`src/utils/normalizePhone.ts`), em vez das regras próprias de contagem de
  dígitos que existiam no serviço
- Guarda de formato do SID replicada do `SmsService`: sem `AC` no início, o
  client fica `null` e o serviço apenas se desabilita — o placeholder do
  `.env.example` deixa de derrubar o bootstrap
- Quebras de linha na mensagem são achatadas em espaço antes de virar variável
  do template
- Falha do provedor continua sem propagar: notificação é acessório e não pode
  derrubar a operação de negócio que a disparou

**Duas melhorias deliberadas sobre a versão da `luan/develop`.** A implementação
que existia lá não tinha a guarda de formato do SID (o placeholder derrubava o
boot) e trocava a normalização de telefone por regras próprias que estreitavam
a faixa aceita de 10–13 para 12–13 dígitos, silenciosamente. As duas foram
corrigidas aqui.

**Variáveis de ambiente.** Saem `WHATSAPP_ACCESS_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION`, `WHATSAPP_TEMPLATE_NAME` e
`WHATSAPP_TEMPLATE_LANGUAGE_CODE`. Entram `TWILIO_WHATSAPP_FROM` (formato
`whatsapp:+E164`) e `TWILIO_WHATSAPP_CONTENT_SID` (`HX...`). `TWILIO_ACCOUNT_SID`
e `TWILIO_AUTH_TOKEN` são reaproveitados da seção de SMS — é a mesma conta.

**Ajuste de infraestrutura de teste.** O bloco `jest` do `package.json` não tinha
`moduleNameMapper`, então nenhuma suíte conseguia importar um módulo por alias
(`@database/...`, `@utils/...`). As suítes existentes passavam só porque todas
usavam import relativo. Adicionado — sem isso a suíte do WhatsApp nem carrega.

**Validação.** `npx jest`: 6 suítes, **44 testes, todos passando** (11 novos).
`npm run build` limpo. `npx eslint src` limpo. Patch verificado em worktree
descartável a partir de `464e3a7`, com conferência byte a byte contra a árvore
de trabalho.

**Pendente.** Criar a Content Template no Twilio Content Template Builder (um
único parâmetro de corpo, `{{1}}`) e preencher as duas variáveis novas em
homologação. Enquanto não existirem, a notificação é apenas logada — por
desenho, nada quebra.

---

### Fase P — Assinatura por categoria · ✅ entregue

**Objetivo.** O fornecedor passa a pagar uma assinatura **por categoria de
atuação** dentro da sua vertical, e não uma assinatura única que libera tudo.
Confirmado com o cliente a partir da arte de planos: Mensal, Semestral e Anual,
preço único por enquanto.

**Motivo técnico.** O portão de assinatura era global — `userId` + `status`
`Active`. Um pintor assinante entrava em qualquer categoria. A mudança move a
decisão para um predicado único, compartilhado entre o portão e o catálogo, de
modo que as duas respostas não possam divergir.

**Patch P1 — `prisma/schema.prisma`, `src/modules/subscription-guard/active-subscription.filter.ts` (novo), serviço e portão**

- `Subscription.categoryId Int?` — nulo significa assinatura legada, que cobre
  tudo; índice composto `@@index([userId, categoryId, status])`
- Novo `assinaturaVigenteWhere(userId, categoryId?, agora?)`, **usado pelo
  portão e pelo catálogo**. É a peça central da fatia: enquanto eram duas
  consultas separadas, nada impedia o catálogo dizer "assinado" e o portão
  dizer "pague"
- `POST /v1/subscriptions` passa a **exigir `categoryId`** — é a única mudança
  do lote que quebra chamada existente

> **Bug que eu mesma reintroduzi e o teste pegou.** A primeira versão do
> predicado compunha as condições com espalhamento de objeto
> (`{ ...periodoEmAberto, ...cobreACategoria }`). Como as duas metades têm uma
> chave `OR`, a segunda **sobrescreve** a primeira em silêncio, e o portão
> deixaria de checar datas. O TypeScript não acusa — é espalhamento, não chave
> duplicada em literal. Corrigido com `AND` explícito, e confirmado por teste
> de mutação: reintroduzir o bug derruba 2 testes.

**Patch P2 — `subscription-period.ts` (novo), schema, serviço**

- `Subscription.cancelAtPeriodEnd Boolean @default(false)` — cancelar agenda o
  fim para o vencimento em vez de cortar na hora; `status` segue `Active` e
  quem decide é o predicado
- `JANELA_DE_RENOVACAO_DIAS = 7` e `DIAS_DE_CARENCIA = 3`, ambos definidos com
  o cliente
- `somarMeses` com **trava no último dia do mês**: o webhook usava `setMonth`,
  que transforma 31/01 + 1 mês em 03/03 — e o erro **compõe** a cada renovação

**Patch P3 — `GET /v1/subscriptions/catalog`, `/current`, `:id/reactivate`, `:id/renew`**

Catálogo de categoria + prazo + valor numa chamada, para o front montar a tela
de planos sem N requisições.

**Patch P4 — `docs/ORIENTACOESFRONT.md` seção 8.13**

**Validação.** Suíte completa verde; teste de mutação em dois pontos (predicado
e emenda do webhook). Migration aplicada sem drift.

---

### Fase Q — Contrato e diagnóstico de erro · ✅ entregue

**Patch P5 — `src/filters/prisma-exception.filter.ts`**

Enum `PrismaErrorCode` com `PRISMA_VALIDATION`, `UNIQUE_CONSTRAINT`,
`FOREIGN_KEY_CONSTRAINT`, `RECORD_NOT_FOUND`, `VALUE_TOO_LONG` e
`UNEXPECTED_DATABASE_ERROR`, devolvido no campo `code` de toda resposta de erro.
Nasceu de um caso real: o front via `{"message":"Requisição inválida."}` sem
nenhuma pista do que era. 9 testes novos.

**Patch P6 — `scripts/generate-swagger.ts`**

Uma linha: `app.setGlobalPrefix('/v1')`.

> **O artefato é que estava mentindo.** O `main.ts` aplica o prefixo; o gerador
> do `swagger.json` não aplicava. O contrato exportado dizia
> `/subscriptions/catalog` enquanto a API serve `/v1/subscriptions/catalog`, nas
> 195 rotas. O `ORIENTACOESFRONT.md` estava certo o tempo todo. Verificado
> contra a API rodando: `/v1/subscriptions/catalog` → `401`,
> `/subscriptions/catalog` → `404`. Corrigi o gerador em vez de documentar o
> defeito.

---

### Fase AWS — Armazenamento no S3 · ✅ entregue e validada de ponta a ponta

**Objetivo.** Usar o bucket do cliente (`bkt-service`, `us-east-1`) como
repositório de fotos e vídeos de todo o sistema.

**Patch S1 — `upload.service.ts`**

Removido `ACL: public_read`, que falha com `AccessControlListNotSupported` em
bucket com *Object Ownership = Bucket owner enforced* — o padrão desde 2023.

**Patch S3 — bucket privado e leitura pela API**

`fileUrlFor(fileKey)` passa a devolver **sempre** `{API}/v1/files/{fileKey}`, e
`openByKey` serve do S3 ou do disco. URL pré-assinada foi descartada de
propósito: ela expira, e essa URL é **gravada em dezesseis tabelas** — URL que
expira não pode morar em coluna.

**Patch S4 e S4b — vídeo por envio direto**

- `POST /v1/upload/presign` → `createPresignedPost` com
  `['content-length-range', 1, LIMITE_UPLOAD_DIRETO]`, que é a **única** forma
  de o teto ser imposto pelo próprio S3
- `LIMITE_UPLOAD_DIRETO = 200 MB`, `VALIDADE_DA_AUTORIZACAO = 15 min`
- Autorização sem estado por HMAC, conferida com `timingSafeEqual`
- Sem credencial da AWS, a estratégia vira `api` e o arquivo vai para o disco —
  o formato da resposta é o mesmo, então a tela do front não muda de ambiente
- Imagem: **10 MB**, `png`, `jpg`, `jpeg`, `webp`, `pdf`

**Patch S5 — `videoUrl` e `videoKey` em produto, hospedagem e transporte**

Mais `scripts/corrigir-urls-placeholder.sql`, com bloco de conferência antes dos
19 `UPDATE`s.

**Patch S6 — `ORIENTACOESFRONT.md` seção 8.14**

**Validação.** `scripts/testar-s3.sh` contra o bucket real: upload, leitura pela
URL gravada com conteúdo idêntico, **objeto não legível publicamente**, teto de
tamanho recusado com `413`, presign com estratégia `s3`, envio direto e
confirmação, token forjado recusado com `403`.

---

### Fase X — Correções de campo · ✅ entregue

Fatias nascidas de problemas reais encontrados ao colocar o sistema para rodar.

**Patch X1 — código de verificação por WhatsApp**

`VerificationCodeService` tenta WhatsApp e cai para SMS. Template **separado**,
de categoria `AUTHENTICATION` (`TWILIO_WHATSAPP_OTP_CONTENT_SID`): a Meta proíbe
OTP por template `UTILITY`, e o castigo não é o envio falhar na hora — é o
template ser pausado depois e a nota de qualidade do número cair, degradando
**todas** as mensagens.

**Patch X2 — o nono dígito no endereço do WhatsApp**

> **O bug mais sério do lote.** `toWhatsappAddress` montava
> `whatsapp:${normalizePhoneBR(phone)}`, preservando o nono dígito. Mas o
> WhatsApp cadastra o celular brasileiro na forma vigente em cada região quando
> o dígito foi introduzido: DDD 11–28 **com**, de 31 em diante **sem**. A linha
> telefônica tem o dígito nos dois casos; quem não tem é o cadastro.
>
> Atingia OTP e notificações para a maior parte do Brasil fora do eixo
> SP–RJ–ES, e falhava do pior jeito: a API aceita (`queued`), nada é lançado, o
> fallback de SMS **não** dispara, e o usuário não recebe nada.
>
> Novo `normalizeWhatsappPhoneBR`, usado só pelo endereço de WhatsApp — o SMS
> vai para a operadora e precisa do número completo. **O spec anterior
> codificava o bug**: três asserções esperavam `whatsapp:+5534998701109`. Por
> isso a suíte passava com o defeito presente.
>
> A regra do DDD é heurística sobre sistema externo, não especificação
> publicada pela Meta — está isolada na constante
> `BR_DDD_MAXIMO_COM_NONO_DIGITO`.

**Patch X3 — `scripts/testar-s3.sh` portável**

Usava `xargs -d`, que é do GNU e não existe no macOS; e anexava os campos
assinados **depois** do `-F file=@...`, enquanto o S3 exige o arquivo por
último. Funcionava no Linux por acaso. Mais um helper `extrair()` que, quando a
chave esperada não vem, imprime **o corpo da resposta** em vez de um traceback
do Python.

**Patch X4 — collation no `corrigir-urls-placeholder.sql`**

As variáveis `@BASE_ERRADA`/`@BASE_CERTA` nascem com a collation da **conexão**
(`utf8mb4_0900_ai_ci` no MySQL 8), as tabelas são `utf8mb4_unicode_ci`, e o
`LIKE` estoura `ERROR 1267`. Resolvido com um `SET NAMES` no topo.

**Patch X5 — `ORIENTACOESFRONT.md`, origem da URL de mídia**

**Duas falhas de ambiente no meu lado.** X3 e X4 existem porque meus testes
rodaram onde o problema não aparece: GNU `xargs` contra o BSD do macOS, e
MariaDB — que não tem `utf8mb4_0900_ai_ci` — contra MySQL 8.

**Validação.** Suíte completa: **45 suítes, 396 testes**. Teste de mutação no
X2: remover a regra derruba 7 testes; errar a fronteira do DDD derruba 1.

---

### Fase Y — Portal Gerencial e correções do app · ✅ entregue

Fatias nascidas de duas frentes: ligar o **Web Admin** (`service-new-web`) ao
que o back-end já oferecia, e corrigir o que o app reportou.

> **O padrão que apareceu três vezes.** Em BE-Y1, BE-Y6 e BE-Y11 o defeito foi o
> mesmo: **o campo era gravável e não era legível.** O `PATCH` aceitava, o `GET`
> não devolvia. A consequência é sempre a pior possível para uma tela de edição
> — o formulário abre em branco e **salvar apaga** o que estava gravado, sem
> erro aparente. Vale procurar isso de propósito em qualquer DTO de update:
> para cada campo que o `PATCH` aceita, confirmar que o `GET` do detalhe o
> devolve.

**Patch BE-Y1 — biografia no detalhe do usuário**

`UpdateUserDto` aceitava `biography`, `ResponseAdminUserDto` não devolvia. A
coluna entra no select do `findById`, **não** no `userSelect` compartilhado: é
`LongText`, e o `userSelect` também serve a listagem paginada, que buscaria o
texto inteiro de cada linha para não exibir nenhum.

**Patch BE-Y6 — assinaturas do fornecedor**

`PATCH /admin-providers/{id}/subscriptions/{subscriptionId}/bonus` exigia um
`subscriptionId` que **nenhuma rota devolvia** — varredura em todos os schemas:
o campo só aparecia nas respostas do próprio grant e do próprio bonus. O bônus
era alcançável só no instante seguinte a uma concessão, que é justamente quando
não se precisa dele.

Nova `GET /admin-providers/{id}/subscriptions`. O campo `activeGrantId` é
calculado no back-end com o **mesmo predicado do 409** da concessão
(`categoryId` nulo · `Active` · dentro da validade): posto na tela, a regra
passaria a existir em dois lugares e divergiria na primeira mudança.

Detalhe do desenho pós-Fase P que a tela precisa saber: **concessão tem
`categoryId` nulo** (cobertura ampla) e **assinatura paga é por categoria**, então
um fornecedor pode ter várias ao mesmo tempo.

**Patch BE-Y8 — taxa da plataforma por contexto de categoria**

> **Três das quatro rotas de categoria estavam quebradas, e por isso ninguém
> usava os contextos `products`, `accommodations` e `transportations`.**

`platformFeeRate` existe **só em `ServiceCategory`**. Mas o service mandava o
campo para todos os contextos: `findAll` com `select: { platformFeeRate: true }`
e `create` com `data: { platformFeeRate: … ?? 10 }`. O client do Prisma recusa a
consulta antes do banco e o filtro traduz em `400 PRISMA_VALIDATION` — erro que
culpa a requisição quando o problema é a consulta.

**Por que o tsc não pegou:** `getDelegate` devolve `Record<CategoryContext, any>`.
O `any` apagou a checagem de tipo exatamente no ponto onde os quatro modelos
divergem. Provado compilando contra o client gerado: `platformFeeRate does not
exist in type 'ProductCategorySelect'` (e idem nos outros dois).

A taxa enviada a um contexto que não a tem passa a ser **recusada com mensagem
clara**, em vez de ignorada em silêncio — ignorar faria o admin achar que gravou
uma taxa que nunca existiu. O `ResponseCategoryDto` também passou a declarar o
campo como opcional, porque agora ele legitimamente não vem nos três contextos.

**Patch BE-Y11 — comissão do delivery no detalhe do usuário**

Mesmo caso do BE-Y1, no mesmo arquivo. `deliveryCommissionRate` é `Decimal?` e
tem **três estados que não são a mesma coisa**:

| Valor | Significa | Na resposta |
|---|---|---|
| `null` | sem valor próprio → padrão da plataforma | ausente |
| `0` | comissão zerada, isenção | `0` |
| `15.5` | comissão própria | `15.5` |

Confundir `null` com `0` faria a tela mostrar o padrão para quem tem isenção, e
salvar devolveria a cobrança sem ninguém pedir. O `UpdateUserDto` passou a
declarar `nullable: true`: o `@IsOptional()` já aceitava `null`, mas o swagger
não dizia, então o front não tinha como saber que existe caminho de volta ao
padrão.

**Patch BE-Y13 — a URL que a própria API emite (BE-SRV-URL-1)**

`@IsUrl` com opções padrão exige TLD, e a `fileUrl` montada a partir de
`URL_INTEGRATION` em local é `http://localhost:8000/…`, host sem ponto. A API
recusava com `400` a URL que ela mesma devolvera no upload.

`@IsUrl({ require_tld: false })` em `CreateServiceDto.imageUrl`,
`CreateWorkFileDto.fileUrl` e `CreateBudgetFileDto.fileUrl` — os três únicos
DTOs de arquivo que usavam o validador padrão; os outros 14 usam `@IsString`.
**Não** trocamos por `@IsString`: aceitaria `javascript:alert(1)` num campo que
vai para `<img src>`. Documentado na 8.15 do `ORIENTACOESFRONT.md`.

**Patch BE-Y15 — descarte da imagem antiga da categoria**

Trocar a imagem de uma categoria sobrescreve `iconKey`, e com ela se perde a
única referência ao arquivo anterior — que ficava no bucket para sempre.

A rota genérica não servia: `DELETE /v1/one-file/:id` pede **id numérico** e
nada mapeia chave → id; e ela confere o **remetente**, então um admin não
conseguiria limpar o ícone que outro subiu. A limpeza foi para onde a posse
realmente está: o `update` da própria categoria, via
`UploadService.removeStoredFile(fileKey)` — primitiva pública que **não confere
posse de propósito**, porque quem a chama já verificou papel de admin mais
permissão `Settings`. Está documentado no método; não deve virar rota sem essa
verificação.

Duas decisões de robustez: a limpeza roda **depois** da gravação e **não derruba
a edição** se o storage falhar (a categoria já está correta; recusar a resposta
por um arquivo órfão trocaria um problema pequeno por um grande); e a comparação
é contra o **payload**, não contra o que o `update` devolve — se algum dia essa
chamada ganhar um `select` sem `iconKey`, a chave atual viria indefinida e o
código apagaria arquivo em uso.

**Patch BE-Y18 — capa, galeria e vídeo no serviço (BE-SRV-MEDIA-1)**

O pedido do app dizia "capa + galeria (várias imagens) e vídeo" e, no mesmo
parágrafo, "espelhando o padrão de produto/hospedagem/transporte" — mas esse
padrão é **uma** imagem e **um** vídeo. Perguntado, o cliente confirmou a
primeira leitura.

| Mídia | Onde | Quantas |
|---|---|---|
| Capa | `Service.imageUrl`/`imageKey` (já existia) | 1 |
| Vídeo | `Service.videoUrl`/`videoKey` | 1 — espelha os anúncios |
| Galeria | tabela `service_files` | até 10 |

`ServiceFile` espelha `WorkFile` com **duas diferenças deliberadas**: sem
`fileName`, porque imagem de vitrine é renderizada e não baixada por nome; e com
`sortOrder`, porque a ordem é escolha do fornecedor. Vídeo não entra na tabela —
é um só, e vive em coluna. A galeria sai só no detalhe; no `serviceListSelect`
não entra, porque a listagem mostra a capa.

**A reconciliação é a parte delicada.** O `PATCH` recebe a lista final e o
back-end acerta a diferença, com os três estados de sempre: omitir não mexe,
`[]` esvazia, lista passa a ser exatamente aquela. Quem continua **mantém o
`id`** — apagar tudo e reinserir mudaria o id a cada edição, e um link para a
imagem deixaria de funcionar só porque o fornecedor reordenou a galeria. Quem
sai tem a linha apagada e o arquivo removido do storage, reusando o
`removeStoredFile` da BE-Y15. A escrita no banco vai numa transação só; a
limpeza do storage roda por último e **não derruba a edição**.

No `delete` do serviço a galeria sai primeiro: a FK de `service_files` é
`RESTRICT`, então sem isso o delete falharia, e é ali que ainda se tem as
chaves dos arquivos.

**O compilador cobrou metade do trabalho, e isso quase virou bug.** O `tsc`
apontou que `findById` e `findPublicById` montam a resposta à mão e faltava
`images` — mas **não** cobrou `videoUrl`/`videoKey`, que são opcionais. Se eu
tivesse só acrescentado ao `select`, os dois campos nunca apareceriam na
resposta e nada acusaria. Vale como regra: **campo opcional novo em DTO de
resposta montada à mão não é verificado pelo compilador** — tem de ser mapeado
e testado à mão.

O teto de **10 imagens** (`MAXIMO_DE_IMAGENS`) é limite técnico contra payload
sem fim, não regra de negócio. Está anotado como tal no código.

**As fatias de admin que consumiram cada uma** vivem em `service-new-web`
(branch `Davi-Correia-integration`), fora deste repositório: ADM-Y2 (edição de
usuário), ADM-Y3 (repasses), ADM-Y4 (taxas de entrega), ADM-Y5 (cupons),
ADM-Y7 (assinatura do fornecedor), ADM-Y9 (categorias nos 4 contextos),
ADM-Y10 (histórico de repasses), ADM-Y12 (foto e comissão no usuário),
ADM-Y14 (imagem da categoria por upload), ADM-Y16 (ferramentas de arquivo por
id).

**Validação.** Suíte completa: **52 suítes, 507 testes**. Teste de mutação em
cada fatia; três resultados que vale registrar porque **não** foram mortes por
teste:

- BE-Y8, "comissão sai do select do detalhe" → pega pelo **compilador**
  (`TS2339`), não pelos testes
- BE-Y11, trocar `=== null` por teste de verdade → **mutante equivalente**:
  `Prisma.Decimal` é objeto, logo `Decimal(0)` é *truthy*, e as duas formas se
  comportam igual para tudo que o Prisma devolve. Nenhum teste poderia
  distingui-las
- BE-Y15, guarda de chave vazia em `removeStoredFile` → **sobreviveu** na
  primeira rodada, porque é inalcançável pelo caminho das categorias. Coberta
  depois com spec própria

Na BE-Y18 as seis mutações morreram, e duas valem nota: `sortOrder ?? indice`
trocado por `|| indice` mata um teste — **ordem zero é válida** (a primeira), e
tratá-la como ausente jogaria a imagem para o índice do array; e inverter o
conjunto de removidas mata seis, que é o tamanho da superfície da
reconciliação.

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
| `backend-demandas.md` · BE-NUM-1 e BE-ROUTE-1 | Campos numéricos e rotas quebraram após os ajustes — `400` em todo cadastro | **Não era back-end.** Reproduzido contra a API rodando: `POST /services`, `/budgets`, `/jobs` e `/restaurants` devolvem `201` com `number` numérico. `@IsNumberString` tem zero ocorrências; os 122 `ParseIntPipe` estão todos em `@Param`. A causa era um processo antigo na porta 8000 (`node dist/src/main`, de um `start:prod` esquecido) fazendo o `start:dev` morrer com `EADDRINUSE` em silêncio e servir código velho com Prisma Client desatualizado. **Caí na mesma armadilha no meu container** |
| Análise minha, sobre o upload | As rotas de upload não tinham `limits` nem `fileFilter` | **Falso.** O `ParseFilePipeBuilder` já validava tipo e tamanho. Eu havia olhado só o decorador do interceptor. O problema real era outro: o pipe roda **depois** de o multer bufferizar o arquivo |
| `backend-demandas.md` · BE-SRV-URL-1 | O validador de `imageUrl` "rejeita `localhost`/IP" | **Metade certo.** O **IP sempre passou**; quem o `@IsUrl` padrão recusa é host **sem ponto**, ou seja só o `localhost`. Testado com as duas configurações lado a lado. Explica por que o bug não aparecia para quem acessava a API pelo IP da rede local |
| Minha expectativa ao testar o BE-Y13 | `foto.png` deveria passar a ser recusado | **Já era aceito antes.** `.png` parece TLD e `require_protocol` é falso por padrão, então o validador sempre tratou `foto.png` como host válido. A mudança afrouxou **uma** coisa só: host sem ponto. Tirei a asserção em vez de deixá-la mentir sobre o efeito do patch |
| Minha suposição ao escrever o BE-Y11 | Um teste com `Decimal('0')` protege contra trocar `=== null` por teste de verdade | **Não protege.** `Prisma.Decimal` é objeto, logo sempre *truthy* — inclusive o zero. As duas formas são equivalentes para qualquer valor que o Prisma devolva. Mantive `=== null` por declarar a intenção, mas o teste do zero cobre o mapeamento, não a troca |
| Minha leitura de `DELETE /v1/profile-photo` | Serve para o admin remover a foto de outro usuário | **Não serve.** Tem `assertOwnership`: só apaga a foto do próprio autenticado. Tirar a foto de outro usuário é mandar `fileUrl`/`fileKey` nulos no `PATCH /admin-users/{id}` |
| Admin, tela *Arquivos e perfil* | `fileId` das ferramentas de arquivo é a `fileKey` | **É o id numérico.** `DELETE`/`GET /v1/one-file/:id` usam `ParseIntPipe`; o DTO de resposta do upload diz literalmente "Identificador do arquivo, usado em /one-file/{id} e no download". A tela preenchia o campo com a chave e **Consultar, Baixar e Remover** respondiam `400`. Corrigido na ADM-Y16, com os tipos passando a `number` para o erro não voltar |
| Seção 9 deste arquivo | "195 rotas no `docs/swagger.json`" | **Era contagem de caminhos distintos, não de operações.** Hoje: **196 caminhos** e **245 operações** (método + caminho). A ambiguidade fez o número parecer defasado quando não estava |
| Diagnóstico meu, sobre patches | `git apply` falhando significa que o patch já foi aplicado | **Não significa.** A mesma mensagem cobre dois casos opostos: conteúdo já presente, e base divergente. O teste que distingue é `git apply --check -R`, ou procurar uma âncora do conteúdo no arquivo. Errei nisso com a W3 e de novo com a S6 |

---

## 5. Pendências

### 5.1 Decisões de produto — bloqueiam as fases B e C

| # | Pergunta | Trava |
|---|---|---|
| 1 | ~~Conta verificada é obrigatória?~~ **Decidido em 25/08:** sim, **só por SMS**. Telefone obrigatório, e-mail **permanentemente opcional**. Contas atuais preservadas. Campo de login continua `email`, aceitando os dois. Entregue no `B5`, `B6` e `B7` | ✅ |
| 2 | ~~Telefone é obrigatório?~~ **Decidido em 25/08: sim.** Entregue no `B3` | ✅ |
| 3 | ~~Débito e Dinheiro são válidos?~~ **Decidido em 26/08: sim**, com confirmação manual do recebimento em dinheiro. Entregue no `C1` e `C2` | ✅ |
| 4 | ~~Quem calcula o frete?~~ **Decidido em 26/08:** o servidor, por faixa de distância parametrizada no admin. Entregue no `C3` | ✅ |
| 5 | ~~Avaliação, tempo e logo?~~ **Decidido em 26/08:** estrelas com comentário e trava de uma por cliente. Entregue no `C4`. **Tempo de entrega ficou de fora** — não foi pedido | 🟡 |
| 6 | ~~Assinatura bloqueia o quê?~~ **Decidido em 26/08:** nada muda por enquanto, para não atrapalhar os testes. Virou débito técnico — ver 5.4 | ⏸ |
| 7 | ~~Quanto o entregador ganha por entrega?~~ **Decidido em 25/08:** manter a regra que já existe — 100% do `deliveryFee`. Exposto no `B4` | ✅ |

> **Todas as quatro foram decididas em 26/08.** A urgência da 3 se resolveu: o
> enum agora nomeia débito e dinheiro, e o mapeamento do Mercado Pago parou de
> dobrar débito em crédito. Os pedidos anteriores continuam classificados
> errado — ver a nota de conciliação na Fase C.

### 5.2 Fase B — desbloqueio do front (parcialmente entregue)

Entregue: `birthDate` (BE-13), inbox de chats (BE-Q5), `phone` obrigatório
(BE-Q2) e ganhos do entregador (BE-17).

Entregue também: e-mail opcional (`B5`), verificação por SMS (`B6`) e login por
telefone (`B7`). **A fase está fechada.**

Fica de fora, por não ter sido pedido: migrar as contas antigas sem telefone.
Elas continuam entrando por e-mail, mas não têm recuperação por SMS. Se o
cliente quiser trazer essa base para o novo modelo, é fluxo novo — tela de
"cadastre seu telefone" e rota para isso.

> **A decisão 1 foi tomada em 25/08.** Verificação bloqueante, por SMS, com
> colunas próprias (`verificationCode` / `verificationExpiresIn`) — reaproveitar
> o campo `code`, que é da recuperação de senha, faria um fluxo invalidar o
> outro. A dependência de SMTP que eu havia levantado deixou de existir: o
> canal é SMS, e ele está validado.
>
> **As 6 contas sem telefone da base local (os dois admins entre elas) ficam
> como estão.** Exigir verificação delas trancaria admin para fora sem caminho
> de volta.

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

### 5.3 Fase C — delivery e cobrança (entregue, com resíduos)

Entregue nos patches `C1` a `C5`. Ficou de fora, por não ter sido pedido:

- **Tempo de entrega no restaurante** (parte da decisão 5). `acceptedAt` e
  `deliveredAt` já são gravados em cada pedido, então o histórico está se
  acumulando — dá para começar com estimativa cadastrada e migrar para média
  real depois, sem perder nada
- **Faixas de frete reais.** A migration do `C3` semeia uma faixa única de
  R$ 8,00 para qualquer distância, que só reproduz o comportamento antigo
- **Coordenadas nos endereços já cadastrados.** Nenhum tem; todos caem na faixa
  inicial até o front passar a geocodificar

### 5.4 Fase E — débito técnico (entregue, com dois resíduos)

Entregue no `E1`, `E2` e `E3`. Sobraram duas coisas:

**1. Renomear `dockerfile` para `Dockerfile`** — precisa ser feito à mão, porque
o macOS não distingue caixa e um patch corromperia o arquivo. Dois passos, para
o Git registrar a mudança:

```bash
git mv dockerfile dockerfile.tmp
git mv dockerfile.tmp Dockerfile
```

Sem isso, `docker compose build` falha em qualquer máquina Linux — inclusive CI
e servidor — porque o `docker-compose.yml` procura por `Dockerfile`.

**2. `strictNullChecks`** — 146 erros de tipo hoje. Merece fatia própria, de
preferência módulo a módulo, começando pelos que já têm teste.

**3. Assinatura vencida não tira nada do ar** — decisão 6, adiada de propósito
em 26/08 para não atrapalhar os testes. **Precisa ser resolvido antes de
produção.** Hoje o `SubscriptionGuardService` só age na criação: quem assinou um
mês, publicou e parou de pagar mantém os anúncios no ar, editáveis e recebendo
demanda, indefinidamente. O caminho recomendado é sumir da listagem pública
quando vence (reversível, o anúncio volta com o pagamento) somado ao bloqueio de
edição.

**4. Pedidos não-dinheiro nunca são marcados como pagos** — descoberto ao
implementar o `C2`. Pedidos de comida não criam linha em `payments`, e o
`paymentStatus` novo só é movido pela confirmação manual, que vale só para
`Cash`. Cartão, Pix e boleto ficam `Pending` para sempre. Fechar isso exige
ligar o Mercado Pago ao fluxo de delivery, o que é fatia própria.

Observações do Dockerfile que **não** mexi, por serem escolha de quem cuida do
ambiente: o `EXPOSE 3000` não bate com a `PORT=8000` em uso (é documental, o
`compose` publica `${PORT}:${PORT}`, então não quebra nada), e o `apt-get
install nano` engorda a imagem — mas o serviço sobe com `tail -f /dev/null`, o
que sugere um contêiner de desenvolvimento onde editar dentro é intencional.

### 5.5 Adiados com justificativa

| Item | Por que ficou de fora |
|---|---|
| Refresh token e revogação no `logout` | Muda contrato de sessão. Encurtar o access token sem o front implementar refresh derruba o usuário a cada poucos minutos. Precisa de fatia coordenada |
| Limite de tentativas no reset | Exige coluna nova, ou seja migration. Com 1.000.000 de combinações e throttler de 100/min, o risco caiu de ~50 minutos para ~7 dias |
| Log estruturado (JSON/pino) | O middleware do `D4` já entrega correlação. Trocar o logger inteiro é mudança arquitetural que merece decisão própria |
| Owner-scope nas **leituras** de arquivo | O `A3` escopou só a exclusão. Restringir leitura pode quebrar fluxos legítimos (anexo de orçamento visível para a contraparte) |

---

### 5.6 Fases P, Q, AWS e X — pendências abertas

Nenhuma é de código. Todas são operação ou decisão.

| Item | Situação | Quem resolve |
|---|---|---|
| **WABA do WhatsApp** | O OTP por WhatsApp **não vai a produção** sem WhatsApp Business Account. Conferido pela API: o único sender é `whatsapp:+14155238886` (sandbox), `status: OFFLINE`, `waba_id` vazio. Sem WABA não há a quem submeter template — é por isso que os três templates da conta estão `unsubmitted`. Exige Business Verification da Meta (CNPJ, comprovante, site), número dedicado fora do WhatsApp comum e aprovação de display name; leva dias a semanas | Cliente |
| **Sandbox serve só para demonstração** | Cada participante precisa mandar `join <duas-palavras>`, a sessão **expira a cada 3 dias**, o remetente é um número americano sem identidade de marca e o texto do OTP é em inglês. E quando a sessão expira a primeira tentativa não entrega nada, em silêncio. Recomendação registrada: manter o WhatsApp **desligado** no piloto e demonstrar à parte | Decisão de produto |
| **Rotação de credenciais** | A `AWS_SECRET_ACCESS_KEY` foi exposta em texto durante o trabalho, e o `TWILIO_AUTH_TOKEN` esteve num `.env.bak` que chegou a ser commitado — o push foi barrado pela proteção do GitHub e o commit foi reescrito, então **nada vazou para o remoto**. Rotacionar as duas mesmo assim | Brendha |
| **SEC-1** | Restringir a chave do Google Maps no GCP por referrer e por API | Brendha |
| **`URL_INTEGRATION` por ambiente** | É de onde sai a `fileUrl`, lida **no momento do upload** e gravada na linha. Valor errado faz toda a mídia apontar para host inexistente, sem erro na API. Em homologação e produção quem define é o DevOps. Documentado na 8.14 do `ORIENTACOESFRONT.md` | DevOps |
| **Política do IAM** | Vale estreitar para `s3:PutObject`, `s3:GetObject` e `s3:DeleteObject` em `arn:aws:s3:::bkt-service/*` | Brendha |

**Decisões de produto ainda abertas**, levantadas na auditoria de pagamento e
não resolvidas:

- Uma assinatura de R$ 9,90 em Pintor libera Produtos, Hospedagem, Transporte,
  Vagas e Restaurante — as **verticais** não são cobradas separadamente
- Entregador pagando assinatura foi pedido pelo cliente e **não** está
  implementado; hoje ele recebe 100% da taxa de entrega
- Comissão de influenciador é **uma vez só**, na primeira assinatura paga;
  recorrente seria mudança de regra
- Qualquer perfil pode indicar — o código de convite não filtra por
  `profileType`
- Estorno e chargeback caem no vazio; não há padrão global para a comissão de
  delivery (20% fixo em código)

---

### 5.7 Fase Y — pendências abertas

Nenhuma é defeito. Todas são decisão de produto ou resíduo conhecido.

| Item | Situação | Quem resolve |
|---|---|---|
| ~~**BE-SRV-MEDIA-1**~~ | **Resolvido na BE-Y18** — capa, galeria de até 10 imagens e um vídeo. Contrato na 8.16 do `ORIENTACOESFRONT.md`. O que sobrou é tela: o app já tem upload de imagem e de vídeo, falta montar a galeria | — |
| **Capa × primeira da galeria** | O back-end mantém `imageUrl` (capa) e `images` (galeria) **separados**. Se o produto quiser "a primeira da galeria é a capa", é decisão de tela — não de contrato | Decisão de produto |
| **Teto de 10 imagens** | `MAXIMO_DE_IMAGENS` é limite técnico, escolhido por mim contra payload sem fim. Se o produto quiser outro número, é só essa constante | Decisão de produto |
| **Categorias de cardápio de restaurante** | Não entram no `{context}` de `/admin-categories` — têm rotas próprias (`POST /v1/restaurants/menu-categories`). Ninguém decidiu se o admin deve administrá-las, nem por onde | Decisão de produto |
| **Padrão da comissão não é exposto** | `DEFAULT_COMMISSION_RATE = 20` vive em `food-orders/commission.ts` e nenhuma rota o publica. Por isso a tela de usuário do admin **não escreve "20%"** no texto de ajuda: o número na interface poderia divergir em silêncio. Expor em `/v1/admin-settings/platform` resolveria | Decisão de produto |
| **`billingType` fora do detalhe do usuário** | `ResponseAdminUserDto` não devolve `billingType`, então o admin não tem como dizer a quem a comissão se aplica — e `resolveCommissionRate` só cobra quando o tipo é `Commission`. O admin hoje mostra o aviso genérico do DTO | Fatia pequena de back-end |
| **`?? 10` na criação de categoria** | `create` aplica 10% por padrão em `services`, mas o schema tem `@default(0)`. Criar pela API dá 10%, pelo banco dá 0%. Não mexi: alterar isso é regra de negócio | Decisão de produto |
| **Bônus de assinatura sem teto** | `GrantSubscriptionDto` limita `months` a 120; `AddSubscriptionBonusDto` **não tem `@Max`**. A tela espelha o back-end exatamente. Se o bônus também deve ter teto, é fatia de back-end | Decisão de produto |
| **Nome do arquivo baixado** | No admin, *Arquivos e perfil* baixa como `arquivo-42`, **sem extensão**. Cosmético, fora do defeito corrigido na ADM-Y16 | Brendha |
| **`environment.prod.ts` do admin** | Diz `production: true` e aponta para **homolog**. Precisa mudar antes de produção de verdade | Brendha |

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

> O detalhamento completo, com travas de UI e contratos, está em
> **`docs/ORIENTACOES-FRONT.md`**. O resumo abaixo fica para consulta rápida.


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
npm install                   # o postinstall já roda o prisma generate
cp .env.example .env          # ajustar JWT_SECRET, DATABASE_URL, FRONTEND_URL
npx prisma migrate deploy
npm run seed
npm run seed:test             # cenário de teste completo, idempotente
npm run start:dev             # Swagger em http://localhost:8000/docs
npm run swagger:generate      # regrava docs/swagger.json para o front
```

Credenciais dos seeds, todas com senha `12345678`: `admin.master@`,
`admin.one@`, `client.one@`, `supplier.one@`, `delivery.one@`,
`influencer.one@` — todos `@email.com`.

**Números de referência da branch** (medidos em `695d733`, fim da Fase Y):
**196 caminhos** e **245 operações** no `docs/swagger.json`, todos com o prefixo
`/v1` · **52 modelos** no schema · **40 migrations** · **52 suítes, 507
testes**.

> A BE-Y18 somou **um modelo** (`ServiceFile`) e **uma migration**, mas
> **nenhuma rota**: galeria e vídeo entraram nos DTOs das rotas de serviço que
> já existiam. É o caso em que contar rotas não enxerga a mudança.

> **"195 rotas" era contagem de caminhos**, não de operações — uma mesma rota
> com `GET` e `PATCH` contava uma vez. Daqui em diante os dois números ficam
> explícitos, porque a ambiguidade já fez o valor parecer defasado quando não
> estava. A Fase Y somou **um** caminho novo
> (`GET /v1/admin-providers/{id}/subscriptions`).

> Os números anteriores desta seção (217 rotas, 47 modelos, 19 migrations,
> 33 testes) estavam defasados, e o bloco acima mandava rodar
> `npm run swagger:export` gravando `docs/openapi.json` — dois nomes que não
> existem. O script é `swagger:generate` e o arquivo é `docs/swagger.json`.

---

## 10. Registro de fases

| Fase | Escopo | Status | Patches | Testes |
|---|---|---|---|---|
| **A** | Segurança herdada | ✅ Entregue | 6 | — |
| **D** | Robustez | ✅ Entregue | 6 | 13 |
| **B** | Desbloqueio do front | ✅ Entregue | 7 | 2 |
| **S** | Integração de SMS | ✅ Entregue e validada de ponta a ponta | 2 | 13 |
| **E** | Débito técnico | ✅ Entregue · resíduos na 5.4 | 3 | — |
| **C** | Delivery e cobrança | ✅ Entregue · resíduos na 5.3 e 5.4 | 8 | 5 |
| **T** | Ambiente de teste | 🟡 Em andamento | 3 | — |
| **MP** | Split do Mercado Pago | ✅ Entregue · falta validar com credenciais reais | 3 | 8 |
| **W** | WhatsApp no Twilio | ✅ Entregue | 1 | 11 |
| **P** | Assinatura por categoria | ✅ Entregue | 4 | — |
| **Q** | Contrato e código de erro | ✅ Entregue | 2 | 9 |
| **AWS** | Armazenamento no S3 | ✅ Entregue e validada contra o bucket real | 6 | — |
| **X** | Correções de campo | ✅ Entregue | 5 | 12 |
| **Y** | Portal Gerencial e correções do app | ✅ Entregue · pendências na 5.7 | 7 | 108 |

**Total: 63 patches**, todos verificados aplicando em sequência sobre a base da
fase correspondente, em worktree descartável, com build, `jest` e `eslint` no
fim da cadeia e conferência byte a byte contra a árvore validada.

**Suíte hoje: 52 suítes, 507 testes.**

> **Sobre a coluna "Testes" da Fase Y:** 108 é o total medido nos seis arquivos
> de spec que a fase criou (`admin-users.service.spec.ts` 9,
> `provider-subscriptions.spec.ts` 9, `categories-platform-fee.spec.ts` 34,
> `url-de-arquivo.spec.ts` 30, `remove-stored-file.spec.ts` 3,
> `service-gallery.spec.ts` 23) — dois deles receberam testes de mais de um
> patch da mesma fase. Não tentei derivar o
> número da diferença entre os totais da suíte: a base de 396 foi medida em
> `e1d5940`, que não é o commit onde a fase começou, e a subtração daria um
> valor que eu não consigo reconciliar com os arquivos.
>
> A Fase Y teve **10 fatias de front** correspondentes em `service-new-web`
> (ADM-Y2 a ADM-Y16), que não entram nesta contagem — este registro é do
> back-end.
