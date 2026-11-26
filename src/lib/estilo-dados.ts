import "server-only";
import { consultar, type ContextoComEvento } from "@/lib/dal";
import { respostasDasTags, type Grupo, type Respostas } from "@/lib/estilo";
import type { CategoriaFornecedor } from "@/lib/rotulos";

export type OpcaoEstilo = { codigo: string; nome: string; descricao: string | null };

export type Estilo = {
  /** Opções de cada pergunta, do catálogo `tags`. */
  opcoes: Record<Grupo, OpcaoEstilo[]>;
  respostas: Respostas;
  /** Já respondeu alguma vez (o casamento tem alguma tag do questionário). */
  respondido: boolean;
};

export async function carregarEstilo(ctx: ContextoComEvento): Promise<Estilo> {
  const { catalogo, minhas } = await consultar(ctx, async (trx) => ({
    catalogo: await trx
      .selectFrom("tags")
      .select(["codigo", "nome", "descricao", "grupo"])
      .where("ativo", "=", true)
      .where("grupo", "is not", null)
      .orderBy("ordem")
      .execute(),
    minhas: await trx.selectFrom("evento_tags").select("tag").where("evento_id", "=", ctx.evento.id).execute(),
  }));
  const opcoes: Record<Grupo, OpcaoEstilo[]> = { formato: [], periodo: [], ambiente: [], estilo: [] };
  for (const t of catalogo) opcoes[t.grupo as Grupo]?.push({ codigo: t.codigo, nome: t.nome, descricao: t.descricao });
  const grupoDe = Object.fromEntries(catalogo.map((t) => [t.codigo, t.grupo]));
  const tags = minhas.map((m) => m.tag);
  return { opcoes, respostas: respostasDasTags(tags, grupoDe), respondido: tags.some((t) => grupoDe[t]) };
}

export type Referencia = { id: string; categoria: CategoriaFornecedor; url: string; nota: string | null };

export async function listarReferencias(ctx: ContextoComEvento): Promise<Referencia[]> {
  const linhas = await consultar(ctx, (trx) =>
    trx
      .selectFrom("referencias")
      .select(["id", "categoria", "url", "nota"])
      .where("evento_id", "=", ctx.evento.id)
      .orderBy("criado_em")
      .execute(),
  );
  return linhas.map((l) => ({ ...l, categoria: l.categoria as CategoriaFornecedor }));
}
