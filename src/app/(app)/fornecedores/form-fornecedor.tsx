"use client";

import { useActionState, useState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { AreaTexto, Aviso, Botao, Campo, Entrada, Selecao } from "@/components/ui";
import { ESTADO_INICIAL } from "@/lib/erros";
import { CATEGORIAS_FORNECEDOR, STATUS_FORNECEDOR } from "@/lib/rotulos";
import { criarFornecedor, editarFornecedor, excluirFornecedor } from "./actions";

/** Valores iniciais do formulário, já como texto (valores em R$ formatados para edição). */
export type ValoresForm = {
  nome: string;
  categoria: string;
  status: string;
  telefone: string;
  email: string;
  instagram: string;
  site: string;
  valor_orcado: string;
  valor_contratado: string;
  notas: string;
};

export function FormFornecedor({ id, valores }: { id?: string; valores: ValoresForm }) {
  const [estado, acao] = useActionState(id ? editarFornecedor : criarFornecedor, ESTADO_INICIAL);
  // num erro, o formulário volta com o que foi digitado
  const v = { ...valores, ...estado.campos } as ValoresForm;
  const [status, setStatus] = useState(v.status);
  const contratado = status === "contratado";

  return (
    <form action={acao} key={JSON.stringify(estado.campos ?? {})} className="flex flex-col gap-4">
      {id && <input type="hidden" name="id" value={id} />}
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <Campo rotulo="Nome">
        <Entrada name="nome" required maxLength={120} defaultValue={v.nome} placeholder="Ex.: Espaço Jardim" />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Categoria">
          <Selecao name="categoria" required defaultValue={v.categoria}>
            {Object.entries(CATEGORIAS_FORNECEDOR).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Situação">
          <Selecao name="status" defaultValue={v.status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(STATUS_FORNECEDOR).map(([valor, { rotulo }]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Selecao>
        </Campo>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Valor orçado" dica="O que foi pedido ou proposto.">
          <ValorEmReais name="valor_orcado" defaultValue={v.valor_orcado} />
        </Campo>
        <Campo rotulo={contratado ? "Valor contratado (obrigatório)" : "Valor contratado"} dica="O que ficou no contrato.">
          <ValorEmReais name="valor_contratado" defaultValue={v.valor_contratado} required={contratado} />
        </Campo>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Telefone ou WhatsApp">
          <Entrada name="telefone" type="tel" maxLength={40} defaultValue={v.telefone} autoComplete="off" />
        </Campo>
        <Campo rotulo="E-mail">
          <Entrada name="email" type="email" maxLength={254} defaultValue={v.email} autoComplete="off" />
        </Campo>
        <Campo rotulo="Instagram">
          <Entrada name="instagram" maxLength={80} defaultValue={v.instagram} placeholder="@perfil" autoComplete="off" />
        </Campo>
        <Campo rotulo="Site">
          <Entrada name="site" maxLength={300} defaultValue={v.site} placeholder="www.exemplo.com.br" autoComplete="off" />
        </Campo>
      </div>

      <Campo rotulo="Notas">
        <AreaTexto name="notas" maxLength={5000} defaultValue={v.notas} placeholder="O que acharam, o que está incluso, próximos passos…" />
      </Campo>

      <div>
        <BotaoEnviar pendente={id ? "Salvando…" : "Cadastrando…"}>{id ? "Salvar" : "Cadastrar fornecedor"}</BotaoEnviar>
      </div>
    </form>
  );
}

function ValorEmReais(props: { name: string; defaultValue: string; required?: boolean }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-tinta-suave">R$</span>
      <Entrada inputMode="decimal" placeholder="0,00" className="pl-10" autoComplete="off" {...props} />
    </div>
  );
}

/** Excluir em dois passos: o primeiro clique só pede confirmação. */
export function ExcluirFornecedor({ id, nome }: { id: string; nome: string }) {
  const [confirmando, setConfirmando] = useState(false);
  if (!confirmando) {
    return (
      <Botao type="button" variante="perigo" onClick={() => setConfirmando(true)}>
        Excluir fornecedor
      </Botao>
    );
  }
  return (
    <form action={excluirFornecedor} className="flex flex-wrap items-center gap-2" role="alert">
      <input type="hidden" name="id" value={id} />
      <span className="text-sm">Excluir “{nome}”? Isso não tem volta.</span>
      <BotaoEnviar variante="perigo" pendente="Excluindo…">
        Sim, excluir
      </BotaoEnviar>
      <Botao type="button" variante="fantasma" onClick={() => setConfirmando(false)}>
        Cancelar
      </Botao>
    </form>
  );
}
