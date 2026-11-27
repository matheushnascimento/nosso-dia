"use server";

import { refresh } from "next/cache";
import { ehLado, rotulosLado } from "@/lib/convidados";
import { listarConvites } from "@/lib/convidados-dados";
import { consultar, getMembros, requireEvento } from "@/lib/dal";
import { mensagemDeErro } from "@/lib/erros";
import { pluralizar, texto } from "@/lib/formato";
import {
  LIMITE_BYTES,
  LIMITE_LINHAS,
  LISTA_CAMPOS,
  agrupar,
  interpretar,
  lerCsv,
  type Mapeamento,
  type Pessoa,
} from "@/lib/importar-convidados";

export type EstadoImportacao = { erro?: string; ok?: string; importadas?: number };

/** O mapeamento vem do navegador: só aceita campos conhecidos e colunas que existem. */
function lerMapa(bruto: string, colunas: number): Mapeamento | null {
  let obj: unknown;
  try {
    obj = JSON.parse(bruto);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const mapa = Object.fromEntries(LISTA_CAMPOS.map((c) => [c, null])) as Mapeamento;
  const usadas = new Set<number>();
  for (const campo of LISTA_CAMPOS) {
    const v = (obj as Record<string, unknown>)[campo];
    if (v === null || v === undefined) continue;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v >= colunas || usadas.has(v)) return null;
    mapa[campo] = v;
    usadas.add(v);
  }
  return mapa;
}

/**
 * Refaz tudo no servidor a partir do texto da planilha (a prévia do navegador é só prévia): lê, valida, marca
 * repetidos contra a lista atual e grava numa transação. Repetidos só entram se o casal marcou a linha.
 */
export async function importarConvidados(_: EstadoImportacao, fd: FormData): Promise<EstadoImportacao> {
  const ctx = await requireEvento();
  const csv = String(fd.get("csv") ?? "");
  if (!csv.trim()) return { erro: "Escolha um arquivo ou cole a planilha." };
  if (new TextEncoder().encode(csv).length > LIMITE_BYTES) return { erro: "A planilha passou de 500 KB." };
  const linhas = lerCsv(csv);
  const temCabecalho = texto(fd, "cabecalho") === "1";
  if (linhas.length - (temCabecalho ? 1 : 0) > LIMITE_LINHAS) {
    return { erro: `Dá para importar até ${LIMITE_LINHAS} pessoas de uma vez.` };
  }
  const colunas = Math.max(0, ...linhas.map((l) => l.length));
  const mapa = lerMapa(texto(fd, "mapa"), colunas);
  if (!mapa) return { erro: "Não entendemos as colunas escolhidas. Recarregue a página e tente de novo." };
  if (mapa.nome === null) return { erro: "Escolha a coluna com o nome." };
  const ladoPadrao = texto(fd, "lado_padrao");
  if (!ehLado(ladoPadrao)) return { erro: "Escolha de quem são os convidados sem essa informação." };
  const forcar = new Set(fd.getAll("forcar").map((v) => Number(v)));

  const [convites, membros] = await Promise.all([listarConvites(ctx), getMembros(ctx)]);
  const lados = rotulosLado(membros);
  const resultado = interpretar(linhas, {
    mapa,
    temCabecalho,
    contexto: { nomesLado: { a: lados.a, b: lados.b }, ladoPadrao },
    existentes: convites.flatMap((c) => c.pessoas),
  });
  const escolhidas: Pessoa[] = resultado.flatMap((l) => (l.pessoa && (!l.duplicado || forcar.has(l.numero)) ? [l.pessoa] : []));
  const puladas = resultado.filter((l) => l.pessoa && l.duplicado && !forcar.has(l.numero)).length;
  const comErro = resultado.filter((l) => !l.pessoa).length;
  if (!escolhidas.length) return { erro: "Nenhuma pessoa nova para importar." };

  const { novos, emExistentes } = agrupar(escolhidas, convites);
  const linhaPessoa = (p: Pessoa, conviteId: string, ordem: number) => ({
    evento_id: ctx.evento.id,
    convite_id: conviteId,
    nome: p.nome,
    faixa: p.faixa,
    idade: p.idade,
    confirmacao: p.confirmacao,
    telefone: p.telefone,
    email: p.email,
    restricao_alimentar: p.restricao,
    observacao: p.observacao,
    ordem,
  });

  try {
    await consultar(ctx, async (trx) => {
      const pessoas: ReturnType<typeof linhaPessoa>[] = [];
      if (novos.length) {
        const ids = await trx
          .insertInto("convites_familia")
          .values(novos.map((c) => ({ evento_id: ctx.evento.id, nome: c.nome, lado: c.lado, grupo: c.grupo })))
          .returning("id")
          .execute();
        novos.forEach((c, i) => c.pessoas.forEach((p, j) => pessoas.push(linhaPessoa(p, ids[i].id, j + 1))));
      }
      for (const [conviteId, lista] of emExistentes) {
        const ja = convites.find((c) => c.id === conviteId)?.pessoas.length ?? 0;
        lista.forEach((p, j) => pessoas.push(linhaPessoa(p, conviteId, ja + j + 1)));
      }
      // em lotes, para não passar do limite de parâmetros do Postgres
      for (let i = 0; i < pessoas.length; i += 500) {
        await trx.insertInto("pessoas").values(pessoas.slice(i, i + 500)).execute();
      }
    });
  } catch (e) {
    return { erro: mensagemDeErro(e, "Não foi possível importar. Nada foi gravado.") };
  }
  refresh();
  const partes = [`${pluralizar(escolhidas.length, "pessoa importada", "pessoas importadas")}`];
  if (novos.length) partes.push(`${pluralizar(novos.length, "convite novo", "convites novos")}`);
  if (puladas) partes.push(`${pluralizar(puladas, "repetida pulada", "repetidas puladas")}`);
  if (comErro) partes.push(`${pluralizar(comErro, "linha com erro ficou de fora", "linhas com erro ficaram de fora")}`);
  return { ok: `${partes.join(" · ")}.`, importadas: escolhidas.length };
}
