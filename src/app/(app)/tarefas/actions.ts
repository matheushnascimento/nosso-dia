"use server";

import { refresh } from "next/cache";
import { requireEvento } from "@/lib/dal";
import { mensagemDeErro, type EstadoForm } from "@/lib/erros";
import { parseInteiro, texto } from "@/lib/formato";
import { CATEGORIAS } from "@/lib/rotulos";

/**
 * Toda action reautentica pela DAL e filtra por evento_id.
 * O RLS no banco é a garantia final; o filtro aqui é defesa em profundidade.
 */

function lerResponsavel(fd: FormData): string | null {
  const r = texto(fd, "responsavel");
  return r && r !== "ambos" ? r : null;
}

function lerCategoria(fd: FormData): string {
  const c = texto(fd, "categoria");
  return c in CATEGORIAS ? c : "outros";
}

/** Prazo da tarefa: "relativo" (X dias antes), "fixo" (data) ou "nenhum". */
function lerPrazo(fd: FormData): { offset_dias: number | null; prazo_fixo: string | null } | { erro: string } {
  const modo = texto(fd, "modo_prazo");
  if (modo === "fixo") {
    const data = texto(fd, "prazo_fixo");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Escolha a data do prazo." };
    return { offset_dias: null, prazo_fixo: data };
  }
  if (modo === "relativo") {
    const dias = parseInteiro(fd.get("dias_antes"));
    if (dias === null || Number.isNaN(dias) || dias < 0 || dias > 730) {
      return { erro: "Informe quantos dias antes do casamento (0 a 730)." };
    }
    return { offset_dias: -dias, prazo_fixo: null };
  }
  return { offset_dias: null, prazo_fixo: null };
}

export async function criarTarefa(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await requireEvento();
  const titulo = texto(fd, "titulo");
  if (!titulo) return { erro: "Dê um nome para a tarefa." };
  const prazo = lerPrazo(fd);
  if ("erro" in prazo) return { erro: prazo.erro };

  const { error } = await ctx.supabase.from("tarefas").insert({
    evento_id: ctx.evento.id,
    titulo,
    descricao: texto(fd, "descricao") || null,
    categoria: lerCategoria(fd),
    responsavel: lerResponsavel(fd),
    ordem: 1000,
    ...prazo,
  });
  if (error) return { erro: mensagemDeErro(error, "Não foi possível criar a tarefa.") };

  refresh();
  return { ok: `“${titulo}” adicionada.` };
}

export async function alternarTarefa(fd: FormData) {
  const ctx = await requireEvento();
  const id = texto(fd, "id");
  const concluir = texto(fd, "concluir") === "1";
  await ctx.supabase
    .from("tarefas")
    .update({ status: concluir ? "concluida" : "pendente" })
    .eq("id", id)
    .eq("evento_id", ctx.evento.id);
  refresh();
}

export async function editarTarefa(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await requireEvento();
  const id = texto(fd, "id");
  const titulo = texto(fd, "titulo");
  if (!titulo) return { erro: "A tarefa precisa de um nome." };

  // Prazo fixo vazio = volta a acompanhar a data do casamento.
  const prazoFixo = texto(fd, "prazo_fixo");
  if (prazoFixo && !/^\d{4}-\d{2}-\d{2}$/.test(prazoFixo)) return { erro: "Data de prazo inválida." };

  const { error } = await ctx.supabase
    .from("tarefas")
    .update({
      titulo,
      descricao: texto(fd, "descricao") || null,
      categoria: lerCategoria(fd),
      responsavel: lerResponsavel(fd),
      prazo_fixo: prazoFixo || null,
    })
    .eq("id", id)
    .eq("evento_id", ctx.evento.id);
  if (error) return { erro: mensagemDeErro(error, "Não foi possível salvar.") };

  refresh();
  return { ok: "Salvo." };
}

export async function excluirTarefa(fd: FormData) {
  const ctx = await requireEvento();
  await ctx.supabase.from("tarefas").delete().eq("id", texto(fd, "id")).eq("evento_id", ctx.evento.id);
  refresh();
}

// ---------------------------------------------------------------------------
// Subitens. O RLS (eh_membro_tarefa) garante o acesso; a action confere de novo
// que a tarefa é do casamento antes de inserir.
// ---------------------------------------------------------------------------

export async function alternarSubitem(fd: FormData) {
  const ctx = await requireEvento();
  await ctx.supabase
    .from("tarefa_subitens")
    .update({ feito: texto(fd, "feito") === "1" })
    .eq("id", texto(fd, "id"));
  refresh();
}

export async function adicionarSubitem(fd: FormData) {
  const ctx = await requireEvento();
  const tarefaId = texto(fd, "tarefa_id");
  const novo = texto(fd, "texto").slice(0, 200);
  if (!novo) return;

  const { data: tarefa } = await ctx.supabase
    .from("tarefas")
    .select("id")
    .eq("id", tarefaId)
    .eq("evento_id", ctx.evento.id)
    .maybeSingle();
  if (!tarefa) return;

  await ctx.supabase.from("tarefa_subitens").insert({ tarefa_id: tarefaId, texto: novo, ordem: 1000 });
  refresh();
}

export async function excluirSubitem(fd: FormData) {
  const ctx = await requireEvento();
  await ctx.supabase.from("tarefa_subitens").delete().eq("id", texto(fd, "id"));
  refresh();
}
