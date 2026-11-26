import type { Metadata } from "next";
import { Suspense } from "react";
import { Aviso, Cartao, Esqueleto, Titulo, cx } from "@/components/ui";
import { requireEvento } from "@/lib/dal";
import { formatarBRL } from "@/lib/formato";
import { carregarOrcamento } from "@/lib/orcamento-dados";
import { FormDistribuir, FormPlanejados, FormTotal } from "./forms-orcamento";

export const metadata: Metadata = { title: "Orçamento" };

export default function PaginaOrcamento() {
  return (
    <div className="flex flex-col gap-6">
      <Titulo>Orçamento</Titulo>
      <Suspense fallback={<Esqueleto className="h-[32rem]" />}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  const ctx = await requireEvento();
  const o = await carregarOrcamento(ctx);

  if (o.total === null) {
    return (
      <Cartao className="max-w-xl">
        <p className="font-serif text-xl">Quanto vocês pretendem gastar?</p>
        <p className="mt-2 mb-4 text-sm text-tinta-suave">
          Com o total, a gente sugere quanto separar para cada categoria. É um ponto de partida: dá para ajustar tudo depois.
        </p>
        <FormTotal total={null} distribuido={false} />
      </Cartao>
    );
  }

  const pct = o.total > 0 ? Math.min(100, Math.round((o.contratado / o.total) * 100)) : 0;
  const estourou = o.restante !== null && o.restante < 0;
  const acimaDoPlanejado = o.linhas.filter((l) => l.contratado > 0 && l.restante < 0);
  const chaveValores = o.linhas.map((l) => `${l.planejado}:${l.prioridade ?? ""}`).join(",");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-6">
        <Cartao>
          <dl className="grid grid-cols-3 gap-3">
            <div>
              <dt className="text-sm text-tinta-suave">Total</dt>
              <dd className="mt-1 font-serif text-2xl sm:text-3xl">{formatarBRL(o.total, { semCentavos: true })}</dd>
            </div>
            <div>
              <dt className="text-sm text-tinta-suave">Contratado</dt>
              <dd className="mt-1 font-serif text-2xl sm:text-3xl">{formatarBRL(o.contratado, { semCentavos: true })}</dd>
            </div>
            <div>
              <dt className="text-sm text-tinta-suave">Restante</dt>
              <dd className={cx("mt-1 font-serif text-2xl sm:text-3xl", estourou && "text-alerta")}>
                {formatarBRL(o.restante ?? 0, { semCentavos: true })}
              </dd>
            </div>
          </dl>
          <div
            className="mt-4 h-2.5 overflow-hidden rounded-full bg-linha"
            role="progressbar"
            aria-label="Contratado do total"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={cx("h-full rounded-full", estourou ? "bg-alerta" : "bg-salvia")} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm text-tinta-suave">
            {pct}% do total já contratado · {o.categoriasContratadas} de {o.categoriasComOrcamento} categorias com fornecedor
            contratado
          </p>
        </Cartao>

        {estourou && <Aviso>Os contratos já passam do orçamento total em {formatarBRL(-(o.restante ?? 0))}.</Aviso>}
        {acimaDoPlanejado.length > 0 && (
          <Aviso tipo="info">
            Acima do planejado: {acimaDoPlanejado.map((l) => `${l.rotulo} (+${formatarBRL(-l.restante)})`).join(", ")}. É só um
            aviso: ajustem os valores das outras categorias se quiserem.
          </Aviso>
        )}
        {o.distribuido && o.somaPlanejado !== o.total && (
          <Aviso tipo="info">
            A soma das categorias ({formatarBRL(o.somaPlanejado)}) não bate com o total ({formatarBRL(o.total)}). Ajustem os
            valores abaixo ou redistribuam pela sugestão.
          </Aviso>
        )}

        <Cartao>
          <p className="font-serif text-xl">Por categoria</p>
          {!o.distribuido && (
            <p className="mt-1 text-sm text-tinta-suave">
              Distribuam pela sugestão ao lado ou preencham à mão quanto querem separar para cada categoria.
            </p>
          )}
          <div className="mt-2">
            <FormPlanejados key={chaveValores} linhas={o.linhas} total={o.total} />
          </div>
        </Cartao>
      </div>

      <aside className="flex flex-col gap-6">
        <Cartao>
          <p className="mb-3 font-serif text-xl">{o.distribuido ? "Redistribuir" : "Distribuição sugerida"}</p>
          <FormDistribuir key={chaveValores} prioridades={o.prioridades} jaDistribuido={o.distribuido} />
        </Cartao>
        <Cartao>
          <FormTotal key={o.total} total={o.total} distribuido={o.distribuido} />
        </Cartao>
      </aside>
    </div>
  );
}
