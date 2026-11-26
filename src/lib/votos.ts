import "server-only";
import { sql } from "kysely";
import { consultar, type ContextoComEvento, type Membro } from "@/lib/dal";

export const LIMITE_VOTOS = 10_000;
/** Ritmo de fala para estimar o tempo de leitura em voz alta. */
export const PALAVRAS_POR_MINUTO = 130;

export type MeusVotos = { texto: string; pronto: boolean; atualizadoEm: string | null };
export type SituacaoVotos = "nao_comecou" | "rascunho" | "prontos";
export type StatusVotos = { membro: Membro; situacao: SituacaoVotos };

/** Os votos de quem está logado. O RLS só devolve a linha do próprio autor. */
export async function meusVotos(ctx: ContextoComEvento): Promise<MeusVotos> {
  const data = await consultar(ctx, (trx) =>
    trx
      .selectFrom("votos")
      .select(["texto", "pronto", "atualizado_em"])
      .where("evento_id", "=", ctx.evento.id)
      .where("autor_id", "=", ctx.userId)
      .executeTakeFirst(),
  );
  return { texto: data?.texto ?? "", pronto: data?.pronto ?? false, atualizadoEm: data?.atualizado_em ?? null };
}

/** Situação dos votos de cada membro, sem o texto (RPC status_votos). */
export async function statusVotos(ctx: ContextoComEvento, membros: Membro[]): Promise<StatusVotos[]> {
  const { rows } = await consultar(ctx, (trx) =>
    sql<{ autor_id: string; pronto: boolean; comecou: boolean }>`
      select autor_id, pronto, comecou from status_votos(${ctx.evento.id})
    `.execute(trx),
  );
  return membros.map((membro) => {
    const s = rows.find((d) => d.autor_id === membro.usuarioId);
    const situacao: SituacaoVotos = s?.pronto ? "prontos" : s?.comecou ? "rascunho" : "nao_comecou";
    return { membro, situacao };
  });
}

export const ROTULO_SITUACAO: Record<SituacaoVotos, string> = {
  nao_comecou: "não começou",
  rascunho: "rascunho",
  prontos: "prontos ✓",
};
