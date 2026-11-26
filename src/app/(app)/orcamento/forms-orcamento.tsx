"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Aviso, Campo, Entrada, Selecao, Selo, cx } from "@/components/ui";
import { ESTADO_INICIAL } from "@/lib/erros";
import { formatarBRL, parseBRL } from "@/lib/formato";
import { CATEGORIAS_ORCAMENTO, SUGESTAO, type CategoriaOrcamento, type Prioridades } from "@/lib/orcamento";
import { alterarTotal, distribuirOrcamento, salvarPlanejados } from "./actions";

/** Centavos → "6.750" ou "6.750,50" (o formato que o campo aceita de volta). */
export function paraCampo(c: number | null): string {
  if (c === null) return "";
  return (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 });
}

function CampoReais(props: { name: string; defaultValue?: string; onChange?: (v: string) => void; "aria-label"?: string; className?: string }) {
  const { onChange, className, ...resto } = props;
  return (
    <div className={cx("relative", className)}>
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-tinta-suave">R$</span>
      <Entrada inputMode="decimal" placeholder="0" className="pl-10" autoComplete="off" onChange={(e) => onChange?.(e.target.value)} {...resto} />
    </div>
  );
}

export function FormTotal({ total, distribuido }: { total: number | null; distribuido: boolean }) {
  const [estado, acao] = useActionState(alterarTotal, ESTADO_INICIAL);
  const [valor, setValor] = useState(paraCampo(total));
  const novo = parseBRL(valor);
  const mudou = novo !== null && !Number.isNaN(novo) && novo !== total;

  return (
    <form action={acao} className="flex flex-col gap-3">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <Campo rotulo="Orçamento total">
        <CampoReais name="total" defaultValue={estado.campos?.total ?? paraCampo(total)} onChange={setValor} />
      </Campo>
      {distribuido && mudou && (
        <fieldset className="flex flex-col gap-2 rounded-xl border border-linha p-3 text-sm">
          <legend className="px-1 font-medium">E a distribuição por categoria?</legend>
          <label className="flex items-start gap-2">
            <input type="radio" name="modo" value="redistribuir" required className="mt-1" />
            <span>Redistribuir pela sugestão (mantendo as prioridades). Os valores à mão são substituídos.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="modo" value="manter" required className="mt-1" />
            <span>Manter os valores de cada categoria como estão.</span>
          </label>
        </fieldset>
      )}
      <div>
        <BotaoEnviar variante={total === null ? "primario" : "secundario"}>{total === null ? "Definir orçamento" : "Alterar total"}</BotaoEnviar>
      </div>
    </form>
  );
}

const PRIORIZAVEIS = (Object.keys(CATEGORIAS_ORCAMENTO) as CategoriaOrcamento[]).filter((c) => c !== "reserva");

export function FormDistribuir({ prioridades, jaDistribuido }: { prioridades: Prioridades; jaDistribuido: boolean }) {
  const [estado, acao] = useActionState(distribuirOrcamento, ESTADO_INICIAL);
  return (
    <form action={acao} className="flex flex-col gap-3">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <p className="text-sm text-tinta-suave">
        Escolham até 3 prioridades: elas ganham uma fatia maior, e as outras categorias cedem na mesma proporção. A reserva
        para imprevistos fica sempre em {SUGESTAO.reserva / 100}%.
      </p>
      {([1, 2, 3] as const).map((p) => (
        <Campo key={p} rotulo={`${p}ª prioridade`}>
          <Selecao name={`p${p}`} defaultValue={prioridades[p] ?? ""}>
            <option value="">Nenhuma</option>
            {PRIORIZAVEIS.map((c) => (
              <option key={c} value={c}>
                {CATEGORIAS_ORCAMENTO[c]}
              </option>
            ))}
          </Selecao>
        </Campo>
      ))}
      {jaDistribuido && <p className="text-sm text-tinta-suave">Isso substitui os valores de todas as categorias.</p>}
      <div>
        <BotaoEnviar variante={jaDistribuido ? "secundario" : "primario"} pendente="Distribuindo…">
          {jaDistribuido ? "Redistribuir pela sugestão" : "Distribuir pela sugestão"}
        </BotaoEnviar>
      </div>
    </form>
  );
}

export type LinhaForm = {
  categoria: CategoriaOrcamento;
  rotulo: string;
  planejado: number;
  prioridade: number | null;
  contratado: number;
  fornecedores: number;
};

export function FormPlanejados({ linhas, total }: { linhas: LinhaForm[]; total: number | null }) {
  const [estado, acao] = useActionState(salvarPlanejados, ESTADO_INICIAL);
  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(linhas.map((l) => [l.categoria, paraCampo(l.planejado || null)])),
  );
  const planejadoDe = (c: string) => {
    const v = parseBRL(valores[c]);
    return v === null || Number.isNaN(v) ? 0 : v;
  };
  const soma = linhas.reduce((s, l) => s + planejadoDe(l.categoria), 0);
  const diferenca = total === null ? 0 : total - soma;

  return (
    <form action={acao} className="flex flex-col gap-4">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <ul className="divide-y divide-linha">
        {linhas.map((l) => {
          const planejado = planejadoDe(l.categoria);
          const restante = planejado - l.contratado;
          const acima = l.contratado > 0 && restante < 0;
          const pct = planejado > 0 ? Math.min(100, Math.round((l.contratado / planejado) * 100)) : l.contratado > 0 ? 100 : 0;
          return (
            <li key={l.categoria} className="grid gap-2 py-3 sm:grid-cols-[1fr_11rem] sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{l.rotulo}</span>
                  {l.prioridade && <Selo tom="rose">{l.prioridade}ª prioridade</Selo>}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-linha" aria-hidden>
                  <div className={cx("h-full rounded-full", acima ? "bg-alerta" : "bg-salvia")} style={{ width: `${pct}%` }} />
                </div>
                <p className={cx("text-sm", acima ? "text-alerta" : "text-tinta-suave")}>
                  {l.contratado > 0 ? (
                    <>
                      {formatarBRL(l.contratado)} contratado ·{" "}
                      {acima ? <strong className="font-medium">{formatarBRL(-restante)} acima do planejado</strong> : <>{formatarBRL(restante)} restante</>}
                    </>
                  ) : l.categoria === "reserva" ? (
                    "Para imprevistos: não tem fornecedor."
                  ) : l.fornecedores > 0 ? (
                    <Link href="/fornecedores" className="underline-offset-4 hover:underline">
                      {l.fornecedores} fornecedor{l.fornecedores > 1 && "es"} em análise
                    </Link>
                  ) : (
                    "Nada contratado ainda."
                  )}
                </p>
              </div>
              <CampoReais
                name={`planejado_${l.categoria}`}
                aria-label={`Planejado para ${l.rotulo}`}
                defaultValue={valores[l.categoria]}
                onChange={(v) => setValores((atual) => ({ ...atual, [l.categoria]: v }))}
              />
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linha pt-4">
        <p className={cx("text-sm", diferenca !== 0 && total !== null ? "text-alerta" : "text-tinta-suave")} aria-live="polite">
          Soma: {formatarBRL(soma)}
          {total !== null &&
            (diferenca === 0
              ? " · bate com o total"
              : diferenca > 0
                ? ` · faltam ${formatarBRL(diferenca)} para o total`
                : ` · ${formatarBRL(-diferenca)} acima do total`)}
        </p>
        <BotaoEnviar>Salvar valores</BotaoEnviar>
      </div>
    </form>
  );
}
