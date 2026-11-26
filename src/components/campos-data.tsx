"use client";

import { useState } from "react";
import { Campo, Entrada, cx } from "@/components/ui";
import type { DataStatus } from "@/lib/tipos";

const OPCOES: { valor: DataStatus; rotulo: string }[] = [
  { valor: "definida", rotulo: "Já temos a data" },
  { valor: "mes_estimado", rotulo: "Sabemos o mês" },
  { valor: "indefinida", rotulo: "Ainda não sabemos" },
];

/**
 * Campos de data do casamento (usados no onboarding e nas configurações).
 * Envia: data_status, data, mes, horario_cerimonia, horario_festa.
 */
export function CamposData({
  inicial,
  hoje,
  onChange,
}: {
  /** Hoje (YYYY-MM-DD, America/Sao_Paulo): bloqueia datas no passado no seletor. */
  hoje: string;
  inicial?: {
    data_status: DataStatus;
    data: string | null;
    horario_cerimonia: string | null;
    horario_festa: string | null;
  };
  onChange?: () => void;
}) {
  const [status, setStatus] = useState<DataStatus>(inicial?.data_status ?? "definida");
  // A data já salva continua válida mesmo que tenha passado (o casamento aconteceu).
  const dataSalva = inicial?.data_status === "definida" ? (inicial.data ?? "") : "";
  const mesSalvo = inicial?.data_status === "mes_estimado" ? (inicial.data?.slice(0, 7) ?? "") : "";
  const minData = dataSalva && dataSalva < hoje ? dataSalva : hoje;
  const minMes = mesSalvo && mesSalvo < hoje.slice(0, 7) ? mesSalvo : hoje.slice(0, 7);

  return (
    <div className="flex flex-col gap-4" onChange={onChange}>
      <fieldset className="grid gap-2 sm:grid-cols-3">
        <legend className="sr-only">Situação da data</legend>
        {OPCOES.map((o) => (
          <label
            key={o.valor}
            className={cx(
              "cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm transition",
              status === o.valor ? "border-tinta bg-tinta text-papel" : "border-linha bg-cartao hover:border-tinta/40",
            )}
          >
            <input
              type="radio"
              name="data_status"
              value={o.valor}
              checked={status === o.valor}
              onChange={() => setStatus(o.valor)}
              className="sr-only"
            />
            {o.rotulo}
          </label>
        ))}
      </fieldset>

      {status === "definida" && (
        <>
          <Campo rotulo="Data">
            <Entrada
              type="date"
              name="data"
              required
              min={minData}
              defaultValue={dataSalva}
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Cerimônia" dica="Opcional">
              <Entrada type="time" name="horario_cerimonia" defaultValue={inicial?.horario_cerimonia?.slice(0, 5) ?? ""} />
            </Campo>
            <Campo rotulo="Festa" dica="Opcional">
              <Entrada type="time" name="horario_festa" defaultValue={inicial?.horario_festa?.slice(0, 5) ?? ""} />
            </Campo>
          </div>
        </>
      )}

      {status === "mes_estimado" && (
        <Campo rotulo="Mês" dica="Os prazos aparecem como aproximados (≈) até vocês fecharem o dia.">
          <Entrada
            type="month"
            name="mes"
            required
            min={minMes}
            defaultValue={mesSalvo}
          />
        </Campo>
      )}

      {status === "indefinida" && (
        <p className="rounded-xl bg-rose-claro px-4 py-3 text-sm">
          Sem problema. As tarefas ficam em ordem sugerida e ganham prazo assim que vocês definirem a data.
        </p>
      )}
    </div>
  );
}
