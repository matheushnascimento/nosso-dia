import "server-only";
import { consultar, type ContextoComEvento } from "@/lib/dal";

export type OpcaoPacote = { codigo: string; nome: string; descricao: string | null; ativo: boolean };
export type GrupoEscolha = { grupo: string; opcoes: OpcaoPacote[]; escolhido: string | null };
export type PacotesDoEvento = { ativos: { codigo: string; nome: string }[]; escolhas: GrupoEscolha[] };

/** Pacotes ativos no casamento e os grupos de escolha disponíveis. */
export async function listarPacotes(ctx: ContextoComEvento): Promise<PacotesDoEvento> {
  const { catalogo, ativos } = await consultar(ctx, async (trx) => ({
    catalogo: await trx
      .selectFrom("pacotes")
      .select(["codigo", "nome", "descricao", "grupo_escolha", "ordem"])
      .orderBy("ordem")
      .execute(),
    ativos: await trx.selectFrom("evento_pacotes").select("pacote").where("evento_id", "=", ctx.evento.id).execute(),
  }));

  const ativosSet = new Set(ativos.map((a) => a.pacote));
  const grupos = new Map<string, GrupoEscolha>();

  for (const p of catalogo ?? []) {
    if (!p.grupo_escolha) continue;
    const g = grupos.get(p.grupo_escolha) ?? { grupo: p.grupo_escolha, opcoes: [], escolhido: null };
    const ativo = ativosSet.has(p.codigo);
    g.opcoes.push({ codigo: p.codigo, nome: p.nome, descricao: p.descricao, ativo });
    if (ativo) g.escolhido = p.codigo;
    grupos.set(p.grupo_escolha, g);
  }

  return {
    ativos: catalogo.filter((p) => ativosSet.has(p.codigo)).map((p) => ({ codigo: p.codigo, nome: p.nome })),
    escolhas: [...grupos.values()],
  };
}
