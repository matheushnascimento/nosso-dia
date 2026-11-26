import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ItemTarefa } from "@/app/(app)/tarefas/item-tarefa";
import { EscolhaPacote } from "@/components/escolha-pacote";
import { BotaoLink, Cartao, Esqueleto, Subtitulo } from "@/components/ui";
import { getMembros, requireEvento } from "@/lib/dal";
import { dataPorExtenso, diasEntre, hojeSP, horario, mesPorExtenso } from "@/lib/datas";
import { formatarBRL, pluralizar } from "@/lib/formato";
import { listarPacotes } from "@/lib/pacotes";
import { rotuloGrupoEscolha } from "@/lib/rotulos";
import { listarTarefas } from "@/lib/tarefas";
import { ROTULO_SITUACAO, statusVotos } from "@/lib/votos";

export const metadata: Metadata = { title: "Painel" };

export default function Painel({ searchParams }: PageProps<"/painel">) {
  return (
    <Suspense fallback={<EsqueletoPainel />}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}

function EsqueletoPainel() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Esqueleto className="h-48 md:col-span-3" />
      <Esqueleto className="h-32" />
      <Esqueleto className="h-32" />
      <Esqueleto className="h-32" />
    </div>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/painel">["searchParams"] }) {
  const ctx = await requireEvento();
  const [tarefas, membros, pacotes, params] = await Promise.all([
    listarTarefas(ctx),
    getMembros(ctx),
    listarPacotes(ctx),
    searchParams,
  ]);
  const votos = await statusVotos(ctx, membros);
  // Decisões pendentes que destravam checklists (ex.: tipo de cerimônia)
  const decisoes = pacotes.escolhas.filter((g) => !g.escolhido);
  const { evento } = ctx;
  const hoje = hojeSP();

  const total = tarefas.length;
  const concluidas = tarefas.filter((t) => t.status === "concluida").length;
  const progresso = total ? Math.round((concluidas / total) * 100) : 0;
  const proximas = tarefas.filter((t) => t.status === "pendente").slice(0, 5);
  const atrasadas = tarefas.filter((t) => t.grupo === "atrasadas").length;
  const faltam = evento.data ? diasEntre(hoje, evento.data) : null;
  const boasVindas = params["bem-vindos"] === "1";

  return (
    <div className="flex flex-col gap-6">
      {boasVindas && (
        <p role="status" className="rounded-2xl bg-salvia-claro px-5 py-4 text-sm text-salvia">
          Tudo pronto! Separamos {pluralizar(total, "tarefa", "tarefas")} para começar. As que já deveriam ter sido
          feitas estão em <strong>Começar agora</strong>, sem culpa.
        </p>
      )}

      <Cartao className="flex flex-col gap-6 bg-tinta text-papel sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-serif text-4xl sm:text-5xl">{evento.nome_exibicao}</p>
          <p className="mt-2 text-papel/70">
            {evento.data_status === "definida" && evento.data && (
              <>
                {dataPorExtenso(evento.data)}
                {evento.horario_cerimonia && ` · ${horario(evento.horario_cerimonia)}`}
              </>
            )}
            {evento.data_status === "mes_estimado" && evento.data && `Em ${mesPorExtenso(evento.data)}`}
            {evento.data_status === "indefinida" && "Data a definir"}
            {evento.cidade && ` · ${evento.cidade}${evento.uf ? `/${evento.uf}` : ""}`}
          </p>
        </div>
        <div className="sm:text-right">
          {faltam === null ? (
            <BotaoLink href="/configuracoes" variante="secundario">
              Definir data
            </BotaoLink>
          ) : faltam > 0 ? (
            <>
              <p className="font-serif text-6xl leading-none">
                {evento.data_status === "mes_estimado" && "≈"}
                {faltam}
              </p>
              <p className="text-papel/70">{faltam === 1 ? "dia" : "dias"} para o grande dia</p>
            </>
          ) : faltam === 0 ? (
            <p className="font-serif text-4xl">É hoje! 💍</p>
          ) : (
            <p className="font-serif text-2xl">Casados há {pluralizar(-faltam, "dia", "dias")}</p>
          )}
        </div>
      </Cartao>

      <div className="grid gap-4 md:grid-cols-3">
        <Cartao>
          <p className="text-sm text-tinta-suave">Progresso</p>
          <p className="mt-1 font-serif text-4xl">{progresso}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-linha" role="progressbar" aria-valuenow={progresso} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-salvia" style={{ width: `${progresso}%` }} />
          </div>
          <p className="mt-2 text-sm text-tinta-suave">
            {concluidas} de {pluralizar(total, "tarefa", "tarefas")}
            {atrasadas > 0 && <span className="text-alerta"> · {atrasadas} atrasada{atrasadas > 1 && "s"}</span>}
          </p>
        </Cartao>

        <Cartao>
          <p className="text-sm text-tinta-suave">Orçamento</p>
          {evento.orcamento_total_centavos ? (
            <>
              <p className="mt-1 font-serif text-4xl">{formatarBRL(evento.orcamento_total_centavos, { semCentavos: true })}</p>
              {evento.convidados_estimados && (
                <p className="mt-2 text-sm text-tinta-suave">
                  ≈ {formatarBRL(Math.round(evento.orcamento_total_centavos / evento.convidados_estimados), { semCentavos: true })}{" "}
                  por convidado ({evento.convidados_estimados})
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm">
              Ainda não definido.{" "}
              <Link href="/configuracoes" className="underline underline-offset-4">
                Definir orçamento
              </Link>
            </p>
          )}
        </Cartao>

        <Cartao>
          <p className="text-sm text-tinta-suave">Vocês</p>
          <ul className="mt-2 flex flex-col gap-1">
            {membros.map((m) => (
              <li key={m.usuarioId} className="font-serif text-xl">
                {m.nome}
                {m.souEu && <span className="ml-2 font-sans text-xs text-tinta-suave">você</span>}
              </li>
            ))}
          </ul>
          {membros.length < 2 && (
            <BotaoLink href="/configuracoes#membros" variante="secundario" className="mt-3">
              Convidar meu amor
            </BotaoLink>
          )}
          <p className="mt-3 border-t border-linha pt-3 text-sm text-tinta-suave">
            <Link href="/votos" className="hover:text-tinta">
              {votos.map((v, i) => (
                <span key={v.membro.usuarioId}>
                  {i > 0 && " · "}
                  {v.membro.souEu ? "Seus votos" : "Votos do seu amor"}:{" "}
                  <span className={v.situacao === "prontos" ? "text-salvia" : undefined}>{ROTULO_SITUACAO[v.situacao]}</span>
                </span>
              ))}
            </Link>
          </p>
        </Cartao>
      </div>

      {decisoes.map((g) => (
        <Cartao key={g.grupo} className="border-rose/40">
          <p className="mb-1 text-sm uppercase tracking-[0.2em] text-rose">Decisão</p>
          <p className="mb-4 text-sm text-tinta-suave">
            Escolham para receber as tarefas desse caminho. Dá para mudar depois em Configurações.
          </p>
          <EscolhaPacote
            pergunta={rotuloGrupoEscolha(g.grupo)}
            opcoes={g.opcoes}
            escolhido={null}
            permitirNenhum={false}
          />
        </Cartao>
      ))}

      <Cartao>
        <div className="mb-3 flex items-baseline justify-between">
          <Subtitulo>Próximas tarefas</Subtitulo>
          <Link href="/tarefas" className="text-sm text-tinta-suave hover:text-tinta">
            Ver todas →
          </Link>
        </div>
        {proximas.length ? (
          <ul className="divide-y divide-linha">
            {proximas.map((t) => (
              <ItemTarefa key={t.id} tarefa={t} membros={membros} hoje={hoje} compacto />
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-tinta-suave">Nenhuma tarefa pendente. Aproveitem! 🥂</p>
        )}
      </Cartao>
    </div>
  );
}
