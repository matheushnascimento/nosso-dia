"use client";

import { useActionState } from "react";
import { escolherPacote } from "@/app/(app)/configuracoes/actions";
import { Aviso, cx } from "@/components/ui";
import { ESTADO_INICIAL } from "@/lib/erros";

type Opcao = { codigo: string; nome: string; descricao: string | null };

/**
 * Escolha de um checklist dentro de um grupo (ex.: "Como vai ser a cerimônia?").
 * Escolher ativa o pacote; trocar remove as tarefas intactas do anterior.
 */
export function EscolhaPacote({
  pergunta,
  opcoes,
  escolhido,
}: {
  pergunta: string;
  opcoes: Opcao[];
  escolhido: string | null;
}) {
  const [estado, acao, pendente] = useActionState(escolherPacote, ESTADO_INICIAL);

  return (
    <form action={acao} className="flex flex-col gap-3" aria-busy={pendente}>
      <p className="text-sm font-medium">{pergunta}</p>
      <input type="hidden" name="atual" value={escolhido ?? ""} />
      <div className="flex flex-col gap-2">
        {[...opcoes, { codigo: "", nome: "Ainda não decidimos", descricao: null }].map((o) => {
          const ativo = (escolhido ?? "") === o.codigo;
          return (
            <button
              key={o.codigo || "nenhum"}
              name="pacote"
              value={o.codigo}
              disabled={pendente}
              aria-pressed={ativo}
              className={cx(
                "rounded-xl border px-3.5 py-2.5 text-left text-sm transition disabled:opacity-60",
                ativo ? "border-tinta bg-tinta text-papel" : "border-linha bg-cartao hover:border-tinta/40",
              )}
            >
              <span className="block">{o.nome}</span>
              {o.descricao && (
                <span className={cx("block text-xs", ativo ? "text-papel/70" : "text-tinta-suave")}>{o.descricao}</span>
              )}
            </button>
          );
        })}
      </div>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <p className="text-xs text-tinta-suave">
        Ao trocar, saem só as tarefas que vocês ainda não tocaram. As concluídas ou editadas ficam.
      </p>
    </form>
  );
}
