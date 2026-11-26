import Link from "next/link";
import { cx } from "@/components/ui";
import type { Subitem } from "@/lib/tarefas";
import { adicionarSubitem, alternarSubitem, excluirSubitem } from "./actions";

/** Lista de itens de uma tarefa. Server Component: tudo são forms (funciona sem JS). */
export function ListaSubitens({ tarefaId, subitens }: { tarefaId: string; subitens: Subitem[] }) {
  return (
    <div className="mt-2 rounded-xl bg-papel/70 p-3">
      {subitens.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1">
          {subitens.map((s) => (
            <li key={s.id} className="group/item flex items-center gap-2 text-sm">
              <form action={alternarSubitem} className="flex">
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="feito" value={s.feito ? "0" : "1"} />
                <button
                  aria-label={s.feito ? `Desmarcar “${s.texto}”` : `Marcar “${s.texto}”`}
                  className={cx(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition",
                    s.feito ? "border-salvia bg-salvia text-white" : "border-tinta/30 bg-cartao hover:border-salvia",
                  )}
                >
                  {s.feito && (
                    <svg viewBox="0 0 16 16" className="size-2.5" aria-hidden>
                      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    </svg>
                  )}
                </button>
              </form>
              <span className={cx("flex-1", s.feito && "text-tinta-suave line-through")}>
                {s.texto}
                {s.link && (
                  <Link href={s.link} className="ml-2 text-xs text-rose no-underline hover:underline">
                    abrir →
                  </Link>
                )}
              </span>
              <form action={excluirSubitem} className="flex">
                <input type="hidden" name="id" value={s.id} />
                <button
                  aria-label={`Remover “${s.texto}”`}
                  className="rounded px-1 text-tinta-suave opacity-60 hover:text-alerta hover:opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 sm:focus:opacity-100"
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={adicionarSubitem} className="flex gap-2">
        <input type="hidden" name="tarefa_id" value={tarefaId} />
        <input
          name="texto"
          required
          maxLength={200}
          placeholder="Adicionar item"
          aria-label="Novo item"
          className="w-full rounded-lg border border-linha bg-cartao px-2.5 py-1.5 text-sm placeholder:text-tinta-suave/70 focus:border-rose focus:outline-none"
        />
        <button className="rounded-lg px-2.5 text-sm text-tinta-suave hover:bg-linha/50 hover:text-tinta">Adicionar</button>
      </form>
    </div>
  );
}
