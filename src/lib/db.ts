import "server-only";
import { Kysely } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";

/**
 * Conexão com o Postgres (Neon em produção, Docker no desenvolvimento).
 *
 * Criada só no primeiro uso: o `next build` importa os módulos das rotas e precisa passar
 * sem DATABASE_URL. Uma instância por processo (o `globalThis` evita abrir um pool novo a
 * cada recarga do `next dev`).
 *
 * `prepare: false` porque, no Neon, a conexão passa pelo pooler (PgBouncer em modo transação).
 */
const global = globalThis as unknown as { conexaoNossoDia?: postgres.Sql };

export function conexao(): postgres.Sql {
  if (!global.conexaoNossoDia) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não definida. Veja .env.example.");
    global.conexaoNossoDia = postgres(url, {
      max: process.env.NODE_ENV === "production" ? 5 : 3,
      prepare: false,
      onnotice: () => {},
    });
  }
  return global.conexaoNossoDia;
}

/** Dialeto do Kysely sobre a mesma conexão (usado pelo Better Auth e, na #27, pelas consultas do app). */
export function dialeto() {
  // função, e não a conexão: assim ela só é criada na primeira consulta
  return new PostgresJSDialect({ postgres: () => conexao() });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tipos do banco chegam na #27
export function kysely(): Kysely<any> {
  return new Kysely({ dialect: dialeto() });
}
