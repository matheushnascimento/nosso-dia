"use server";

import { refresh } from "next/cache";
import { consultar, requireEvento } from "@/lib/dal";
import type { Trx } from "@/lib/db";
import { mensagemDeErro, type EstadoForm } from "@/lib/erros";
import { parseBRL, texto } from "@/lib/formato";
import {
  CATEGORIAS_ORCAMENTO,
  distribuir,
  ehCategoriaOrcamento,
  type CategoriaOrcamento,
  type Prioridade,
  type Prioridades,
} from "@/lib/orcamento";

/**
 * Toda action reautentica pela DAL e roda como o usuário (RLS valendo), sempre no casamento dele.
 * A distribuição é calculada aqui (src/lib/orcamento.ts) e gravada numa transação só.
 */

const LIMITE = 100_000_000_000; // R$ 1 bilhão, o mesmo check do banco

/** Campos p1, p2 e p3 do formulário: categorias diferentes, sem a reserva. */
function lerPrioridades(fd: FormData): Prioridades | { erro: string } {
  const prioridades: Prioridades = {};
  const usadas = new Set<string>();
  for (const p of [1, 2, 3] as Prioridade[]) {
    const c = texto(fd, `p${p}`);
    if (!c) continue;
    if (!ehCategoriaOrcamento(c) || c === "reserva") return { erro: "Escolha prioridades da lista." };
    if (usadas.has(c)) return { erro: "Cada categoria só pode aparecer em uma prioridade." };
    usadas.add(c);
    prioridades[p] = c;
  }
  return prioridades;
}

/** Grava a distribuição sugerida de `total` com as prioridades, substituindo os valores de todas as categorias. */
async function gravarDistribuicao(trx: Trx, eventoId: string, total: number, prioridades: Prioridades) {
  const valores = distribuir(total, prioridades);
  const prioridadeDe = new Map(Object.entries(prioridades).map(([p, c]) => [c, Number(p)]));
  // Limpa as prioridades antes: trocar a 1 com a 2 numa linha só esbarraria no "cada prioridade uma vez".
  await trx.updateTable("orcamento_categorias").set({ prioridade: null }).where("evento_id", "=", eventoId).execute();
  await trx
    .insertInto("orcamento_categorias")
    .values(
      (Object.keys(CATEGORIAS_ORCAMENTO) as CategoriaOrcamento[]).map((categoria) => ({
        evento_id: eventoId,
        categoria,
        planejado_centavos: valores[categoria],
        prioridade: prioridadeDe.get(categoria) ?? null,
      })),
    )
    .onConflict((oc) =>
      oc.columns(["evento_id", "categoria"]).doUpdateSet((eb) => ({
        planejado_centavos: eb.ref("excluded.planejado_centavos"),
        prioridade: eb.ref("excluded.prioridade"),
      })),
    )
    .execute();
}

export async function distribuirOrcamento(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await requireEvento();
  const total = ctx.evento.orcamento_total_centavos;
  if (total === null) return { erro: "Defina o orçamento total antes de distribuir." };
  const prioridades = lerPrioridades(fd);
  if ("erro" in prioridades) return { erro: prioridades.erro };

  try {
    await consultar(ctx, (trx) => gravarDistribuicao(trx, ctx.evento.id, total, prioridades));
  } catch (e) {
    return { erro: mensagemDeErro(e, "Não foi possível distribuir o orçamento.") };
  }
  refresh();
  return { ok: "Orçamento distribuído pela sugestão." };
}

/** Valores à mão: um campo `planejado_<categoria>` por categoria. Mantém as prioridades. */
export async function salvarPlanejados(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await requireEvento();
  const linhas: { categoria: CategoriaOrcamento; planejado_centavos: number }[] = [];
  for (const [categoria, rotulo] of Object.entries(CATEGORIAS_ORCAMENTO) as [CategoriaOrcamento, string][]) {
    const v = parseBRL(texto(fd, `planejado_${categoria}`));
    if (Number.isNaN(v)) return { erro: `Não entendemos o valor de ${rotulo}. Ex.: 6.750 ou 6.750,50` };
    if (v !== null && v > LIMITE) return { erro: `O valor de ${rotulo} passou do limite.` };
    linhas.push({ categoria, planejado_centavos: v ?? 0 });
  }

  try {
    await consultar(ctx, (trx) =>
      trx
        .insertInto("orcamento_categorias")
        .values(linhas.map((l) => ({ evento_id: ctx.evento.id, ...l })))
        .onConflict((oc) =>
          oc.columns(["evento_id", "categoria"]).doUpdateSet((eb) => ({
            planejado_centavos: eb.ref("excluded.planejado_centavos"),
          })),
        )
        .execute(),
    );
  } catch (e) {
    return { erro: mensagemDeErro(e, "Não foi possível salvar os valores.") };
  }
  refresh();
  return { ok: "Valores salvos." };
}

/**
 * Novo total. Se já existe distribuição, `modo` diz o que fazer com ela:
 * "redistribuir" (pela sugestão, com as prioridades atuais) ou "manter" (valores à mão continuam).
 */
export async function alterarTotal(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await requireEvento();
  const total = parseBRL(texto(fd, "total"));
  if (total === null) return { erro: "Informe o orçamento total.", campos: { total: texto(fd, "total") } };
  if (Number.isNaN(total) || total > LIMITE) {
    return { erro: "Não entendemos o valor. Ex.: 45.000", campos: { total: texto(fd, "total") } };
  }
  const modo = texto(fd, "modo");
  if (modo !== "redistribuir" && modo !== "manter" && modo !== "") return { erro: "Escolha o que fazer com a distribuição." };

  try {
    await consultar(ctx, async (trx) => {
      await trx.updateTable("eventos").set({ orcamento_total_centavos: total }).where("id", "=", ctx.evento.id).execute();
      if (modo !== "redistribuir") return;
      const atuais = await trx
        .selectFrom("orcamento_categorias")
        .select(["categoria", "prioridade"])
        .where("evento_id", "=", ctx.evento.id)
        .where("prioridade", "is not", null)
        .execute();
      const prioridades: Prioridades = {};
      for (const a of atuais) if (ehCategoriaOrcamento(a.categoria)) prioridades[a.prioridade as Prioridade] = a.categoria;
      await gravarDistribuicao(trx, ctx.evento.id, total, prioridades);
    });
  } catch (e) {
    return { erro: mensagemDeErro(e, "Não foi possível alterar o total.") };
  }
  refresh();
  return { ok: modo === "redistribuir" ? "Total alterado e orçamento redistribuído." : "Total alterado." };
}
