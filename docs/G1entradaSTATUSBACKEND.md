<!-- Cole em docs/STATUSBACKEND.md, na seção 3, depois da Fase F. E resolva a
     decisão 6 na seção 5.1: ela deixa de ser pendência. -->

### Fase G — Assinatura vencida deixa de vender · ✅ entregue

**Decisão 6, finalmente resolvida.** Escolha da Brendha: o fornecedor vencido
**continua visível, mas não recebe negócio novo**; o que já estava em andamento
**segue até o fim**.

**O que o levantamento achou.** Era pior do que "não despublica".

1. `SubscriptionStatusEnum.Expired` existe no enum e **nenhuma linha do sistema
   o grava**. Não há `@nestjs/schedule`, não há cron, não há job. Uma assinatura
   nasce `Active` e morre `Active`. É o mesmo padrão do `FoodOrder` no enum de
   pagamento, achado na Fase F: declarado, nunca usado
2. O que segurava era o `currentPeriodEnd` conferido pelo próprio
   `SubscriptionGuardService` — o portão funciona sem ninguém marcar `Expired`
3. **Mas o portão só existia no `create()`.** Conferido nas seis verticais:
   serviços, vagas, produtos, hospedagens, transportes e restaurantes. Nunca no
   update, nunca na listagem, nunca na criação do pedido ou da reserva

Resultado prático: o fornecedor que parava de pagar **continuava vendendo para
sempre** tudo que tinha publicado enquanto estava em dia. A única coisa que
perdia era o direito de cadastrar item novo. A assinatura — regra de negócio
central da plataforma — não tinha efeito depois do primeiro dia.

**Patch G1 — 22 arquivos**

*`assertProviderCanSell(providerId, options?)`* no `SubscriptionGuardService`.
Chamado pelo lado do **consumidor**, na porta de entrada de cada negócio. O
`assertActiveSubscription` existente não foi tocado: continua valendo para o
fornecedor no `create` das seis verticais.

*Seis pontos de entrada instrumentados* — todos onde um cliente inicia negócio
com um fornecedor específico:

| Entrada | Fornecedor |
|---|---|
| `POST /v1/rentals` | dono do produto |
| `POST /v1/transport-requests` | dono do transporte |
| `POST /v1/bookings` | dono da hospedagem |
| `POST /v1/commercial-transactions` | dono do produto |
| `POST /v1/budgets` | dono do serviço |
| `POST /v1/food-orders` | dono do restaurante (com bypass de comissão) |

*`POST /v1/works` ficou de fora de propósito.* Trabalho nasce de um orçamento já
respondido — é continuação de negócio existente, e a decisão foi que o que está
em andamento segue até o fim. Barrar ali puniria o cliente no meio do processo.

*`409`, não `403`.* Quem recebe o erro é o cliente, que não tem pendência
nenhuma; `403` diria que ele não tem permissão, o que é falso. A
`ProviderNotSellingException` é `ConflictException`, com mensagem que o app pode
mostrar direto. Documentada nas seis rotas via `@ApiConflictResponse`.

*Bypass de comissão preservado.* No delivery o gate é híbrido: quem fatura por
`billingType: Commission` não precisa de assinatura. Mesma regra que o cadastro
do restaurante já aplicava — o que muda é o **momento**: agora vale a cada
pedido, não só no dia do cadastro.

*Sem job agendado, de propósito.* A vigência é conferida na leitura
(`status Active` **e** `currentPeriodEnd >= agora`). Não há rotina para falhar,
nem estado para divergir do banco: no segundo seguinte ao vencimento, o portão
já fechou. Marcar `Expired` continua sendo útil só para relatório e aviso — e
segue não implementado.

**Validação.** `npx jest`: 9 suítes, **71 testes passando** (9 novos na matriz do
guard, incluindo a garantia de que o `assertActiveSubscription` antigo não
regrediu). `npm run build` limpo, `npx eslint src` limpo. Verificado em worktree
a partir de `98b4e05` com o F1 aplicado antes, byte a byte nos 22 arquivos.

**Depois de aplicar:** `npm run swagger:generate` — o `409` precisa entrar no
contrato do front.

**Resíduo.** As listagens públicas não filtram por assinatura, por decisão: o
fornecedor vencido continua aparecendo. Se um dia a escolha mudar para "some da
vitrine", o ponto de mudança são as consultas de `findAll` das seis verticais, e
aí vale medir o custo do filtro antes — pode compensar um campo desnormalizado
no `User` em vez de join em toda busca.
