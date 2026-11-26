"use client";

import { useActionState, useState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { AreaTexto, Aviso, Botao, Campo, Entrada, Selecao } from "@/components/ui";
import { camposDa, nomeCampo, type CampoDef, type ValoresDetalhes } from "@/lib/campos-fornecedor";
import { ESTADO_INICIAL } from "@/lib/erros";
import { CATEGORIAS_FORNECEDOR, STATUS_FORNECEDOR, type CategoriaFornecedor } from "@/lib/rotulos";
import { criarFornecedor, editarFornecedor, excluirFornecedor, type EstadoFornecedor } from "./actions";

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

export function FormFornecedor({
  id,
  valores,
  detalhes = {},
}: {
  id?: string;
  valores: ValoresForm;
  /** Campos da categoria gravada (`valores.categoria`), já no formato do formulário. */
  detalhes?: ValoresDetalhes;
}) {
  const [estado, acao] = useActionState<EstadoFornecedor, FormData>(id ? editarFornecedor : criarFornecedor, ESTADO_INICIAL);
  // num erro, o formulário volta com o que foi digitado
  const v = { ...valores, ...estado.campos } as ValoresForm;
  const [status, setStatus] = useState(v.status);
  const [categoria, setCategoria] = useState(v.categoria);
  const contratado = status === "contratado";

  // Os valores só valem para a categoria de onde vieram: em outra categoria, os campos começam vazios.
  const origemDetalhes = estado.detalhes ? (estado.campos?.categoria ?? categoria) : valores.categoria;
  const detalhesIniciais = (estado.detalhes ?? detalhes) as ValoresDetalhes;
  const preenchidos = Object.values(detalhes).filter((x) => (Array.isArray(x) ? x.length : x)).length;
  const descarta = Boolean(id) && categoria !== valores.categoria && preenchidos > 0 && camposDa(valores.categoria).length > 0;

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
          <Selecao name="categoria" required defaultValue={v.categoria} onChange={(e) => setCategoria(e.target.value)}>
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

      {descarta && (
        <Aviso tipo="info">
          Ao salvar em outra categoria, os campos de {CATEGORIAS_FORNECEDOR[valores.categoria as CategoriaFornecedor]} (
          {camposDa(valores.categoria)
            .map((c) => c.rotulo.toLowerCase())
            .join(", ")}
          ) serão descartados. Nome, contatos, valores e notas continuam.
        </Aviso>
      )}

      {camposDa(categoria).length > 0 && (
        <fieldset className="flex flex-col gap-3 rounded-2xl border border-linha p-4">
          <legend className="px-1 font-serif text-lg">Detalhes de {CATEGORIAS_FORNECEDOR[categoria as CategoriaFornecedor]?.toLowerCase()}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {camposDa(categoria).map((c) => (
              <CampoDetalhe key={`${categoria}:${c.chave}`} campo={c} valor={categoria === origemDetalhes ? detalhesIniciais[c.chave] : undefined} />
            ))}
          </div>
        </fieldset>
      )}

      <Campo rotulo="Notas">
        <AreaTexto name="notas" maxLength={5000} defaultValue={v.notas} placeholder="O que acharam, o que está incluso, próximos passos…" />
      </Campo>

      <div>
        <BotaoEnviar pendente={id ? "Salvando…" : "Cadastrando…"}>{id ? "Salvar" : "Cadastrar fornecedor"}</BotaoEnviar>
      </div>
    </form>
  );
}

/** Um campo da categoria, conforme o tipo declarado no módulo da categoria. */
function CampoDetalhe({ campo: c, valor }: { campo: CampoDef; valor: string | string[] | undefined }) {
  const nome = nomeCampo(c.chave);
  const texto = typeof valor === "string" ? valor : "";
  if (c.tipo === "multipla") {
    const marcados = Array.isArray(valor) ? valor : [];
    return (
      <fieldset className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <legend className="mb-1.5 font-medium">{c.rotulo}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {Object.entries(c.opcoes).map(([o, rotulo]) => (
            <label key={o} className="flex items-center gap-2">
              <input type="checkbox" name={nome} value={o} defaultChecked={marcados.includes(o)} className="size-4 accent-rose" />
              {rotulo}
            </label>
          ))}
        </div>
        {c.dica && <span className="text-xs text-tinta-suave">{c.dica}</span>}
      </fieldset>
    );
  }
  let entrada;
  switch (c.tipo) {
    case "inteiro":
      entrada = (
        <div className="relative">
          <Entrada name={nome} type="number" inputMode="numeric" min={c.min} max={c.max} step={1} defaultValue={texto} className={c.sufixo ? "pr-20" : undefined} />
          {c.sufixo && <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-tinta-suave">{c.sufixo}</span>}
        </div>
      );
      break;
    case "dinheiro":
      entrada = <ValorEmReais name={nome} defaultValue={texto} />;
      break;
    case "hora":
      entrada = <Entrada name={nome} type="time" defaultValue={texto} />;
      break;
    case "data":
      entrada = <Entrada name={nome} type="date" defaultValue={texto} />;
      break;
    case "booleano":
      entrada = (
        <Selecao name={nome} defaultValue={texto}>
          <option value="">Não sei ainda</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </Selecao>
      );
      break;
    case "opcao":
      entrada = (
        <Selecao name={nome} defaultValue={texto}>
          <option value="">Não sei ainda</option>
          {Object.entries(c.opcoes).map(([o, rotulo]) => (
            <option key={o} value={o}>
              {rotulo}
            </option>
          ))}
        </Selecao>
      );
      break;
  }
  return (
    <Campo rotulo={c.rotulo} dica={c.dica}>
      {entrada}
    </Campo>
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
