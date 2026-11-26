/**
 * Teste de integração do RLS pela camada do app (#27).
 *
 * Usa o mesmo `comoUsuario` / `comoVisitante` (src/lib/rls.ts) por onde passam todas as consultas
 * das telas, conectado como o dono do banco, como o servidor do app. Cria dois usuários, A com um
 * casamento, e confere que B não lê nem altera nada de A por nenhuma tabela ou função.
 *
 *   npm run db:test:app        (usa DATABASE_URL do .env.local; cria e apaga os próprios dados)
 */
import { Kysely, sql } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";
import { comoUsuario, comoVisitante, type Identidade } from "../../src/lib/rls";

try {
  process.loadEnvFile(".env.local");
} catch {}
const url = process.env.DATABASE_URL;
if (!url) throw new Error("Defina DATABASE_URL.");
// O teste cria e apaga contas: nunca contra o Neon de produção.
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(url).hostname)) {
  console.error("db:test:app só roda contra um banco local (localhost/127.0.0.1).");
  process.exit(1);
}

const conexao = postgres(url, { max: 2, prepare: false, onnotice: () => {} });
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- teste: SQL livre
const db = new Kysely<any>({ dialect: new PostgresJSDialect({ postgres: conexao }) });

const sufixo = Math.random().toString(36).slice(2, 8);
const A: Identidade = { userId: crypto.randomUUID(), email: `a-${sufixo}@teste-rls.dev` };
const B: Identidade = { userId: crypto.randomUUID(), email: `b-${sufixo}@teste-rls.dev` };

let falhas = 0;
const ok = (nome: string, cond: boolean, extra = "") => {
  if (!cond) falhas++;
  console.log(`${cond ? "ok    " : "FALHOU"} · ${nome}${extra ? ` — ${extra}` : ""}`);
};
const erroDe = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
    return null;
  } catch (e) {
    return (e as { code?: string }).code ?? "erro";
  }
};
const contar = (quem: Identidade, tabela: string) =>
  comoUsuario(db, quem, async (trx) => Number((await sql<{ n: string }>`select count(*) as n from ${sql.table(tabela)}`.execute(trx)).rows[0].n));

try {
  // contas criadas como o Better Auth cria (trigger leva para auth.users e perfis)
  for (const u of [A, B]) {
    await sql`insert into ba_user (id, name, email, "emailVerified") values (${u.userId}::uuid, 'Teste', ${u.email}, true)`.execute(db);
  }

  // A cria o casamento e mexe nas coisas dele
  const evento = await comoUsuario(db, A, async (trx) => {
    const id = (await sql<{ id: string }>`select criar_evento('A & X', 'indefinida') as id`.execute(trx)).rows[0].id;
    await sql`select salvar_votos(${id}::uuid, 'segredo de A', true)`.execute(trx);
    await sql`insert into convites_parceiro (evento_id, email, convidado_por) values (${id}::uuid, 'x@teste-rls.dev', ${A.userId}::uuid)`.execute(trx);
    return id;
  });
  ok("A cria o casamento e vê as próprias tarefas", Boolean(evento) && (await contar(A, "tarefas")) > 0);

  // B: leitura
  for (const t of ["eventos", "membros", "tarefas", "tarefas_com_prazo", "tarefa_subitens", "evento_pacotes", "votos", "convites_parceiro"]) {
    ok(`B não lê ${t} de A`, (await contar(B, t)) === 0);
  }
  ok("B lê só o próprio perfil", (await contar(B, "perfis")) === 1);

  // B: escrita
  const alterou = await comoUsuario(db, B, async (trx) => ({
    eventos: (await sql`update eventos set nome_exibicao = 'invadido' where id = ${evento}::uuid`.execute(trx)).numAffectedRows,
    tarefas: (await sql`update tarefas set status = 'concluida' where evento_id = ${evento}::uuid`.execute(trx)).numAffectedRows,
    apagou: (await sql`delete from tarefas where evento_id = ${evento}::uuid`.execute(trx)).numAffectedRows,
  }));
  const linhas = Object.values(alterou).map(Number);
  ok("B não altera nem apaga nada de A", linhas.every((n) => n === 0), JSON.stringify(linhas));
  ok("B não cria tarefa no casamento de A", (await erroDe(() => comoUsuario(db, B, (trx) => sql`insert into tarefas (evento_id, titulo) values (${evento}::uuid, 'x')`.execute(trx)))) === "42501");

  // B: funções
  ok("B não ativa checklist no casamento de A", (await erroDe(() => comoUsuario(db, B, (trx) => sql`select * from ativar_pacote(${evento}::uuid, 'religioso_catolico')`.execute(trx)))) !== null);
  ok("B não grava votos no casamento de A", (await erroDe(() => comoUsuario(db, B, (trx) => sql`select * from salvar_votos(${evento}::uuid, 'x')`.execute(trx)))) === "42501");
  ok("B não vê a situação dos votos de A", (await comoUsuario(db, B, async (trx) => (await sql`select * from status_votos(${evento}::uuid)`.execute(trx)).rows.length)) === 0);

  // visitante
  ok("visitante não lê tarefas", (await erroDe(() => comoVisitante(db, (trx) => sql`select * from tarefas`.execute(trx)))) === "42501");
  ok("visitante não lê o login (sessões, senhas)", (await erroDe(() => comoVisitante(db, (trx) => sql`select * from ba_account`.execute(trx)))) === "42501");

  // nada vaza entre requisições na mesma conexão
  await comoUsuario(db, A, (trx) => sql`select 1`.execute(trx));
  const depois = (await sql<{ papel: string; sub: string | null; dono: string }>`
    select current_setting('role') as papel, nullif(current_setting('request.jwt.claim.sub', true), '') as sub, current_user as dono
  `.execute(db)).rows[0];
  ok("fora da transação, a conexão volta ao dono sem identidade", depois.papel === "none" && depois.sub === null, JSON.stringify(depois));

  // erro no meio também desfaz o papel
  await erroDe(() => comoUsuario(db, B, (trx) => sql`select 1/0`.execute(trx)));
  const aposErro = (await sql<{ sub: string | null }>`select nullif(current_setting('request.jwt.claim.sub', true), '') as sub`.execute(db)).rows[0];
  ok("depois de um erro, a identidade também some", aposErro.sub === null);
} finally {
  await sql`delete from ba_user where email like ${`%-${sufixo}@teste-rls.dev`}`.execute(db).catch(() => {});
  await sql`delete from eventos where nome_exibicao = 'A & X' and criado_por is null`.execute(db).catch(() => {});
  await db.destroy();
}

console.log(falhas ? `\n❌ ${falhas} falha(s).` : "\n✅ RLS pela camada do app: tudo certo.");
process.exit(falhas ? 1 : 0);
