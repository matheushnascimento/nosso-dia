import "server-only";
import { consultar, type ContextoComEvento } from "@/lib/dal";
import {
  CATEGORIAS_ORCAMENTO,
  ehCategoriaOrcamento,
  type CategoriaOrcamento,
  type Prioridade,
  type Prioridades,
} from "@/lib/orcamento";

export type LinhaOrcamento = {
  categoria: CategoriaOrcamento;
  rotulo: string;
  planejado: number;
  prioridade: Prioridade | null;
  /** Soma dos fornecedores `contratado` da categoria. */
  contratado: number;
  /** planejado − contratado (negativo = passou do planejado). */
  restante: number;
  fornecedores: number;
};

export type Orcamento = {
  total: number | null;
  /** Já existe distribuição gravada (alguma linha em orcamento_categorias). */
  distribuido: boolean;
  linhas: LinhaOrcamento[];
  somaPlanejado: number;
  contratado: number;
  /** total − contratado (null sem total). */
  restante: number | null;
  prioridades: Prioridades;
  /** "Fornecedores: X de Y categorias contratadas". */
  categoriasContratadas: number;
  categoriasComOrcamento: number;
};

export async function carregarOrcamento(ctx: ContextoComEvento): Promise<Orcamento> {
  const { planejados, contratos } = await consultar(ctx, async (trx) => ({
    planejados: await trx
      .selectFrom("orcamento_categorias")
      .select(["categoria", "planejado_centavos", "prioridade"])
      .where("evento_id", "=", ctx.evento.id)
      .execute(),
    contratos: await trx
      .selectFrom("fornecedores")
      .select(["categoria", "status", "valor_contratado_centavos"])
      .where("evento_id", "=", ctx.evento.id)
      .execute(),
  }));

  const porCategoria = new Map(planejados.map((p) => [p.categoria, p]));
  const linhas: LinhaOrcamento[] = (Object.keys(CATEGORIAS_ORCAMENTO) as CategoriaOrcamento[]).map((categoria) => {
    const daCategoria = contratos.filter((f) => f.categoria === categoria);
    const contratado = daCategoria
      .filter((f) => f.status === "contratado")
      .reduce((s, f) => s + (f.valor_contratado_centavos ?? 0), 0);
    const p = porCategoria.get(categoria);
    const planejado = p?.planejado_centavos ?? 0;
    return {
      categoria,
      rotulo: CATEGORIAS_ORCAMENTO[categoria],
      planejado,
      prioridade: (p?.prioridade ?? null) as Prioridade | null,
      contratado,
      restante: planejado - contratado,
      fornecedores: daCategoria.filter((f) => f.status !== "descartado").length,
    };
  });

  const total = ctx.evento.orcamento_total_centavos;
  const contratado = linhas.reduce((s, l) => s + l.contratado, 0);
  const prioridades: Prioridades = {};
  for (const l of linhas) if (l.prioridade) prioridades[l.prioridade] = l.categoria;

  // Y: categorias com valor planejado (sem a reserva); sem distribuição, as que têm fornecedor.
  const relevantes = linhas.filter((l) =>
    l.categoria !== "reserva" && (planejados.length ? l.planejado > 0 || l.contratado > 0 : l.fornecedores > 0),
  );

  return {
    total,
    distribuido: planejados.some((p) => ehCategoriaOrcamento(p.categoria)),
    linhas,
    somaPlanejado: linhas.reduce((s, l) => s + l.planejado, 0),
    contratado,
    restante: total === null ? null : total - contratado,
    prioridades,
    categoriasContratadas: relevantes.filter((l) => l.contratado > 0).length,
    categoriasComOrcamento: relevantes.length,
  };
}
