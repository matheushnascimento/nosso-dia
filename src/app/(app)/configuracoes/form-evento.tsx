"use client";

import { useRef, useState, useTransition } from "react";
import { CamposData } from "@/components/campos-data";
import { Aviso, Botao, Campo, Entrada, Selecao } from "@/components/ui";
import type { Tables } from "@/lib/database.types";
import { pluralizar } from "@/lib/formato";
import { UFS } from "@/lib/rotulos";
import { salvarEvento, type Previa } from "./actions";

function centavosParaTexto(c: number | null) {
  if (c === null) return "";
  return (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: c % 100 ? 2 : 0 });
}

export function FormEvento({ evento }: { evento: Tables<"eventos"> }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pendente, iniciar] = useTransition();
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);

  function enviar(confirmado: boolean) {
    const form = formRef.current;
    if (!form) return;
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    if (confirmado) fd.set("confirmado", "1");
    iniciar(async () => {
      const r = await salvarEvento(fd);
      if (r.tipo === "previa") {
        setPrevia(r.previa);
        setMensagem(null);
      } else {
        setPrevia(null);
        setMensagem(r.tipo === "erro" ? { tipo: "erro", texto: r.mensagem } : { tipo: "ok", texto: "Alterações salvas." });
      }
    });
  }

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        enviar(false);
      }}
      // qualquer mudança invalida a prévia mostrada
      onChange={() => {
        setPrevia(null);
        setMensagem(null);
      }}
    >
      <Campo rotulo="Nome do casamento">
        <Entrada name="nome_exibicao" required defaultValue={evento.nome_exibicao} />
      </Campo>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Data</span>
        <CamposData inicial={evento} />
      </div>

      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <Campo rotulo="Cidade">
          <Entrada name="cidade" defaultValue={evento.cidade ?? ""} />
        </Campo>
        <Campo rotulo="UF">
          <Selecao name="uf" defaultValue={evento.uf ?? ""}>
            <option value="">—</option>
            {UFS.map((uf) => (
              <option key={uf}>{uf}</option>
            ))}
          </Selecao>
        </Campo>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Convidados (estimativa)">
          <Entrada name="convidados" type="number" min={1} max={5000} defaultValue={evento.convidados_estimados ?? ""} />
        </Campo>
        <Campo rotulo="Orçamento total (R$)">
          <Entrada name="orcamento" inputMode="decimal" defaultValue={centavosParaTexto(evento.orcamento_total_centavos)} />
        </Campo>
      </div>

      {mensagem && <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>}

      {previa ? (
        <div role="alertdialog" aria-labelledby="previa-titulo" className="rounded-2xl border border-rose bg-rose-claro p-4 text-sm">
          <p id="previa-titulo" className="mb-2 font-medium">
            Mudar a data vai reorganizar o checklist:
          </p>
          <ul className="mb-4 list-inside list-disc space-y-0.5">
            <li>{pluralizar(previa.mudam_de_prazo, "tarefa muda", "tarefas mudam")} de prazo</li>
            {previa.prazo_travado > 0 && (
              <li>{pluralizar(previa.prazo_travado, "tarefa tem", "tarefas têm")} prazo fixo e não muda</li>
            )}
            {previa.passam_a_atrasadas > 0 && (
              <li className="text-alerta">
                {pluralizar(previa.passam_a_atrasadas, "tarefa passa", "tarefas passam")} a ficar atrasada
                {previa.passam_a_atrasadas > 1 && "s"}
              </li>
            )}
            {previa.ficam_sem_prazo > 0 && (
              <li>{pluralizar(previa.ficam_sem_prazo, "tarefa fica", "tarefas ficam")} sem prazo</li>
            )}
          </ul>
          <div className="flex gap-2">
            <Botao type="button" onClick={() => enviar(true)} disabled={pendente}>
              {pendente ? "Salvando…" : "Confirmar e salvar"}
            </Botao>
            <Botao type="button" variante="fantasma" onClick={() => setPrevia(null)}>
              Cancelar
            </Botao>
          </div>
        </div>
      ) : (
        <Botao type="submit" disabled={pendente} className="self-start">
          {pendente ? "Salvando…" : "Salvar alterações"}
        </Botao>
      )}
    </form>
  );
}
