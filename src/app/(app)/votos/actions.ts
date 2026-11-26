"use server";

import { refresh } from "next/cache";
import { sql } from "kysely";
import { consultar, requireEvento } from "@/lib/dal";
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
  const ctx = await requireEvento();
  let linha: { pronto: boolean; atualizado_em: string } | undefined;
  try {
    const { rows } = await consultar(ctx, (trx) =>
      sql<{ pronto: boolean; atualizado_em: string }>`
        select pronto, atualizado_em
          from salvar_votos(${ctx.evento.id}::uuid, ${texto}, ${typeof pronto === "boolean" ? pronto : null}::boolean)
      `.execute(trx),
    );
    linha = rows[0];
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e, "Não foi possível salvar. Tente de novo.") };
  }
  if (!linha) return { ok: false, erro: "Não foi possível salvar. Tente de novo." };
  // "pronto" conclui/reabre a tarefa e muda o painel: atualiza a tela. O autosave não precisa.
  if (typeof pronto === "boolean") refresh();
  return { ok: true, pronto: linha.pronto, atualizadoEm: linha.atualizado_em };
}
