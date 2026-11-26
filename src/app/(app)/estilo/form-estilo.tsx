"use client";

import { useRef, useState, useTransition } from "react";
import { Aviso, Botao, cx } from "@/components/ui";
import type { OpcaoEstilo } from "@/lib/estilo-dados";
import { PERGUNTAS, type Grupo, type Respostas } from "@/lib/estilo";
import { pluralizar } from "@/lib/formato";
import { salvarEstilo, type ResultadoEstilo } from "./actions";

type Previa = Extract<ResultadoEstilo, { tipo: "previa" }>;

export function FormEstilo({ opcoes, respostas }: { opcoes: Record<Grupo, OpcaoEstilo[]>; respostas: Respostas }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pendente, iniciar] = useTransition();
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);

  function enviar(confirmado: boolean) {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    if (confirmado) fd.set("confirmado", "1");
    iniciar(async () => {
      const r = await salvarEstilo(fd);
      if (r.tipo === "previa") {
        setPrevia(r);
        setMensagem(null);
      } else if (r.tipo === "erro") {
        setPrevia(null);
        setMensagem({ tipo: "erro", texto: r.mensagem });
      } else {
        setPrevia(null);
        const partes = [
          r.criadas && `${pluralizar(r.criadas, "tarefa entrou", "tarefas entraram")} no checklist`,
          r.removidas && `${pluralizar(r.removidas, "saiu", "saíram")}`,
        ].filter(Boolean);
        setMensagem({ tipo: "ok", texto: `Respostas salvas.${partes.length ? ` ${partes.join(" · ")}.` : ""}` });
      }
    });
  }

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-6"
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
      {PERGUNTAS.map(({ grupo, titulo, multipla }) => (
        <fieldset key={grupo} className="flex flex-col gap-2">
          <legend className="mb-2 font-medium">{titulo}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {opcoes[grupo].map((o) => (
              <label
                key={o.codigo}
                className={cx(
                  "flex cursor-pointer items-start gap-3 rounded-xl border border-linha bg-cartao px-3.5 py-2.5 text-sm transition",
                  "hover:border-tinta/40 has-[:checked]:border-tinta has-[:checked]:bg-rose-claro/40",
                )}
              >
                <input
                  type={multipla ? "checkbox" : "radio"}
                  name={grupo}
                  value={o.codigo}
                  defaultChecked={respostas[grupo]?.includes(o.codigo)}
                  className="mt-0.5 size-4 accent-rose"
                />
                <span>
                  <span className="block">{o.nome}</span>
                  {o.descricao && <span className="block text-xs text-tinta-suave">{o.descricao}</span>}
                </span>
              </label>
            ))}
          </div>
          {!multipla && (
            <button
              type="button"
              className="self-start text-xs text-tinta-suave underline-offset-4 hover:text-tinta hover:underline"
              onClick={(e) => {
                formRef.current?.querySelectorAll<HTMLInputElement>(`input[name="${grupo}"]`).forEach((i) => (i.checked = false));
                e.currentTarget.form?.dispatchEvent(new Event("change", { bubbles: true }));
              }}
            >
              Ainda não sabemos
            </button>
          )}
        </fieldset>
      ))}

      {mensagem && <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>}

      {previa ? (
        <div role="alertdialog" aria-labelledby="previa-estilo" className="rounded-2xl border border-rose bg-rose-claro p-4 text-sm">
          <p id="previa-estilo" className="mb-2 font-medium">
            Isso muda o checklist:{" "}
            {[
              previa.entram > 0 && pluralizar(previa.entram, "tarefa entra", "tarefas entram"),
              previa.saem > 0 && pluralizar(previa.saem, "sai", "saem"),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {previa.saem > 0 && (
            <p className="mb-2 text-tinta-suave">Saem só as tarefas que vocês ainda não tocaram.</p>
          )}
          {previa.ficam > 0 && (
            <p className="mb-2 text-tinta-suave">
              {pluralizar(previa.ficam, "tarefa concluída ou editada fica", "tarefas concluídas ou editadas ficam")}.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Botao type="button" disabled={pendente} onClick={() => enviar(true)}>
              {pendente ? "Salvando…" : "Confirmar"}
            </Botao>
            <Botao type="button" variante="fantasma" onClick={() => setPrevia(null)}>
              Voltar
            </Botao>
          </div>
        </div>
      ) : (
        <div>
          <Botao type="submit" disabled={pendente} aria-busy={pendente}>
            {pendente ? "Salvando…" : "Salvar respostas"}
          </Botao>
        </div>
      )}
    </form>
  );
}
