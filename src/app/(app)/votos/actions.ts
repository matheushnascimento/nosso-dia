"use server";

import { refresh } from "next/cache";
import { requireEvento } from "@/lib/dal";
import { mensagemDeErro } from "@/lib/erros";
import { LIMITE_VOTOS } from "@/lib/votos";

export type ResultadoVotos =
  | { ok: true; pronto: boolean; atualizadoEm: string }
  | { ok: false; erro: string };

/**
 * Salva os votos de quem está logado. Chamado pelo salvamento automático (só `texto`)
 * e pelo botão de marcar/desmarcar como prontos (`pronto`).
 */
export async function salvarVotos(texto: string, pronto?: boolean): Promise<ResultadoVotos> {
  if (typeof texto !== "string") return { ok: false, erro: "Texto inválido." };
  if (texto.length > LIMITE_VOTOS) {
    return { ok: false, erro: `Os votos passaram do limite de ${LIMITE_VOTOS.toLocaleString("pt-BR")} caracteres.` };
  }
  const { supabase, evento } = await requireEvento();
  const { data, error } = await supabase.rpc("salvar_votos", {
    p_evento_id: evento.id,
    p_texto: texto,
    ...(typeof pronto === "boolean" ? { p_pronto: pronto } : {}),
  });
  if (error || !data?.[0]) return { ok: false, erro: mensagemDeErro(error, "Não foi possível salvar. Tente de novo.") };
  // "pronto" conclui/reabre a tarefa e muda o painel: atualiza a tela. O autosave não precisa.
  if (typeof pronto === "boolean") refresh();
  return { ok: true, pronto: data[0].pronto, atualizadoEm: data[0].atualizado_em };
}
