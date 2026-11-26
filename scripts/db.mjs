#!/usr/bin/env node
/**
 * Migrations do banco, sem depender da CLI do Supabase.
 *
 *   node scripts/db.mjs migrar    aplica, em ordem, as migrations de db/migrations ainda não aplicadas
 *   node scripts/db.mjs status    lista aplicadas e pendentes
 *   node scripts/db.mjs resetar   APAGA o banco e aplica tudo de novo (só em banco local)
 *
 * Conexão: MIGRATIONS_DATABASE_URL, DATABASE_URL_UNPOOLED ou DATABASE_URL, nessa ordem
 * (no Neon, use a conexão direta, sem pooler). Lê .env.local se existir.
 *
 * Cada migration roda numa transação e fica registrada em migracoes.aplicadas com o hash do
 * arquivo. Editar uma migration já aplicada é erro: crie uma nova.
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASTA = path.join(RAIZ, "db", "migrations");
const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "::1", ""]);

try {
  process.loadEnvFile(path.join(RAIZ, ".env.local"));
} catch {
  // sem .env.local: usa só o ambiente
}

const url = process.env.MIGRATIONS_DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL (veja .env.example).");
  process.exit(1);
}

const conectar = (u = url) => postgres(u, { max: 1, onnotice: () => {} });

async function arquivos() {
  const nomes = (await readdir(PASTA)).filter((n) => n.endsWith(".sql")).sort();
  return Promise.all(
    nomes.map(async (nome) => {
      const sql = await readFile(path.join(PASTA, nome), "utf8");
      return { nome, sql, hash: createHash("sha256").update(sql).digest("hex") };
    }),
  );
}

async function prepararRegistro(sql) {
  await sql`create schema if not exists migracoes`;
  await sql`revoke all on schema migracoes from public`;
  await sql`
    create table if not exists migracoes.aplicadas (
      nome        text primary key,
      hash        text not null,
      aplicada_em timestamptz not null default now()
    )`;
}

async function situacao(sql) {
  await prepararRegistro(sql);
  const feitas = new Map((await sql`select nome, hash from migracoes.aplicadas`).map((r) => [r.nome, r.hash]));
  const todas = await arquivos();
  const alteradas = todas.filter((a) => feitas.has(a.nome) && feitas.get(a.nome) !== a.hash);
  const pendentes = todas.filter((a) => !feitas.has(a.nome));
  const sumidas = [...feitas.keys()].filter((n) => !todas.some((a) => a.nome === n));
  return { todas, feitas, alteradas, pendentes, sumidas };
}

async function migrar() {
  const sql = conectar();
  try {
    // uma execução por vez (ex.: dois deploys ao mesmo tempo)
    await sql`select pg_advisory_lock(hashtext('nosso-dia:migracoes'))`;
    const { alteradas, pendentes, sumidas } = await situacao(sql);
    if (alteradas.length) {
      throw new Error(
        `Migrations já aplicadas foram editadas: ${alteradas.map((a) => a.nome).join(", ")}. ` +
          "Crie uma migration nova em vez de editar (em banco local, use db:reset).",
      );
    }
    if (sumidas.length) console.warn(`Aviso: aplicadas no banco, mas sem arquivo: ${sumidas.join(", ")}`);
    if (!pendentes.length) return console.log("Banco em dia: nenhuma migration pendente.");
    for (const m of pendentes) {
      process.stdout.write(`Aplicando ${m.nome}… `);
      await sql.begin(async (tx) => {
        await tx.unsafe(m.sql);
        await tx`insert into migracoes.aplicadas (nome, hash) values (${m.nome}, ${m.hash})`;
      });
      console.log("ok");
    }
    console.log(`${pendentes.length} migration(s) aplicada(s).`);
  } finally {
    await sql.end();
  }
}

async function status() {
  const sql = conectar();
  try {
    const { todas, feitas, alteradas, pendentes } = await situacao(sql);
    for (const a of todas) {
      const marca = !feitas.has(a.nome) ? "pendente " : alteradas.includes(a) ? "ALTERADA " : "aplicada ";
      console.log(`${marca} ${a.nome}`);
    }
    console.log(`\n${todas.length - pendentes.length} aplicada(s), ${pendentes.length} pendente(s).`);
  } finally {
    await sql.end();
  }
}

async function resetar() {
  const alvo = new URL(url);
  const banco = decodeURIComponent(alvo.pathname.slice(1));
  const host = alvo.hostname.replace(/^\[|\]$/g, "");
  const viaSocket = alvo.searchParams.get("host")?.startsWith("/");
  if (!HOSTS_LOCAIS.has(host) && !viaSocket) {
    console.error(`db:reset só roda em banco local (host atual: ${host}). Nada foi apagado.`);
    process.exit(1);
  }
  if (!banco || banco === "postgres") {
    console.error("Informe na URL um banco próprio do app (não o banco 'postgres').");
    process.exit(1);
  }
  const admin = new URL(url);
  admin.pathname = "/postgres";
  const sql = conectar(admin.toString());
  try {
    console.log(`Apagando e recriando o banco "${banco}"…`);
    await sql.unsafe(`drop database if exists "${banco.replaceAll('"', '""')}" with (force)`);
    await sql.unsafe(`create database "${banco.replaceAll('"', '""')}"`);
  } finally {
    await sql.end();
  }
  await migrar();
}

const comando = process.argv[2] ?? "migrar";
const acoes = { migrar, status, resetar };
if (!acoes[comando]) {
  console.error(`Comando desconhecido: ${comando}. Use migrar, status ou resetar.`);
  process.exit(1);
}
acoes[comando]().catch((e) => {
  console.error(`\nErro: ${e.message}`);
  if (e.where) console.error(e.where);
  process.exit(1);
});
