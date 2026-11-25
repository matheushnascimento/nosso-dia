import { Selo, cx } from "@/components/ui";
import type { Membro } from "@/lib/dal";
import { dataCurta, diasEntre } from "@/lib/datas";
import { rotuloCategoria } from "@/lib/rotulos";
import type { Tarefa } from "@/lib/tarefas";
import { alternarTarefa, excluirTarefa } from "./actions";
import { FormEditarTarefa } from "./form-tarefa";

function rotuloPrazo(t: Tarefa, hoje: string) {
  if (!t.prazo) return null;
  const dias = diasEntre(hoje, t.prazo);
  const quando = dias === 0 ? "hoje" : dias === 1 ? "amanhã" : dataCurta(t.prazo, hoje);
  return `${t.aproximado ? "≈ " : ""}${quando}`;
}

/** Linha de tarefa. Server Component: concluir e excluir são forms simples (funcionam sem JS). */
export function ItemTarefa({
  tarefa: t,
  membros,
  hoje,
  compacto = false,
}: {
  tarefa: Tarefa;
  membros: Membro[];
  hoje: string;
  compacto?: boolean;
}) {
  const concluida = t.status === "concluida";
  const prazo = rotuloPrazo(t, hoje);
  const responsavel = membros.find((m) => m.usuarioId === t.responsavel);
  const quemConcluiu = membros.find((m) => m.usuarioId === t.concluidaPor);

  return (
    <li className="group py-3">
      <div className="flex items-start gap-3">
        <form action={alternarTarefa}>
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="concluir" value={concluida ? "0" : "1"} />
          <button
            aria-label={concluida ? `Desmarcar “${t.titulo}”` : `Concluir “${t.titulo}”`}
            className={cx(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition",
              concluida ? "border-salvia bg-salvia text-white" : "border-tinta/30 hover:border-salvia hover:bg-salvia-claro",
            )}
          >
            {concluida && (
              <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
                <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          </button>
        </form>

        <div className="min-w-0 flex-1">
          <p className={cx("leading-snug", concluida && "text-tinta-suave line-through")}>{t.titulo}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {prazo && (
              <Selo
                tom={t.grupo === "atrasadas" ? "alerta" : t.grupo === "comecar_agora" ? "rose" : "neutro"}
                title={t.travado ? "Prazo fixo: não muda com a data do casamento" : undefined}
              >
                {t.travado && <span aria-label="prazo fixo">🔒</span>}
                {prazo}
              </Selo>
            )}
            {!compacto && <Selo>{rotuloCategoria(t.categoria)}</Selo>}
            {responsavel && <Selo tom="salvia">{responsavel.souEu ? "Você" : responsavel.nome}</Selo>}
            {concluida && quemConcluiu && !compacto && (
              <span className="text-xs text-tinta-suave">por {quemConcluiu.souEu ? "você" : quemConcluiu.nome}</span>
            )}
          </div>
          {!compacto && t.descricao && <p className="mt-1.5 text-sm text-tinta-suave">{t.descricao}</p>}
        </div>

        {!compacto && (
          <details className="relative">
            <summary className="cursor-pointer rounded-full px-2 py-1 text-sm text-tinta-suave hover:bg-linha/50 hover:text-tinta">
              Editar
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-linha bg-cartao p-4 shadow-lg">
              <FormEditarTarefa tarefa={t} membros={membros} />
              <form action={excluirTarefa} className="mt-3 border-t border-linha pt-3">
                <input type="hidden" name="id" value={t.id} />
                <button className="text-sm text-alerta hover:underline">Excluir tarefa</button>
              </form>
            </div>
          </details>
        )}
      </div>
    </li>
  );
}
