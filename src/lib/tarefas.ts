import "server-only";
import type { ContextoComEvento } from "@/lib/dal";
import type { Views } from "@/lib/database.types";
import { ORDEM_GRUPO } from "@/lib/rotulos";

/** Linha da view com os campos que o front usa, já sem os nulos da view. */
export type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string;
  status: "pendente" | "concluida";
  responsavel: string | null;
  concluidaPor: string | null;
  offsetDias: number | null;
  prazoFixo: string | null;
  prazo: string | null;
  travado: boolean;
  aproximado: boolean;
  grupo: string;
  ordem: number;
  pacote: string | null;
  guia: string | null;
  subitensTotal: number;
  subitensFeitos: number;
};

export type Subitem = { id: string; tarefaId: string; texto: string; feito: boolean; doModelo: boolean };

function normalizar(t: Views<"tarefas_com_prazo">): Tarefa {
  return {
    id: t.id!,
    titulo: t.titulo ?? "",
    descricao: t.descricao,
    categoria: t.categoria ?? "outros",
    status: t.status ?? "pendente",
    responsavel: t.responsavel,
    concluidaPor: t.concluida_por,
    offsetDias: t.offset_dias,
    prazoFixo: t.prazo_fixo,
    prazo: t.prazo_efetivo,
    travado: Boolean(t.prazo_travado),
    aproximado: Boolean(t.prazo_aproximado),
    grupo: t.grupo ?? "sem_prazo",
    ordem: t.ordem ?? 0,
    pacote: t.pacote,
    guia: t.guia,
    subitensTotal: t.subitens_total ?? 0,
    subitensFeitos: t.subitens_feitos ?? 0,
  };
}

/** Ordem de exibição: grupo, depois prazo (sem prazo por último), depois ordem do catálogo. */
export function compararTarefas(a: Tarefa, b: Tarefa): number {
  const g = (ORDEM_GRUPO[a.grupo] ?? 99) - (ORDEM_GRUPO[b.grupo] ?? 99);
  if (g !== 0) return g;
  if (a.prazo !== b.prazo) {
    if (!a.prazo) return 1;
    if (!b.prazo) return -1;
    return a.prazo < b.prazo ? -1 : 1;
  }
  return a.ordem - b.ordem;
}

export async function listarTarefas(ctx: ContextoComEvento): Promise<Tarefa[]> {
  const { data, error } = await ctx.supabase
    .from("tarefas_com_prazo")
    .select("*")
    .eq("evento_id", ctx.evento.id);
  if (error) throw new Error(`Erro ao carregar tarefas: ${error.message}`);
  return (data ?? []).map(normalizar).sort(compararTarefas);
}

/** Subitens das tarefas informadas, agrupados por tarefa e em ordem. */
export async function listarSubitens(
  ctx: ContextoComEvento,
  tarefaIds: string[],
): Promise<Map<string, Subitem[]>> {
  const mapa = new Map<string, Subitem[]>();
  if (!tarefaIds.length) return mapa;
  const { data, error } = await ctx.supabase
    .from("tarefa_subitens")
    .select("id, tarefa_id, texto, feito, modelo_subitem_id")
    .in("tarefa_id", tarefaIds)
    .order("ordem")
    .order("criado_em");
  if (error) throw new Error(`Erro ao carregar itens: ${error.message}`);
  for (const s of data ?? []) {
    const lista = mapa.get(s.tarefa_id) ?? [];
    lista.push({ id: s.id, tarefaId: s.tarefa_id, texto: s.texto, feito: s.feito, doModelo: Boolean(s.modelo_subitem_id) });
    mapa.set(s.tarefa_id, lista);
  }
  return mapa;
}
