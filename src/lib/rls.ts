import { sql, type Kysely, type Transaction } from "kysely";

/**
 * Como cada consulta do app chega ao banco: numa transação, com o papel e a identidade de quem
 * fez a requisição. É o que o Supabase fazia por trás do supabase-js, e é o que faz o RLS e as
 * funções do banco (`auth.uid()`, `auth.jwt()`) valerem.
 *
 * Tudo com escopo da transação (`set_config(..., true)`): ao terminar, a conexão volta ao dono
 * e pode ser reaproveitada pelo pool (ou pelo pooler do Neon) sem carregar a identidade de ninguém.
 *
 * Módulo sem dependências do Next, para ser testado direto (db/testes/rls-app.mts).
 */
export type Identidade = { userId: string; email: string };

export function comoUsuario<DB, T>(
  db: Kysely<DB>,
  quem: Identidade,
  fn: (trx: Transaction<DB>) => Promise<T>,
): Promise<T> {
  return db.transaction().execute(async (trx) => {
    await sql`
      select set_config('role', 'authenticated', true),
             set_config('request.jwt.claim.sub', ${quem.userId}, true),
             set_config('request.jwt.claims', ${JSON.stringify({ sub: quem.userId, email: quem.email })}, true)
    `.execute(trx);
    return fn(trx);
  });
}

/** Visitante sem login (ex.: abrir o link de um convite). */
export function comoVisitante<DB, T>(db: Kysely<DB>, fn: (trx: Transaction<DB>) => Promise<T>): Promise<T> {
  return db.transaction().execute(async (trx) => {
    await sql`
      select set_config('role', 'anon', true),
             set_config('request.jwt.claim.sub', '', true),
             set_config('request.jwt.claims', '', true)
    `.execute(trx);
    return fn(trx);
  });
}
