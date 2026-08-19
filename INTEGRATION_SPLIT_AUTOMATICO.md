# Guia de Integração: Split Automático e Mercado Pago OAuth

Este documento descreve como as aplicações Web e WebApp (Mobile) devem se integrar ao backend para permitir o recebimento de pagamentos via **Split Automático do Mercado Pago**.

---

## 1. Visão Geral do Fluxo

Para que prestadores de serviço, vendedores de produtos e restaurantes possam receber pagamentos diretamente em suas contas do Mercado Pago, eles precisam **vincular suas contas via OAuth**.

### Fluxo Simplificado:
1. O usuário (prestador/vendedor/restaurante) clica em **"Conectar conta do Mercado Pago"** no app/web.
2. O aplicativo abre a URL do Mercado Pago OAuth obtida pelo endpoint `GET /v1/mercado-pago/connect-url`.
3. O usuário autoriza a aplicação na página do Mercado Pago.
4. O Mercado Pago redireciona para o `redirectUri` configurado com o parâmetro `code`.
5. O Web/App envia o `code` para o endpoint `POST /v1/mercado-pago/oauth/callback`.
6. O backend troca o `code` por tokens oficiais e salva a vinculação no banco de dados.
7. Quando um cliente paga por um serviço/produto/pedido, o backend gera um checkout do Mercado Pago com **split automático** (retenção da taxa de 10% para a plataforma e repasse automático de 90% para o vendedor).

---

## 2. Endpoints do Módulo `Mercado Pago`

### 2.1. Verificar se a Conta está Vinculada
Verifica se o usuário logado já possui uma conta do Mercado Pago vinculada para receber pagamentos.

- **Rota:** `GET /v1/mercado-pago/status`
- **Autenticação:** Bearer Token (JWT)
- **Resposta Sucesso (`200 OK`):**
```json
{
  "isLinked": true,
  "mpUserId": "123456789"
}
```

---

### 2.2. Obter URL de Autorização OAuth
Retorna a URL oficial do Mercado Pago para onde o usuário deve ser redirecionado para autorizar a conexão.

- **Rota:** `GET /v1/mercado-pago/connect-url`
- **Autenticação:** Bearer Token (JWT)
- **Query Parameters (Opcional):**
  - `redirectUri` (string): URI de retorno para redirecionar após a autorização (ex: `https://meusite.com/mercado-pago/callback` ou esquema do app mobile `myapp://mp-callback`).
- **Resposta Sucesso (`200 OK`):**
```json
{
  "url": "https://auth.mercadopago.com.br/authorization?client_id=123456789&response_type=code&platform_id=mp&redirect_uri=https%3A%2F%2Fmeusite.com%2Fcallback"
}
```

---

### 2.3. Processar Código de Autorização (Callback)
Envia o `code` retornado pelo Mercado Pago para o backend vincular os tokens à conta do usuário.

- **Rota:** `POST /v1/mercado-pago/oauth/callback`
- **Autenticação:** Bearer Token (JWT)
- **Corpo da Requisição (JSON):**
```json
{
  "code": "TG-6789abcdef...",
  "redirectUri": "https://meusite.com/callback"
}
```
- **Resposta Sucesso (`200 OK`):**
```json
{
  "message": "Conta do Mercado Pago conectada com sucesso.",
  "mpUserId": "123456789"
}
```

---

## 3. Tratamento de Erros no Frontend / Mobile

Caso um prestador/vendedor **não tenha a conta do Mercado Pago vinculada** e um cliente tente realizar um pagamento ou pedido, o backend bloqueará a operação e retornará o status `400 Bad Request`:

```json
{
  "statusCode": 400,
  "message": "O prestador/vendedor precisa conectar sua conta do Mercado Pago para receber pagamentos via split automático.",
  "error": "Bad Request"
}
```

### Recomendação de UX para Web e WebApp:
- Na tela do prestador/vendedor, consulte o endpoint `GET /v1/mercado-pago/status`.
- Se `isLinked === false`, exiba um aviso em destaque: *"Você precisa conectar sua conta do Mercado Pago para poder receber por seus serviços e produtos."* com um botão que dispara o fluxo de autorização.

---

## 4. Resumo das Regras de Negócio
- **Taxa de Plataforma:** 10% do valor total é automaticamente retido para a plataforma.
- **Repasse ao Vendedor:** 90% do valor total cai diretamente na conta do Mercado Pago do prestador/vendedor.
- **Bloqueio Prévio:** Vendedores sem conta conectada não podem receber solicitações de pagamentos/pedidos.
