#!/usr/bin/env bash
# Roda os testes SQL num Postgres comum (sem Docker/Supabase), usando um stub do schema `auth`.
# Conexão pelas variáveis padrão do psql (PGHOST, PGPORT, PGUSER…). Precisa poder criar bancos.
#
#   supabase/testes/rodar.sh
#
# Rodada A: todas as migrations → testes do M0 (regressão)
# Rodada B: migrations do M0 → dados "antigos" → migrations do M1 → testes do M1 (backfill etc.)
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
MIG="$DIR/../migrations"
PSQL=(psql -X -q -v ON_ERROR_STOP=1)
falhas=0

novo_banco() {
  "${PSQL[@]}" -d postgres -c "drop database if exists $1" -c "create database $1" 2> /dev/null
  "${PSQL[@]}" -d "$1" -f "$DIR/00_stub_supabase.sql"
}

aplicar() { # banco, padrão de arquivos
  local banco=$1; shift
  for f in "$@"; do "${PSQL[@]}" -d "$banco" -f "$f" > /dev/null; done
}

conferir() { # saída de um arquivo de testes
  local saida=$1
  echo "$saida" | grep -E '^(ok|FALHOU)|\| (t|f|ok|FALHOU)' || true
  if echo "$saida" | grep -qE 'FALHOU|\| f$|ERROR'; then falhas=$((falhas + 1)); fi
}

echo "== Rodada A: M0 + M1 → testes do M0"
novo_banco nd_teste_a
aplicar nd_teste_a "$MIG"/*.sql
conferir "$("${PSQL[@]}" -d nd_teste_a -f "$DIR/10_testes.sql" 2>&1)"

echo
echo "== Rodada B: M0 → dados antigos → M1 → testes do M1"
novo_banco nd_teste_b
aplicar nd_teste_b "$MIG"/202611250000*.sql
aplicar nd_teste_b "$DIR/15_dados_pre_m1.sql"
aplicar nd_teste_b "$MIG"/202611260000*.sql
conferir "$("${PSQL[@]}" -d nd_teste_b -f "$DIR/20_testes_m1.sql" 2>&1)"
conferir "$("${PSQL[@]}" -d nd_teste_b -f "$DIR/30_testes_cerimonia.sql" 2>&1)"

echo
if [ "$falhas" -gt 0 ]; then echo "❌ Falhas em $falhas rodada(s)."; exit 1; fi
echo "✅ Todos os testes passaram."
