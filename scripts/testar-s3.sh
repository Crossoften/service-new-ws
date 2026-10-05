#!/usr/bin/env bash
#
# Exercita a integração com o S3 de ponta a ponta, contra a API rodando.
#
# Existe porque o caminho da AWS é o único que não dá para validar sem
# credencial: os testes automatizados cobrem a lógica com duplos, e a chamada
# real ao bucket só acontece aqui.
#
#   Uso:  ./scripts/testar-s3.sh <email> <senha> [base-da-api]
#
# Não recebe nem imprime credencial da AWS. Ele só observa o comportamento da
# API; quem tem as chaves é o processo do servidor.

set -euo pipefail

EMAIL="${1:?informe o email de um usuário ativo}"
SENHA="${2:?informe a senha}"
API="${3:-http://localhost:8000}"

azul()    { printf '\n\033[1;34m%s\033[0m\n' "$1"; }
ok()      { printf '  \033[0;32m✓\033[0m %s\n' "$1"; }
falhou()  { printf '  \033[0;31m✗\033[0m %s\n' "$1"; FALHAS=$((FALHAS + 1)); }
FALHAS=0

azul "0. Autenticando"
TOKEN=$(curl -sS -X POST "$API/v1/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$SENHA\"}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
ok "token obtido"

azul "1. Upload de imagem"
python3 -c "
import base64
open('/tmp/teste-s3.png','wb').write(base64.b64decode(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='))
"
RESP=$(curl -sS -X POST "$API/v1/upload/one-file" -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/teste-s3.png")
URL=$(echo "$RESP" | python3 -c 'import sys,json;print(json.load(sys.stdin)["fileUrl"])')
ok "enviado — $URL"

azul "2. Leitura pela URL gravada"
CODIGO=$(curl -sS -o /tmp/baixado-s3.png -w '%{http_code}' "$URL")
if [ "$CODIGO" = "200" ] && cmp -s /tmp/teste-s3.png /tmp/baixado-s3.png; then
  ok "conteúdo idêntico ao enviado"
else
  falhou "esperava 200 com o mesmo conteúdo; veio $CODIGO"
fi

azul "3. O objeto NÃO deve ser público no bucket"
# Se esta URL abrir, o Block Public Access está desligado — e qualquer pessoa
# lê os anexos de orçamento sabendo o nome do bucket.
CHAVE=$(echo "$RESP" | python3 -c 'import sys,json;print(json.load(sys.stdin)["fileKey"])')
BUCKET="${AWS_BUCKET_NAME:-}"
if [ -n "$BUCKET" ]; then
  DIRETO=$(curl -sS -o /dev/null -w '%{http_code}' "https://$BUCKET.s3.amazonaws.com/$CHAVE" || echo 000)
  if [ "$DIRETO" = "200" ]; then
    falhou "o objeto está PÚBLICO no bucket — ligue o Block Public Access"
  else
    ok "bucket fechado (HTTP $DIRETO ao tentar ler direto)"
  fi
else
  printf '  - defina AWS_BUCKET_NAME no shell para checar o acesso público\n'
fi

azul "4. Teto de tamanho"
head -c 12000000 /dev/urandom > /tmp/grande-s3.png
CODIGO=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$API/v1/upload/one-file" \
  -H "Authorization: Bearer $TOKEN" -F "file=@/tmp/grande-s3.png" || true)
[ "$CODIGO" = "413" ] && ok "12 MB recusado com 413" || falhou "esperava 413, veio $CODIGO"

azul "5. Vídeo — presign"
PRESIGN=$(curl -sS -X POST "$API/v1/upload/presign" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"fileName":"teste.mp4","contentType":"video/mp4"}')
ESTRATEGIA=$(echo "$PRESIGN" | python3 -c 'import sys,json;print(json.load(sys.stdin)["strategy"])')
ok "estratégia: $ESTRATEGIA"
[ "$ESTRATEGIA" = "s3" ] || printf '  \033[0;33m!\033[0m a API está SEM credenciais da AWS\n'

azul "6. Vídeo — envio e confirmação"
UP=$(echo "$PRESIGN" | python3 -c 'import sys,json;print(json.load(sys.stdin)["uploadUrl"])')
CHAVE=$(echo "$PRESIGN" | python3 -c 'import sys,json;print(json.load(sys.stdin)["fileKey"])')
TK=$(echo "$PRESIGN" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
head -c 2000000 /dev/urandom > /tmp/teste-s3.mp4

if [ "$ESTRATEGIA" = "s3" ]; then
  # Os campos assinados vão ANTES do arquivo, e sem header de autenticação.
  CAMPOS=$(echo "$PRESIGN" | python3 -c '
import sys, json
for k, v in json.load(sys.stdin)["fields"].items():
    print(f"-F\n{k}={v}")
')
  CODIGO=$(echo "$CAMPOS" | xargs -d '\n' curl -sS -o /dev/null -w '%{http_code}' \
    -X POST "$UP" -F "file=@/tmp/teste-s3.mp4" || true)
else
  CODIGO=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$UP" \
    -H "Authorization: Bearer $TOKEN" -F "token=$TK" -F "file=@/tmp/teste-s3.mp4" || true)
fi
case "$CODIGO" in
  20*) ok "envio aceito (HTTP $CODIGO)" ;;
  *)   falhou "envio recusado com $CODIGO" ;;
esac

CONF=$(curl -sS -X POST "$API/v1/upload/confirm" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d "{\"fileKey\":\"$CHAVE\",\"token\":\"$TK\"}")
echo "$CONF" | grep -q '"fileUrl"' && ok "registrado: $(echo "$CONF" | python3 -c 'import sys,json;print(json.load(sys.stdin)["fileUrl"])')" \
  || falhou "confirm falhou: $CONF"

azul "7. Recusas"
C=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$API/v1/upload/confirm" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"fileKey":"inventada.mp4","token":"forjado"}' || true)
[ "$C" = "403" ] && ok "token forjado recusado com 403" || falhou "esperava 403, veio $C"

C=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$API/v1/upload/presign" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"fileName":"foto.png","contentType":"image/png"}' || true)
[ "$C" = "400" ] && ok "imagem no presign recusada com 400" || falhou "esperava 400, veio $C"

echo
if [ "$FALHAS" -eq 0 ]; then
  printf '\033[0;32mTodos os passos passaram.\033[0m\n'
else
  printf '\033[0;31m%s passo(s) falharam.\033[0m\n' "$FALHAS"
  exit 1
fi
