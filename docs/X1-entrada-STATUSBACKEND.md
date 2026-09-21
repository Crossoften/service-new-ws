### Fase X — Código de verificação por WhatsApp · ✅ entregue

**Patch:** `X1-otp-whatsapp.patch` · 10 arquivos · +420 / −17
**Base:** `e19ac4b` + `V1` + `W1`
**Decisão de produto (21/09):** WhatsApp primeiro, SMS no fallback, nos dois
fluxos — cadastro e recuperação de senha. Sem escolha de canal para o usuário.

#### O que mudou

| Arquivo | Mudança |
|---|---|
| `whatsapp/whatsapp.service.ts` | `hasOtpCredentials()` e `sendVerificationCode()` — template separado, erro **propagado** |
| `verification-code/verification-code.service.ts` | novo · orquestra WhatsApp → SMS |
| `verification-code/verification-code.module.ts` | novo |
| `no-auth/no-auth.service.ts` | três pontos de emissão trocam `SmsService` por `VerificationCodeService` |
| `no-auth/no-auth.module.ts` | importa o módulo novo; deixa de prover `SmsService` |
| `env.example` / `.env.example` | `TWILIO_WHATSAPP_OTP_CONTENT_SID` |
| `docs/ORIENTACOESFRONT.md` | seção nova: o que o front precisa mudar (só texto de tela) |
| specs | `verification-code.service.spec.ts` (8 casos) + 5 casos novos no `whatsapp.service.spec.ts` |

#### Dois templates, não um

A Meta proíbe enviar OTP por Content Template de categoria **Utility** — que é
a usada nas notificações de pedido. O castigo não é o envio falhar na hora: é o
template ser pausado depois e a nota de qualidade do número cair, degradando
**todos** os envios. Por isso `TWILIO_WHATSAPP_CONTENT_SID` (Utility,
notificações) e `TWILIO_WHATSAPP_OTP_CONTENT_SID` (Authentication, código)
convivem, e a ausência de um não desabilita o outro.

#### Por que o `sendVerificationCode` propaga o erro

O `sendMessage` engole falha de propósito — notificação de pedido é acessório e
não pode derrubar a operação que a disparou. Para OTP isso seria o pior
comportamento possível: o usuário esperaria um código que nunca chega, sem erro
e sem caminho de volta. O método novo propaga, e o `VerificationCodeService`
usa a exceção para cair no SMS **na mesma requisição**, com o mesmo código.

#### A limitação que moldou o desenho

**Não existe como verificar se um número tem WhatsApp antes de enviar.** A API
do Twilio aceita a mensagem para qualquer destino e só reporta a falha depois,
de forma assíncrona. O try/catch cobre apenas falhas síncronas (credencial
recusada, template inválido, destino malformado, Twilio fora) — não cobre
"esse número não usa WhatsApp".

A regra adotada, que resolve isso sem migration, sem webhook e sem guardar
código em claro:

> **Primeiro envio: WhatsApp. Qualquer reenvio: SMS.**

- `register` → WhatsApp (fallback síncrono para SMS)
- `resend-verification` → SMS sempre
- `forgot` 1ª vez → WhatsApp (fallback síncrono)
- `forgot` repetido dentro da validade do código anterior → SMS

Quem não tem WhatsApp resolve em um toque a mais, no botão de reenvio que já
existe. **Esta é uma suposição minha sobre a regra de negócio, não uma decisão
tomada** — está isolada em dois pontos do `no-auth.service.ts` e é barata de
trocar.

#### Alternativas descartadas (registradas para não serem redescobertas)

| Alternativa | Por que não |
|---|---|
| Webhook de status do Twilio reenviando por SMS | Exige mapear message SID → usuário (migration) e o código está guardado só como hash, então o reenvio teria de gerar outro. Mais peças, mais latência |
| Poll do status da mensagem antes de responder | Bloqueia a requisição por segundos para cobrir um caso minoritário |
| Usuário escolhe o canal na tela | Descartado pela decisão de produto de 21/09 |

#### Compatibilidade

**Nenhum contrato de API mudou**: mesmas rotas, mesmos campos, mesmas respostas,
`ForgotChannelEnum` intocado (`email` \| `sms`). Sem
`TWILIO_WHATSAPP_OTP_CONTENT_SID` configurado, tudo sai por SMS exatamente como
antes — a fase é inerte até o template ser aprovado.

#### Validação

- `nest build` → 0
- `jest` → **22 suítes / 192 testes** (eram 21/179; +1 suíte, +13 testes)
- `eslint src/**/*.ts` → limpo
- Cadeia `V1 → W1 → X1` aplicada em worktree limpa sobre `e19ac4b`, com
  identidade byte a byte confirmada em 49 arquivos
- Scan de segredos no patch → limpo
- ⚠️ **Não validado contra banco nem HTTP** — o contêiner não tem MySQL. E o
  envio real por WhatsApp depende do template Authentication aprovado, que
  ainda não existe

#### Pendente do lado da Brendha

1. Criar a **segunda** Content Template, categoria **Authentication**, pt_BR,
   uma variável (`{{1}}` = só o código)
2. Submeter à aprovação da Meta
3. Preencher `TWILIO_WHATSAPP_OTP_CONTENT_SID` no `.env` e reiniciar o serviço
4. Front: trocar "enviamos um SMS" por "enviamos um código por WhatsApp ou SMS"
   e reforçar o botão de reenvio — detalhes na seção nova do `ORIENTACOESFRONT`
