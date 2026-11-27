import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BotaoLink, Cartao, Entrada, Esqueleto, Selecao, Selo, Titulo, cx } from "@/components/ui";
import {
  CONFIRMACOES,
  FAIXAS,
  LADOS,
  contar,
  ehConfirmacao,
  ehFaixa,
  ehLado,
  filtrar,
  gruposEmUso,
  gruposParaSugerir,
  rotulosLado,
  temFiltro,
  type Confirmacao,
  type ConviteFamilia,
  type Filtro,
  type Lado,
  type Pessoa,
} from "@/lib/convidados";
import { listarConvites } from "@/lib/convidados-dados";
import { getMembros, requireEvento } from "@/lib/dal";
import { pluralizar } from "@/lib/formato";
import { definirConfirmacao } from "./actions";
import { FormNovoConvite } from "./form-convidados";

export const metadata: Metadata = { title: "Convidados" };

export default function PaginaConvidados({ searchParams }: PageProps<"/convidados">) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <Titulo>Convidados</Titulo>
          <BotaoLink href="/convidados/importar" variante="secundario">
            Importar planilha
          </BotaoLink>
        </div>
        <p className="mt-2 max-w-2xl text-tinta-suave">
          A lista de vocês dois, por convite: quem vem junto fica no mesmo convite. Por enquanto, as confirmações são
          marcadas aqui, à mão.
        </p>
      </div>
      <Suspense fallback={<Esqueleto className="h-[32rem]" />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function primeiro(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

function lerFiltro(sp: Record<string, string | string[] | undefined>): Filtro {
  const lado = primeiro(sp.lado);
  const faixa = primeiro(sp.faixa);
  const confirmacao = primeiro(sp.confirmacao);
  return {
    lado: ehLado(lado) ? lado : undefined,
    faixa: ehFaixa(faixa) ? faixa : undefined,
    confirmacao: ehConfirmacao(confirmacao) ? confirmacao : undefined,
    grupo: primeiro(sp.grupo).slice(0, 60) || undefined,
    busca: primeiro(sp.q).slice(0, 120) || undefined,
  };
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/convidados">["searchParams"] }) {
  const ctx = await requireEvento();
  const [convites, membros, sp] = await Promise.all([listarConvites(ctx), getMembros(ctx), searchParams]);
  const filtro = lerFiltro(sp);
  const lados = rotulosLado(membros);
  const total = contar(convites);
  const visiveis = filtrar(convites, filtro);
  const nVisiveis = contar(visiveis).pessoas;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <Contadores total={total} estimados={ctx.evento.convidados_estimados} />

        {convites.length > 0 && <Filtros filtro={filtro} lados={lados} grupos={gruposEmUso(convites)} />}

        {convites.length === 0 ? (
          <Cartao>
            <p className="font-serif text-xl">Nenhum convidado ainda</p>
            <p className="mt-2 text-tinta-suave">
              Comecem pelo cadastro rápido: um nome por linha, e quem vem junto fica no mesmo convite. Se a lista já
              está numa planilha,{" "}
              <Link href="/convidados/importar" className="underline underline-offset-4 hover:text-tinta">
                importem de uma vez
              </Link>
              .
            </p>
          </Cartao>
        ) : visiveis.length === 0 ? (
          <Cartao>
            <p className="py-6 text-center text-tinta-suave">Ninguém com esses filtros.</p>
          </Cartao>
        ) : (
          <form action={definirConfirmacao} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-tinta-suave">
                {temFiltro(filtro) ? `${pluralizar(nVisiveis, "pessoa", "pessoas")} com esses filtros · ` : ""}
                Marcar as selecionadas como:
              </span>
              {(Object.keys(CONFIRMACOES) as Confirmacao[]).map((s) => (
                <button
                  key={s}
                  name="status"
                  value={s}
                  className="rounded-full border border-linha bg-cartao px-3 py-1.5 hover:border-tinta/40"
                >
                  {CONFIRMACOES[s].rotulo}
                </button>
              ))}
            </div>
            {visiveis.map((c) => (
              <CartaoConvite key={c.id} convite={c} lados={lados} />
            ))}
          </form>
        )}
      </div>

      <aside className="flex flex-col gap-4">
        <Cartao className="lg:sticky lg:top-6">
          <p className="mb-4 font-serif text-xl">Adicionar convite</p>
          <FormNovoConvite rotulosLado={lados} grupos={gruposParaSugerir(convites)} />
        </Cartao>
      </aside>
    </div>
  );
}

function Contadores({ total, estimados }: { total: ReturnType<typeof contar>; estimados: number | null }) {
  const itens = [
    { rotulo: "convidados", valor: total.pessoas },
    { rotulo: "confirmados", valor: total.confirmados, tom: "text-salvia" },
    { rotulo: "pendentes", valor: total.pendentes },
    { rotulo: "não vão", valor: total.recusados, tom: total.recusados ? "text-alerta" : undefined },
    { rotulo: "crianças e bebês", valor: total.criancas + total.bebes },
    { rotulo: "convites", valor: total.convites },
  ];
  return (
    <Cartao className="py-4 sm:py-5">
      <dl className="grid grid-cols-3 gap-x-4 gap-y-3 sm:grid-cols-6">
        {itens.map((i) => (
          <div key={i.rotulo}>
            <dt className="sr-only">{i.rotulo}</dt>
            <dd className={cx("font-serif text-3xl leading-none", i.tom)}>{i.valor}</dd>
            <dd aria-hidden className="mt-1 text-xs text-tinta-suave">
              {i.rotulo}
            </dd>
          </div>
        ))}
      </dl>
      {estimados !== null && total.pessoas > 0 && (
        <p className="mt-3 border-t border-linha pt-3 text-sm text-tinta-suave">
          A estimativa era de cerca de {estimados}.{" "}
          {total.pessoas > estimados && <span className="text-alerta">A lista já passou da estimativa. </span>}
          <Link href="/configuracoes" className="underline underline-offset-4 hover:text-tinta">
            Mudar a estimativa
          </Link>
        </p>
      )}
      {total.comRestricao > 0 && (
        <p className="mt-2 text-sm text-tinta-suave">
          {pluralizar(total.comRestricao, "pessoa com restrição alimentar", "pessoas com restrição alimentar")}.
        </p>
      )}
    </Cartao>
  );
}

function Filtros({ filtro, lados, grupos }: { filtro: Filtro; lados: Record<Lado, string>; grupos: string[] }) {
  return (
    <form className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Filtros">
      <Entrada name="q" type="search" defaultValue={filtro.busca} placeholder="Buscar nome" aria-label="Buscar nome" className="col-span-2 sm:col-span-1" />
      <Selecao name="lado" defaultValue={filtro.lado ?? ""} aria-label="De quem">
        <option value="">De quem</option>
        {LADOS.map((l) => (
          <option key={l} value={l}>
            {lados[l]}
          </option>
        ))}
      </Selecao>
      {grupos.length > 0 && (
        <Selecao name="grupo" defaultValue={filtro.grupo ?? ""} aria-label="Grupo">
          <option value="">Grupo</option>
          {grupos.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Selecao>
      )}
      <Selecao name="faixa" defaultValue={filtro.faixa ?? ""} aria-label="Faixa">
        <option value="">Faixa</option>
        {Object.entries(FAIXAS).map(([v, { rotulo }]) => (
          <option key={v} value={v}>
            {rotulo}
          </option>
        ))}
      </Selecao>
      <Selecao name="confirmacao" defaultValue={filtro.confirmacao ?? ""} aria-label="Confirmação">
        <option value="">Confirmação</option>
        {Object.entries(CONFIRMACOES).map(([v, { rotulo }]) => (
          <option key={v} value={v}>
            {rotulo}
          </option>
        ))}
      </Selecao>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
        <button className="rounded-full border border-linha bg-cartao px-4 py-2.5 text-sm hover:border-tinta/40">Filtrar</button>
        {temFiltro(filtro) && (
          <Link href="/convidados" className="px-2 py-2.5 text-sm text-tinta-suave hover:text-tinta">
            Limpar
          </Link>
        )}
      </div>
    </form>
  );
}

function CartaoConvite({ convite, lados }: { convite: ConviteFamilia; lados: Record<Lado, string> }) {
  return (
    <Cartao className="py-4 sm:py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-serif text-xl">
          <Link href={`/convidados/${convite.id}`} className="hover:text-rose">
            {convite.nome}
          </Link>
        </h2>
        <span className="flex items-center gap-3 text-sm text-tinta-suave">
          <span>
            {lados[convite.lado]}
            {convite.grupo && ` · ${convite.grupo}`}
          </span>
          <Link href={`/convidados/${convite.id}`} className="underline-offset-4 hover:text-tinta hover:underline">
            Editar
          </Link>
        </span>
      </div>
      <ul className="mt-2 divide-y divide-linha">
        {convite.pessoas.map((p) => (
          <LinhaPessoa key={p.id} p={p} />
        ))}
      </ul>
    </Cartao>
  );
}

function LinhaPessoa({ p }: { p: Pessoa }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5">
      <label className="flex min-w-0 items-center gap-3">
        <input type="checkbox" name="ids" value={p.id} className="size-4 shrink-0 accent-tinta" />
        <span className={cx("min-w-0 font-medium", p.confirmacao === "recusado" && "text-tinta-suave line-through")}>
          {p.nome}
        </span>
        {p.faixa !== "adulto" && <Selo>{FAIXAS[p.faixa].curto}</Selo>}
        {p.restricaoAlimentar && (
          <Selo tom="rose" title={p.restricaoAlimentar}>
            restrição
          </Selo>
        )}
      </label>
      <span className="flex shrink-0 overflow-hidden rounded-full border border-linha text-xs" role="group" aria-label={`Confirmação de ${p.nome}`}>
        {(Object.keys(CONFIRMACOES) as Confirmacao[]).map((s) => {
          const ativo = p.confirmacao === s;
          return (
            <button
              key={s}
              name="linha"
              value={`${p.id}:${s}`}
              aria-pressed={ativo}
              className={cx(
                "px-3 py-1.5 transition",
                ativo
                  ? s === "confirmado"
                    ? "bg-salvia-claro text-salvia"
                    : s === "recusado"
                      ? "bg-alerta-claro text-alerta"
                      : "bg-linha/60 text-tinta"
                  : "text-tinta-suave hover:bg-linha/40",
              )}
            >
              {CONFIRMACOES[s].rotulo}
            </button>
          );
        })}
      </span>
    </li>
  );
}
