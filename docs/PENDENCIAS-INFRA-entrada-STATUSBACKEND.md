### 5.6 Infraestrutura e credenciais — time de DevOps

Itens que dependem de acesso a painel, conta ou provedor externo. **Nenhum é
código** — o backend já está pronto para todos, e degrada de forma controlada
enquanto eles não chegam.

| # | Item | O que trava hoje | Como o back se comporta sem |
|---|---|---|---|
| 1 | **Escopo `money_transfer` no Mercado Pago** | Etapa 2 do repasse (Pix automático) | Repasse funciona, pago à mão pelo admin |
| 2 | **Rotacionar `TWILIO_AUTH_TOKEN`** | — | Funciona, mas o valor atual está exposto |
| 3 | **Content Template WhatsApp — Utility** | Notificações de pedido por WhatsApp | Só loga um warn; push e SMS seguem |
| 4 | **Content Template WhatsApp — Authentication** | Código de verificação por WhatsApp | Cai para SMS, como antes |
| 5 | **Credenciais do Mercado Pago do cliente** | Todo o fluxo de pagamento online | Pedido em dinheiro funciona; online não |
| 6 | **Chaves VAPID** | Push web | `PushService` fica inerte, sem quebrar nada |
| 7 | **Variáveis no homolog** | Tudo acima, em homolog | Só o `.env` local tem valores reais |
| 8 | **Rodar as migrations pendentes** | Cupons, push, comissão, repasse, chave Pix | Build quebra até rodar |

---

#### 1. Escopo `money_transfer` no Mercado Pago

**Quem resolve:** DevOps, junto ao assessor comercial do Mercado Pago.

As APIs do Mercado Pago servem para **receber**, não para transferir dinheiro
entre contas. A API de transferência existe, mas depende do escopo
`money_transfer`, que **não vem habilitado por padrão** — precisa de liberação
comercial para a aplicação.

**O que pedir:** habilitar o escopo `money_transfer` na aplicação marketplace do
cliente, e a documentação do endpoint que vem junto da liberação.

**Se for negada:** qualquer PSP com Pix out resolve. O desenho do repasse não
muda em nenhum dos dois casos — o `Z1` já tem saldo, lote, idempotência e
comprovante. Só troca quem executa o pagamento.

**Enquanto não chega:** o repasse funciona inteiro, com o admin fazendo o Pix e
registrando em `POST /v1/admin-delivery-payouts`. Nada fica bloqueado.

#### 8. Migrations pendentes, na ordem

```
20260920120000_coupons
20260920140000_push_subscriptions
20260921120000_user_delivery_commission_rate
20260921150000_delivery_payouts
20260921180000_bank_account_pix_key
```

Todas aditivas, nenhuma exige backfill. `npx prisma migrate deploy` aplica na
ordem correta.

#### Variáveis de ambiente que faltam

Todas documentadas no `env.example`, com o efeito de cada ausência marcado
como `[DEGRADA]`:

```
TWILIO_WHATSAPP_FROM
TWILIO_WHATSAPP_CONTENT_SID
TWILIO_WHATSAPP_OTP_CONTENT_SID
VAPID_SUBJECT
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

Lembrar de **reiniciar o serviço** depois de preencher: o `.env` só é lido no
boot.
