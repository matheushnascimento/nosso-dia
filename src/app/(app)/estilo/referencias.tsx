"use client";

import { useActionState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { AreaTexto, Aviso, Campo, Entrada, Selecao } from "@/components/ui";
import { ESTADO_INICIAL } from "@/lib/erros";
import { CATEGORIAS_FORNECEDOR } from "@/lib/rotulos";
import { adicionarReferencia, excluirReferencia } from "./actions";

export function FormReferencia() {
  const [estado, acao] = useActionState(adicionarReferencia, ESTADO_INICIAL);
  return (
    <form action={acao} key={estado.ok ?? JSON.stringify(estado.campos ?? {})} className="flex flex-col gap-3">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <Campo rotulo="Link">
        <Entrada name="url" type="url" required maxLength={2000} placeholder="https://…" defaultValue={estado.erro ? estado.campos?.url : ""} />
      </Campo>
      <Campo rotulo="Categoria">
        <Selecao name="categoria" defaultValue={estado.campos?.categoria ?? "decoracao"}>
          {Object.entries(CATEGORIAS_FORNECEDOR).map(([v, r]) => (
            <option key={v} value={v}>
              {r}
            </option>
          ))}
        </Selecao>
      </Campo>
      <Campo rotulo="Nota (opcional)">
        <AreaTexto name="nota" maxLength={500} defaultValue={estado.erro ? estado.campos?.nota : ""} placeholder="O que gostaram nessa referência" />
      </Campo>
      <div>
        <BotaoEnviar pendente="Guardando…">Guardar referência</BotaoEnviar>
      </div>
    </form>
  );
}

export function ExcluirReferencia({ id }: { id: string }) {
  return (
    <form action={excluirReferencia}>
      <input type="hidden" name="id" value={id} />
      <button className="text-xs text-tinta-suave hover:text-alerta" aria-label="Excluir referência">
        Excluir
      </button>
    </form>
  );
}
