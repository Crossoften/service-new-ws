#!/usr/bin/env bash
# Validação da conta Twilio a partir da SUA máquina.
#
# Precisa rodar aí porque a saída para api.twilio.com está bloqueada pela
# política de rede da sessão do Claude — o 403 que aparece no log da API é do
# proxy de egress, não do Twilio recusando as credenciais.
#
#   chmod +x validar-twilio.sh
#   ./validar-twilio.sh                      # só consulta, não envia nada
#   ./validar-twilio.sh +5534999990000       # envia um SMS de teste
#
# Lê TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER do .env.
# O arquivo NÃO é executado: as chaves são extraídas por leitura de texto, então
# linha malformada, valor com espaço ou comentário sem `#` não quebram nada.

set -uo pipefail
cd "$(dirname "$0")"

ENV_FILE="${ENV_FILE:-.env}"
[ -f "$ENV_FILE" ] || { echo "Não achei $ENV_FILE. Rode de dentro do service-new-ws ou defina ENV_FILE."; exit 1; }

# Última definição da chave, sem comentários, sem aspas, sem espaço nas pontas.
read_env() {
  grep -E "^[[:space:]]*$1[[:space:]]*=" "$ENV_FILE" 2>/dev/null \
    | tail -1 \
    | sed -e "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*//" \
          -e 's/^"//' -e "s/^'//" -e 's/"[[:space:]]*$//' -e "s/'[[:space:]]*$//" \
          -e 's/[[:space:]]*$//'
}

TWILIO_ACCOUNT_SID="$(read_env TWILIO_ACCOUNT_SID)"
TWILIO_AUTH_TOKEN="$(read_env TWILIO_AUTH_TOKEN)"
TWILIO_PHONE_NUMBER="$(read_env TWILIO_PHONE_NUMBER)"

falta=""
[ -n "$TWILIO_ACCOUNT_SID" ]   || falta="$falta TWILIO_ACCOUNT_SID"
[ -n "$TWILIO_AUTH_TOKEN" ]    || falta="$falta TWILIO_AUTH_TOKEN"
[ -n "$TWILIO_PHONE_NUMBER" ]  || falta="$falta TWILIO_PHONE_NUMBER"
[ -z "$falta" ] || { echo "Faltando no $ENV_FILE:$falta"; exit 1; }

case "$TWILIO_ACCOUNT_SID" in
  AC*) ;;
  *) echo "TWILIO_ACCOUNT_SID não começa com 'AC' — valor lido: '$TWILIO_ACCOUNT_SID'"; exit 1;;
esac

# Os valores de exemplo do .env.example passam na checagem de formato mas são
# recusados pelo Twilio com 20003. Avisar antes evita diagnosticar credencial
# boa como ruim.
case "$TWILIO_ACCOUNT_SID$TWILIO_PHONE_NUMBER" in
  *deadbeef*|*+10000000000*|*seu_twilio*)
    echo "ATENÇÃO: o .env ainda tem os valores de exemplo, não as credenciais reais."
    echo "         Preencha TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_PHONE_NUMBER"
    echo "         e rode de novo. (Seguindo assim, o Twilio vai responder 20003.)"
    echo
    ;;
esac

# --- sanidade do .env, antes de culpar a credencial ---------------------------
# Chave repetida é a causa mais comum de "SID certo, token errado": linha nova
# adicionada no fim sem apagar a antiga. Aqui vale a última; no dotenv do Node
# o comportamento com duplicata não é o mesmo em toda versão — então o certo é
# não ter duplicata nenhuma.
for chave in TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN TWILIO_PHONE_NUMBER; do
  n=$(grep -cE "^[[:space:]]*$chave[[:space:]]*=" "$ENV_FILE")
  if [ "$n" -gt 1 ]; then
    echo "ATENÇÃO: $chave está definida $n vezes no $ENV_FILE (linhas: $(grep -nE "^[[:space:]]*$chave[[:space:]]*=" "$ENV_FILE" | cut -d: -f1 | tr '\n' ' '))."
    echo "         Apague as repetidas e deixe só uma."
    echo
  fi
done

# O auth token do Twilio é sempre 32 caracteres hexadecimais.
tok_len=${#TWILIO_AUTH_TOKEN}
case "$TWILIO_AUTH_TOKEN" in
  *[!0-9a-fA-F]*) tok_hex="NÃO — tem caractere que não é hexadecimal" ;;
  *)              tok_hex="sim" ;;
esac
if [ "$tok_len" -ne 32 ] || [ "$tok_hex" != "sim" ]; then
  echo "ATENÇÃO: o TWILIO_AUTH_TOKEN lido não tem a cara de um auth token."
  echo "         comprimento: $tok_len (esperado 32) | só hexadecimal: $tok_hex"
  echo "         Se o valor começa com 'SK', é uma API Key, não o auth token da conta."
  echo
fi

# CR do Windows entra no valor e faz a autenticação falhar sem explicação.
if grep -q $'\r' "$ENV_FILE" 2>/dev/null; then
  echo "ATENÇÃO: o $ENV_FILE tem quebras de linha do Windows (CR)."
  echo "         Converta com: tr -d '\\r' < $ENV_FILE > .env.tmp && mv .env.tmp $ENV_FILE"
  echo
fi
# -----------------------------------------------------------------------------

echo "Conta ...${TWILIO_ACCOUNT_SID: -6} | número $TWILIO_PHONE_NUMBER | token: $tok_len chars, hex: $tok_hex"
echo

API="https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID"
AUTH="$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"

# --- modo consulta: ./validar-twilio.sh --logs -------------------------------
# Mostra o desfecho das últimas mensagens. É o mesmo que o Messaging Logs do
# painel mostraria, para quem não tem acesso ao console.
if [ "${1:-}" = "--logs" ]; then
  echo "== Últimas mensagens da conta =="
  curl -sS -u "$AUTH" --get "$API/Messages.json" --data-urlencode "PageSize=10" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    print('  Resposta ilegível do Twilio.'); raise SystemExit
msgs = d.get('messages')
if msgs is None:
    print('  RECUSADO | code:', d.get('code'), '|', d.get('message')); raise SystemExit
if not msgs:
    print('  Nenhuma mensagem registrada nesta conta.'); raise SystemExit
print('  %-30s %-16s %-12s %s' % ('quando', 'para', 'status', 'erro'))
for m in msgs:
    err = m.get('error_code')
    print('  %-30s %-16s %-12s %s' % (
        m.get('date_sent') or m.get('date_created') or '?',
        m.get('to') or '?',
        m.get('status') or '?',
        ('%s %s' % (err, m.get('error_message') or '')).strip() if err else ''))
print()
print('  Legenda: delivered = chegou | undelivered/failed = não chegou (veja o erro)')
print('           queued/sending/sent = ainda em trânsito, consulte de novo em instantes')
"
  exit 0
fi
# -----------------------------------------------------------------------------

echo "== 1. As credenciais são válidas? =="
curl -sS -u "$AUTH" "$API.json" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    print('  Resposta ilegível do Twilio.'); raise SystemExit
# A resposta de ERRO do Twilio também traz 'status' (o código HTTP). Quem
# distingue sucesso de falha é o 'sid' da conta / a presença de 'code'.
if d.get('code'):
    print('  RECUSADO | code:', d.get('code'), '|', d.get('message'))
    if d.get('code') == 20003:
        print('  -> o token não corresponde a este Account SID.')
        print('     Confira os dois em https://console.twilio.com/ (painel inicial).')
        print('     Se o SID for de uma subconta, o token tem que ser o dela, não o da conta principal.')
elif d.get('sid'):
    print('  OK | status:', d.get('status'), '| tipo:', d.get('type'), '| conta:', d.get('friendly_name'))
else:
    print('  Resposta inesperada:', json.dumps(d)[:200])
"

echo
echo "== 2. O número $TWILIO_PHONE_NUMBER está na conta e manda SMS? =="
curl -sS -u "$AUTH" --get "$API/IncomingPhoneNumbers.json" \
     --data-urlencode "PhoneNumber=$TWILIO_PHONE_NUMBER" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    print('  Resposta ilegível do Twilio.'); raise SystemExit
nums = d.get('incoming_phone_numbers')
if nums is None:
    print('  RECUSADO | code:', d.get('code'), '|', d.get('message')); raise SystemExit
if not nums:
    print('  Número NÃO encontrado nesta conta.'); raise SystemExit
n = nums[0]
c = n.get('capabilities', {})
print('  ', n.get('phone_number'), '|', n.get('friendly_name'))
print('   SMS:', c.get('sms'), '| MMS:', c.get('mms'), '| voz:', c.get('voice'))
"

echo
echo "== 2b. Que números esta conta tem, afinal? =="
curl -sS -u "$AUTH" --get "$API/IncomingPhoneNumbers.json" --data-urlencode "PageSize=50" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    print('  Resposta ilegível do Twilio.'); raise SystemExit
nums = d.get('incoming_phone_numbers')
if nums is None:
    print('  RECUSADO | code:', d.get('code'), '|', d.get('message')); raise SystemExit
if not nums:
    print('  NENHUM número comprado nesta conta.')
    print('  -> É preciso comprar um número antes de enviar qualquer SMS.')
    raise SystemExit
print('  %d número(s):' % len(nums))
for n in nums:
    c = n.get('capabilities', {})
    print('   ', n.get('phone_number'), '| SMS:', c.get('sms'), '| voz:', c.get('voice'), '|', n.get('friendly_name'))
"

echo
echo "== 2c. Existem subcontas? (o número pode estar em uma delas) =="
curl -sS -u "$AUTH" --get "https://api.twilio.com/2010-04-01/Accounts.json" --data-urlencode "PageSize=50" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    print('  Resposta ilegível do Twilio.'); raise SystemExit
accs = d.get('accounts')
if accs is None:
    print('  RECUSADO | code:', d.get('code'), '|', d.get('message')); raise SystemExit
subs = [a for a in accs if a.get('sid') != a.get('owner_account_sid')]
if not subs:
    print('  Nenhuma subconta — só a conta principal.')
else:
    print('  %d subconta(s):' % len(subs))
    for a in subs:
        print('   ', a.get('sid'), '|', a.get('friendly_name'), '| status:', a.get('status'))
    print('  -> Para usar um número de subconta, o SID e o token no .env têm que ser os dela.')
"

echo "== 3. O envio para o Brasil está liberado? =="
echo "   Geo Permissions não tem endpoint público de leitura — mas NÃO é preciso"
echo "   abrir o painel para descobrir: o envio do bloco 4 responde. Se a permissão"
echo "   estiver desligada, a mensagem é recusada na origem com o código 21408."
echo "   Painel (quando tiver acesso, para ligar a permissão):"
echo "   https://console.twilio.com/us1/develop/sms/settings/geo-permissions"

echo
if [ $# -ge 1 ]; then
  DEST="$1"
  echo "== 4. Envio real para $DEST =="

  SID=$(curl -sS -u "$AUTH" -X POST "$API/Messages.json" \
    --data-urlencode "From=$TWILIO_PHONE_NUMBER" \
    --data-urlencode "To=$DEST" \
    --data-urlencode "Body=Teste de integracao service-new-ws. Codigo 123456." | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    print('  Resposta ilegível do Twilio.', file=sys.stderr); raise SystemExit
if d.get('sid'):
    print('  Aceito pelo Twilio | sid:', d['sid'], '| status inicial:', d.get('status'), file=sys.stderr)
    print(d['sid'])
else:
    print('  RECUSADO NA ORIGEM | code:', d.get('code'), '|', d.get('message'), file=sys.stderr)
    if d.get('code'):
        print('  Detalhe: https://www.twilio.com/docs/api/errors/%s' % d['code'], file=sys.stderr)
")

  if [ -z "$SID" ]; then
    echo
    echo "  A mensagem nem saiu. O código acima diz por quê — os mais comuns:"
    echo "    21408  permissão geográfica desligada para o país de destino"
    echo "    21606  o número de origem não pode enviar SMS para esse destino"
    echo "    21211  número de destino inválido (formato)"
    exit 1
  fi

  echo
  echo "  Consultando o status final (até 90s)..."
  # 'queued'/'sent' não são desfecho: a operadora ainda pode recusar depois.
  # Só 'delivered', 'undelivered' e 'failed' encerram a história.
  for i in $(seq 1 18); do
    sleep 5
    RESULTADO=$(curl -sS -u "$AUTH" "$API/Messages/$SID.json" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    print('erro|  Resposta ilegível do Twilio.'); raise SystemExit
st = d.get('status')
ec = d.get('error_code')
em = d.get('error_message')
final = st in ('delivered', 'undelivered', 'failed')
print('%s|%s|%s|%s' % ('fim' if final else 'aguarda', st, ec if ec else '', em if em else ''))
")
    ESTADO="${RESULTADO%%|*}"
    RESTO="${RESULTADO#*|}"
    STATUS="${RESTO%%|*}"
    RESTO="${RESTO#*|}"
    CODIGO="${RESTO%%|*}"
    MENSAGEM="${RESTO#*|}"

    printf "\r  [%2ds] status: %-12s" "$((i*5))" "$STATUS"

    if [ "$ESTADO" = "fim" ]; then
      echo; echo
      case "$STATUS" in
        delivered)
          echo "  ENTREGUE. O SMS chegou no aparelho."
          echo "  A integração está validada de ponta a ponta — dá para testar o fluxo da API:"
          echo "    POST /v1/no-auth/forgot  {\"channel\":\"sms\",\"identifier\":\"$DEST\"}"
          ;;
        undelivered|failed)
          echo "  NÃO ENTREGUE | status: $STATUS | code: ${CODIGO:-n/d}"
          [ -n "$MENSAGEM" ] && echo "  Twilio diz: $MENSAGEM"
          case "$CODIGO" in
            21408) echo "  -> Permissão geográfica desligada para esse país. Resolve no painel, sem trocar número." ;;
            21612) echo "  -> Essa origem não alcança esse destino. Normalmente exige número que atenda a região." ;;
            21606) echo "  -> O número de origem não é válido como remetente para esse destino." ;;
            30003) echo "  -> Aparelho inalcançável (desligado, sem sinal, fora de área). Vale repetir depois." ;;
            30005) echo "  -> Número de destino desconhecido ou inexistente." ;;
            30006) echo "  -> Fixo, ou operadora que não recebe SMS." ;;
            30007) echo "  -> Filtrado pela operadora. No Brasil costuma ser falta de remetente registrado." ;;
            30032) echo "  -> Número toll-free não verificado." ;;
            *)     echo "  -> Consulte: https://www.twilio.com/docs/api/errors/${CODIGO:-}" ;;
          esac
          ;;
      esac
      exit 0
    fi
  done

  echo; echo
  echo "  Ainda em '$STATUS' depois de 90s — sem desfecho."
  echo "  Consulte de novo com:"
  echo "    curl -sS -u \"\$TWILIO_ACCOUNT_SID:\$TWILIO_AUTH_TOKEN\" \\"
  echo "      \"$API/Messages/$SID.json\" | python3 -m json.tool | grep -E 'status|error'"
else
  echo "== 4. Envio real: pulado =="
  echo "   Rode com um destino para testar: ./validar-twilio.sh +5534999990000"
fi
