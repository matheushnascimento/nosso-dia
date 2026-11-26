"use server";

import { sql } from "kysely";
import { refresh } from "next/cache";
import { consultar, requireEvento } from "@/lib/dal";
import { mensagemDeErro, type EstadoForm } from "@/lib/erros";
import { PERGUNTAS, tagsDasRespostas, type Respostas } from "@/lib/estilo";
import { texto } from "@/lib/formato";
import { ehCategoriaFornecedor } from "@/lib/rotulos";

/**
 * Questionário: as respostas viram tags (definir_tags). Se isso muda tarefas, a primeira chamada
 * devolve a prévia (entram/saem/ficam) e só a confirmada grava, como na mudança de data.
 * O banco recusa tag fora do catálogo; aqui só lemos os campos das perguntas.
 */
export type ResultadoEstilo =
  | { tipo: "previa"; entram: number; saem: number; ficam: number }
  | { tipo: "salvo"; criadas: number; removidas: number }
  | { tipo: "erro"; mensagem: string };

function lerRespostas(fd: FormData): Respostas {
  const r: Respostas = {};
  for (const { grupo, multipla } of PERGUNTAS) {
    const valores = fd.getAll(grupo).map(String).filter(Boolean);
    if (valores.length) r[grupo] = multipla ? valores : valores.slice(0, 1);
  }
  return r;
}

export async function salvarEstilo(fd: FormData): Promise<ResultadoEstilo> {
  const ctx = await requireEvento();
  const tags = tagsDasRespostas(lerRespostas(fd));

  try {
    if (texto(fd, "confirmado") !== "1") {
      const { rows } = await consultar(ctx, (trx) =>
        sql<{ entram: number; saem: number; ficam: number }>`
          select entram, saem, ficam from previa_tags(${ctx.evento.id}::uuid, ${tags}::text[])
        `.execute(trx),
      );
      const p = rows[0];
      if (p && (p.entram > 0 || p.saem > 0)) return { tipo: "previa", ...p };
    }
    const { rows } = await consultar(ctx, (trx) =>
      sql<{ criadas: number; removidas: number }>`
        select criadas, removidas from definir_tags(${ctx.evento.id}::uuid, ${tags}::text[])
      `.execute(trx),
    );
    refresh();
    return { tipo: "salvo", criadas: rows[0]?.criadas ?? 0, removidas: rows[0]?.removidas ?? 0 };
  } catch (e) {
    return { tipo: "erro", mensagem: mensagemDeErro(e, "Não foi possível salvar as respostas.") };
  }
}

export async function adicionarReferencia(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await requireEvento();
  const campos = { url: texto(fd, "url"), categoria: texto(fd, "categoria"), nota: texto(fd, "nota") };
  if (!ehCategoriaFornecedor(campos.categoria)) return { erro: "Escolha uma categoria da lista.", campos };

  let url: URL;
  try {
    url = new URL(campos.url);
  } catch {
    return { erro: "Cole o link completo, começando com https://", campos };
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname.includes(".") || campos.url.length > 2000) {
    return { erro: "Só aceitamos links que começam com http:// ou https://", campos };
  }
  if (campos.nota.length > 500) return { erro: "A nota passou de 500 caracteres.", campos };

  try {
    await consultar(ctx, (trx) =>
      trx
        .insertInto("referencias")
        .values({
          evento_id: ctx.evento.id,
          categoria: campos.categoria,
          url: url.toString(),
          nota: campos.nota || null,
          criado_por: ctx.userId,
        })
        .execute(),
    );
  } catch (e) {
    return { erro: mensagemDeErro(e, "Não foi possível guardar a referência."), campos };
  }
  refresh();
  return { ok: "Referência guardada.", campos: { categoria: campos.categoria } };
}

export async function excluirReferencia(fd: FormData) {
  const ctx = await requireEvento();
  try {
    await consultar(ctx, (trx) =>
      trx.deleteFrom("referencias").where("id", "=", texto(fd, "id")).where("evento_id", "=", ctx.evento.id).execute(),
    );
  } catch (e) {
    console.error("[nosso-dia] excluirReferencia:", e);
  }
  refresh();
}
