import "server-only";
import { Kysely, type Transaction } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";
import type { DB } from "@/lib/db.types";
import { comoUsuario, comoVisitante, type Identidade } from "@/lib/rls";

/**
 * Conexões com o Postgres (Neon em produção, Docker no desenvolvimento).
 *
 * São duas, com o mesmo banco:
 *  - a do **app**, que devolve datas como "YYYY-MM-DD", timestamps como texto ISO e bigint como
 *    número (o que as telas sempre usaram);
 *  - a do **Better Auth**, com os tipos padrão do driver (ele compara datas como `Date`).
 *
 * Criadas só no primeiro uso: o `next build` importa os módulos das rotas sem DATABASE_URL.
 * `prepare: false` porque, no Neon, a conexão passa pelo pooler (PgBouncer em modo transação).
 *
 * O app NÃO acessa o banco direto: só por `comoUsuario` / `comoVisitante` (src/lib/rls.ts),
 * que aplicam o papel e a identidade da requisição. Assim o RLS vale sempre.
 */
type Conexoes = { app?: postgres.Sql; auth?: postgres.Sql; kysely?: Kysely<DB> };
const global = globalThis as unknown as { conexoesNossoDia?: Conexoes };
const conexoes = (global.conexoesNossoDia ??= {});

function url(): string {
  const u = process.env.DATABASE_URL;
  if (!u) throw new Error("DATABASE_URL não definida. Veja .env.example.");
  return u;
}

const opcoesBase = {
  max: process.env.NODE_ENV === "production" ? 5 : 3,
  // Na Vercel a instância fica congelada entre requisições: fecha conexões ociosas para não
  // segurar vagas no pooler do Neon.
  idle_timeout: 20,
  prepare: false,
  onnotice: () => {},
} satisfies postgres.Options<Record<string, postgres.PostgresType>>;

/** "2026-11-26 01:09:20.99+00" → "2026-11-26T01:09:20.990Z" */
const paraISO = (x: string) => new Date(x.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00")).toISOString();

function conexaoApp(): postgres.Sql {
  return (conexoes.app ??= postgres(url(), {
    ...opcoesBase,
    types: {
      data: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x },
      timestamptz: {
        to: 1184,
        from: [1184, 1114],
        serialize: (x: string | Date) => (x instanceof Date ? x.toISOString() : x),
        parse: paraISO,
      },
      int8: { to: 20, from: [20], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
    },
  }));
}

function conexaoAuth(): postgres.Sql {
  return (conexoes.auth ??= postgres(url(), opcoesBase));
}

/** Dialeto para o Better Auth (função: a conexão só nasce na primeira consulta). */
export function dialetoAuth() {
  return new PostgresJSDialect({ postgres: () => conexaoAuth() });
}

function banco(): Kysely<DB> {
  return (conexoes.kysely ??= new Kysely<DB>({ dialect: new PostgresJSDialect({ postgres: () => conexaoApp() }) }));
}

export type Trx = Transaction<DB>;

/** Roda `fn` como o usuário logado (papel `authenticated`, RLS e `auth.uid()` valendo). */
export function noBanco<T>(quem: Identidade, fn: (trx: Trx) => Promise<T>): Promise<T> {
  return comoUsuario(banco(), quem, fn);
}

/** Roda `fn` como visitante sem login (papel `anon`). */
export function noBancoVisitante<T>(fn: (trx: Trx) => Promise<T>): Promise<T> {
  return comoVisitante(banco(), fn);
}
