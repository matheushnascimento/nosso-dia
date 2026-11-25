import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cartao, Esqueleto, Selecao, Titulo, cx } from "@/components/ui";
import { getMembros, requireEvento } from "@/lib/dal";
import { hojeSP } from "@/lib/datas";
import { CATEGORIAS, GRUPOS } from "@/lib/rotulos";
import type { Tarefa } from "@/lib/tarefas";
import { listarTarefas } from "@/lib/tarefas";
import { FormNovaTarefa } from "./form-tarefa";
import { ItemTarefa } from "./item-tarefa";

export const metadata: Metadata = { title: "Tarefas" };

type Filtros = { categoria: string; responsavel: string; status: string };

function lerFiltros(sp: Record<string, string | string[] | undefined>): Filtros {
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  return {
    categoria: um(sp.categoria),
    responsavel: um(sp.responsavel), // "" | "eu" | "outro" | "ambos"
    status: um(sp.status) || "todas", // "todas" | "pendentes" | "concluidas"
  };
}

export default function Tarefas({ searchParams }: PageProps<"/tarefas">) {
  return (
    <div className="flex flex-col gap-6">
      <Titulo>Tarefas</Titulo>
      <Suspense fallback={<Esqueleto className="h-[28rem]" />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/tarefas">["searchParams"] }) {
  const ctx = await requireEvento();
  const [todas, membros, sp] = await Promise.all([listarTarefas(ctx), getMembros(ctx), searchParams]);
  const filtros = lerFiltros(sp);
  const hoje = hojeSP();

  const filtradas = todas.filter((t) => {
    if (filtros.categoria && t.categoria !== filtros.categoria) return false;
    if (filtros.status === "pendentes" && t.status !== "pendente") return false;
    if (filtros.status === "concluidas" && t.status !== "concluida") return false;
    if (filtros.responsavel === "eu" && t.responsavel !== ctx.userId) return false;
    if (filtros.responsavel === "outro" && (!t.responsavel || t.responsavel === ctx.userId)) return false;
    if (filtros.responsavel === "ambos" && t.responsavel) return false;
    return true;
  });

  const porGrupo = new Map<string, Tarefa[]>();
  for (const t of filtradas) porGrupo.set(t.grupo, [...(porGrupo.get(t.grupo) ?? []), t]);
  const filtrando = Boolean(filtros.categoria || filtros.responsavel || filtros.status !== "todas");
  const categoriasUsadas = [...new Set(todas.map((t) => t.categoria))].sort((a, b) =>
    (CATEGORIAS[a] ?? a).localeCompare(CATEGORIAS[b] ?? b, "pt-BR"),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-4">
        <form className="flex flex-wrap items-end gap-2" aria-label="Filtros">
          <Selecao name="categoria" defaultValue={filtros.categoria} aria-label="Categoria" className="w-auto">
            <option value="">Todas as categorias</option>
            {categoriasUsadas.map((c) => (
              <option key={c} value={c}>
                {CATEGORIAS[c] ?? c}
              </option>
            ))}
          </Selecao>
          <Selecao name="responsavel" defaultValue={filtros.responsavel} aria-label="Responsável" className="w-auto">
            <option value="">Qualquer responsável</option>
            <option value="eu">Minhas</option>
            {membros.length > 1 && <option value="outro">Do meu amor</option>}
            <option value="ambos">Dos dois</option>
          </Selecao>
          <Selecao name="status" defaultValue={filtros.status} aria-label="Situação" className="w-auto">
            <option value="todas">Todas</option>
            <option value="pendentes">Pendentes</option>
            <option value="concluidas">Concluídas</option>
          </Selecao>
          <button className="rounded-full border border-linha bg-cartao px-4 py-2.5 text-sm hover:border-tinta/40">Filtrar</button>
          {filtrando && (
            <Link href="/tarefas" className="px-2 py-2.5 text-sm text-tinta-suave hover:text-tinta">
              Limpar
            </Link>
          )}
        </form>

        {filtradas.length === 0 && (
          <Cartao>
            <p className="py-6 text-center text-tinta-suave">Nenhuma tarefa com esses filtros.</p>
          </Cartao>
        )}

        {GRUPOS.map((g) => {
          const lista = porGrupo.get(g.id);
          if (!lista?.length) return null;
          const conteudo = (
            <ul className="divide-y divide-linha">
              {lista.map((t) => (
                <ItemTarefa key={t.id} tarefa={t} membros={membros} hoje={hoje} />
              ))}
            </ul>
          );
          const cabecalho = (
            <span className="flex items-baseline gap-2">
              <span className={cx("font-serif text-xl", g.tom === "alerta" && "text-alerta", g.tom === "destaque" && "text-rose")}>
                {g.titulo}
              </span>
              <span className="text-sm text-tinta-suave">{lista.length}</span>
            </span>
          );
          return (
            <Cartao key={g.id} className="py-4 sm:py-5">
              {g.id === "concluidas" && filtros.status !== "concluidas" ? (
                <details>
                  <summary className="cursor-pointer">{cabecalho}</summary>
                  {conteudo}
                </details>
              ) : (
                <>
                  {cabecalho}
                  {g.id === "comecar_agora" && (
                    <p className="mt-1 text-sm text-tinta-suave">
                      O ideal era já ter feito, mas ainda dá tempo. Comecem por aqui.
                    </p>
                  )}
                  {conteudo}
                </>
              )}
            </Cartao>
          );
        })}
      </div>

      <aside>
        <Cartao className="lg:sticky lg:top-6">
          <p className="mb-4 font-serif text-xl">Nova tarefa</p>
          <FormNovaTarefa membros={membros} temData={Boolean(ctx.evento.data)} />
        </Cartao>
      </aside>
    </div>
  );
}
