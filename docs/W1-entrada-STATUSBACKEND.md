<!-- Cole em docs/STATUSBACKEND.md, na seção 3, depois da Fase V. -->

### Fase W — Notificações push (BE-Q13) · ✅ entregue

Último item do documento de demandas do front.

#### A decisão que deu forma ao patch

O aviso ao usuário era enviado só por WhatsApp, em **dezenove pontos espalhados
por seis serviços**. Acrescentar push ali significaria repetir a mesma mensagem
dezenove vezes — e o próximo canal, de novo.

Então entrou um `NotificationsService`: os serviços de negócio passam a falar com
ele, e ele decide os canais. A assinatura é **idêntica** à que o
`WhatsappService` já expunha, de propósito: a migração dos dezenove pontos foi a
troca do identificador, verificada pelo compilador.

#### Patch W1 — 26 arquivos

*`PushSubscription`*, uma por navegador — celular e desktop são inscrições
distintas, cada uma com as próprias chaves de cifragem. `endpoint` é único
porque é a identidade dela: reinscrever o mesmo navegador **atualiza**, não
duplica. `ON DELETE CASCADE` no usuário, porque inscrição sem dono não serve
para nada e não deve impedir a remoção da conta. Migration
`20260920140000_push_subscriptions`.

*Três rotas:*

```
GET    /v1/push/public-key     (pública)
POST   /v1/push/subscriptions
DELETE /v1/push/subscriptions
```

A chave pública é pública por natureza — é ela que vai no
`applicationServerKey` do `pushManager.subscribe`. A privada nunca sai do
servidor.

*Inscrição morta é apagada sozinha.* Quando o provedor responde `404` ou `410`,
aquele navegador não existe mais: o usuário revogou a permissão, limpou os dados
ou desinstalou. Mantê-la faria o servidor tentar entregar para sempre, a cada
evento. Falha passageira (`503`) **não** apaga nada — há teste para os dois
casos, e distingui-los é a diferença entre limpar lixo e perder o inscrito de um
usuário por causa de uma instabilidade.

*Degrada igual ao SMS e ao WhatsApp.* Sem as três variáveis VAPID, o serviço só
registra um `warn` no boot, a rota de chave pública devolve `null` e nada é
enviado. A tela deve **omitir a oferta de notificações** nesse caso, não tratar
como erro. Nenhuma operação de negócio falha.

*Nunca propaga erro.* Cada canal trata os próprios erros, e o
`NotificationsService` ainda põe um `catch` por canal: WhatsApp fora do ar não
impede o push, push fora do ar não impede o WhatsApp, e os dois fora não
derrubam o pedido que disparou o aviso. São cinco testes só para isso.

*Dependência nova:* `web-push` (+ `@types/web-push`). **Rode `npm install`
depois de aplicar** — o `package-lock.json` ficou fora do patch de propósito,
porque ele conflita a cada divergência de árvore.

**Validação.** `npx jest`: 21 suítes, **179 testes passando** (17 novos). Build e
lint limpos. Cadeia `V1 → W1` verificada sobre `e19ac4b`, byte a byte, com
conferência explícita de que não sobrou nenhuma referência a `whatsappService`
nos serviços migrados.

**⚠️ Não validado contra banco nem HTTP**, pelo mesmo motivo da Fase V: este
container não tem MySQL nem docker. **A migration nunca foi executada e nenhuma
notificação real foi enviada.** Antes de confiar:

```bash
npm install
npx prisma migrate deploy && npx prisma generate
npm run build && npx jest
node -e "console.log(require('web-push').generateVAPIDKeys())"   # gere o par
```

Depois, com as chaves no `.env`: inscrever um navegador, disparar uma mudança de
status de pedido e conferir se a notificação chega.

**Depois de aplicar:** `npm run swagger:generate`.

#### O que falta, e é do front

O back está pronto; a outra metade é PWA e não tem como eu fazer:

1. **Service worker** com `self.addEventListener('push', ...)` lendo o JSON
   (`{ title, body, url, tag }`) e chamando `showNotification`
2. **Pedir permissão** ao usuário no momento certo — depois do primeiro pedido,
   não na abertura do app
3. **Inscrever** com `pushManager.subscribe({ userVisibleOnly: true,
   applicationServerKey })` e mandar o resultado para `POST /v1/push/subscriptions`
4. **Desinscrever** ao sair da conta, senão o próximo usuário daquele navegador
   recebe as notificações do anterior

**Resíduo.** Toda notificação vai com o título `Service`. O
`NotificationsService` aceita título próprio, mas os dezenove pontos de chamada
ainda não o passam — "Pedido #12" seria melhor que "Service" na tela de bloqueio.
É um ajuste por ponto de chamada, e deixei para quando a tela existir e mostrar o
que fica bom.
