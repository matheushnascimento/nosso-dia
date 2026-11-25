"use client";

import { useActionState, useState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { AreaTexto, Aviso, Campo, Entrada, Selecao, cx } from "@/components/ui";
import type { Membro } from "@/lib/dal";
import { ESTADO_INICIAL } from "@/lib/erros";
import { CATEGORIAS } from "@/lib/rotulos";
import type { Tarefa } from "@/lib/tarefas";
import { criarTarefa, editarTarefa } from "./actions";

function OpcoesResponsavel({ membros }: { membros: Membro[] }) {
  return (
    <>
      <option value="ambos">Os dois</option>
      {membros.map((m) => (
        <option key={m.usuarioId} value={m.usuarioId}>
          {m.souEu ? `${m.nome} (você)` : m.nome}
        </option>
      ))}
    </>
  );
}

function OpcoesCategoria() {
  return Object.entries(CATEGORIAS).map(([valor, rotulo]) => (
    <option key={valor} value={valor}>
      {rotulo}
    </option>
  ));
}

export function FormNovaTarefa({ membros, temData }: { membros: Membro[]; temData: boolean }) {
  const [estado, acao] = useActionState(criarTarefa, ESTADO_INICIAL);
  const [modo, setModo] = useState<"relativo" | "fixo" | "nenhum">(temData ? "relativo" : "nenhum");

  return (
    <form
      action={acao}
      // limpa o formulário depois de criar
      key={estado.ok}
      className="flex flex-col gap-4"
    >
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <Campo rotulo="Tarefa">
        <Entrada name="titulo" required placeholder="Ex.: Escolher o sabor do bolo" />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Categoria">
          <Selecao name="categoria" defaultValue="outros">
            <OpcoesCategoria />
          </Selecao>
        </Campo>
        <Campo rotulo="Responsável">
          <Selecao name="responsavel" defaultValue="ambos">
            <OpcoesResponsavel membros={membros} />
          </Selecao>
        </Campo>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Prazo</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["relativo", "Dias antes do casamento"],
              ["fixo", "Data fixa"],
              ["nenhum", "Sem prazo"],
            ] as const
          ).map(([valor, rotulo]) => (
            <label
              key={valor}
              className={cx(
                "cursor-pointer rounded-full border px-3 py-1 text-sm",
                modo === valor ? "border-tinta bg-tinta text-papel" : "border-linha hover:border-tinta/40",
              )}
            >
              <input type="radio" name="modo_prazo" value={valor} checked={modo === valor} onChange={() => setModo(valor)} className="sr-only" />
              {rotulo}
            </label>
          ))}
        </div>
        {modo === "relativo" && (
          <div className="flex items-center gap-2 text-sm">
            <Entrada name="dias_antes" type="number" min={0} max={730} defaultValue={30} className="w-24" />
            dias antes
            {!temData && <span className="text-tinta-suave">(o prazo aparece quando houver data)</span>}
          </div>
        )}
        {modo === "fixo" && <Entrada name="prazo_fixo" type="date" required className="sm:w-56" />}
      </fieldset>

      <Campo rotulo="Notas" dica="Opcional">
        <AreaTexto name="descricao" rows={2} />
      </Campo>
      <BotaoEnviar className="self-start">Adicionar tarefa</BotaoEnviar>
    </form>
  );
}

export function FormEditarTarefa({ tarefa: t, membros }: { tarefa: Tarefa; membros: Membro[] }) {
  const [estado, acao] = useActionState(editarTarefa, ESTADO_INICIAL);
  return (
    <form action={acao} className="flex flex-col gap-3">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <input type="hidden" name="id" value={t.id} />
      <Campo rotulo="Tarefa">
        <Entrada name="titulo" required defaultValue={t.titulo} />
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo rotulo="Categoria">
          <Selecao name="categoria" defaultValue={t.categoria}>
            <OpcoesCategoria />
          </Selecao>
        </Campo>
        <Campo rotulo="Responsável">
          <Selecao name="responsavel" defaultValue={t.responsavel ?? "ambos"}>
            <OpcoesResponsavel membros={membros} />
          </Selecao>
        </Campo>
      </div>
      <Campo
        rotulo="Prazo fixo"
        dica={
          t.offsetDias !== null
            ? `Deixe vazio para seguir a data do casamento (${Math.abs(t.offsetDias)} dias ${t.offsetDias > 0 ? "depois" : "antes"}).`
            : "Deixe vazio para ficar sem prazo."
        }
      >
        <Entrada name="prazo_fixo" type="date" defaultValue={t.prazoFixo ?? ""} />
      </Campo>
      <Campo rotulo="Notas">
        <AreaTexto name="descricao" rows={2} defaultValue={t.descricao ?? ""} />
      </Campo>
      <BotaoEnviar className="self-start">Salvar</BotaoEnviar>
    </form>
  );
}
