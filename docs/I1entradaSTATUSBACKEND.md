<!-- Cole em docs/STATUSBACKEND.md, na seção 3, depois da Fase H. -->

### Fase I — Contrato do front atualizado · ✅ entregue

Três fases mudaram o que o app precisa fazer e o guia do front não sabia de
nenhuma delas: o pedido não-dinheiro ganhou rota de cobrança (F1), seis rotas de
criação passaram a responder `409` (G1) e o razão passou a mostrar a taxa (H1).

**Patch I1 — 3 arquivos**

*`docs/ORIENTACOESFRONT.md`, seção 8.3 nova* — a rota `POST /v1/food-orders/:id/pay`
com o corpo, a resposta e a tabela completa de travas por código; o aviso de que
a confirmação é assíncrona e a tela precisa reconsultar o pedido; o
comportamento do checkout em aberto; e o `409` de fornecedor vencido nas seis
rotas, com as três coisas que evitam tratá-lo errado — não é erro do cliente, o
fornecedor continua aparecendo nas listagens, e o que já estava em andamento não
é afetado.

*Rotas do Mercado Pago documentadas de verdade.* A seção 8.2 dizia "confirme os
caminhos no Swagger regenerado". Agora traz os três caminhos reais, conferidos
no controller: `GET /v1/mercado-pago/status`, `GET /v1/mercado-pago/connect-url`
e `POST /v1/mercado-pago/oauth/callback`, com o detalhe do `redirectUri` que
precisa ser idêntico nas duas pontas.

*`docs/swagger.json` regenerado* — 178 rotas. A rota de pagamento e os seis
`409` conferidos no arquivo gerado, não no código-fonte.

**Bug encontrado no gerador do Swagger, e corrigido.** `scripts/generate-swagger.ts`
criava o app com `logger: false` e sem `abortOnError: false`. Nessa combinação,
qualquer falha de bootstrap fazia o Nest registrar o erro pelo logger — que
estava desligado — e **encerrar o processo por conta própria**: código de saída
1, **zero saída**, e o `swagger.json` intacto com o conteúdo antigo. Ou seja, uma
geração que falhava era indistinguível de uma que não tinha nada para mudar.

Foi exatamente o que aconteceu aqui, e o que revelou o problema. Com
`abortOnError: false` a falha vira exceção; com o `catch` no final, ela vira
mensagem. A causa real apareceu na primeira tentativa seguinte:
`JwtStrategy requires a secret or key` — faltava `JWT_SECRET` no ambiente.

**Validação.** `npx jest`: 10 suítes, 81 testes passando (sem testes novos: o
patch é de documentação e de um script fora do `src`). Build e lint limpos.
Cadeia `F1 → G1 → H1 → I1` verificada em worktree a partir de `98b4e05`, byte a
byte.

**Nada a rodar depois de aplicar** — o `swagger.json` já vem regenerado no patch.

**Resíduo.** A geração do Swagger depende de `JWT_SECRET` no ambiente, o que
impede gerar o contrato em CI ou num checkout limpo sem configurar variável. Não
é bloqueante e não mexi: a correção certa envolve como o `JwtStrategy` lê a
configuração, e isso é mudança em código de autenticação — grande demais para
entrar de carona num patch de documentação.
