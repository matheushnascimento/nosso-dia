"use client";

import { useActionState, useState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { AreaTexto, Aviso, Botao, Campo, Entrada, Selecao } from "@/components/ui";
import { CONFIRMACOES, FAIXAS, LADOS, type ConviteFamilia, type Lado, type Pessoa } from "@/lib/convidados";
import { ESTADO_INICIAL } from "@/lib/erros";
import { adicionarPessoa, criarConvite, excluirConvite, excluirPessoa, salvarConvite, salvarPessoa } from "./actions";

function OpcoesLado({ rotulos }: { rotulos: Record<Lado, string> }) {
  return LADOS.map((l) => (
    <option key={l} value={l}>
      {rotulos[l]}
    </option>
  ));
}

function OpcoesFaixa() {
  return Object.entries(FAIXAS).map(([v, { rotulo }]) => (
    <option key={v} value={v}>
      {rotulo}
    </option>
  ));
}

function ListaGrupos({ id, grupos }: { id: string; grupos: string[] }) {
  return (
    <datalist id={id}>
      {grupos.map((g) => (
        <option key={g} value={g} />
      ))}
    </datalist>
  );
}

/** Cadastro rápido: quem vem junto num convite só, um nome por linha. */
export function FormNovoConvite({ rotulosLado, grupos }: { rotulosLado: Record<Lado, string>; grupos: string[] }) {
  const [estado, acao] = useActionState(criarConvite, ESTADO_INICIAL);
  const manter = estado.erro ? estado.campos : undefined;
  return (
    <form action={acao} key={estado.ok ?? JSON.stringify(estado.campos ?? {})} className="flex flex-col gap-3">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <Campo rotulo="Nomes" dica="Um por linha. Quem vem junto (um casal, uma família) fica no mesmo convite.">
        <AreaTexto name="nomes" required rows={3} defaultValue={manter?.nomes} placeholder={"João Silva\nMaria Silva"} />
      </Campo>
      <Campo rotulo="Nome do convite (opcional)" dica="Se ficar vazio, usamos os nomes.">
        <Entrada name="nome_convite" maxLength={120} defaultValue={manter?.nome_convite} placeholder="Ex.: Família Silva" />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="De quem">
          <Selecao name="lado" defaultValue={estado.campos?.lado ?? "ambos"}>
            <OpcoesLado rotulos={rotulosLado} />
          </Selecao>
        </Campo>
        <Campo rotulo="Grupo (opcional)">
          <Entrada name="grupo" list="grupos-novo" maxLength={60} defaultValue={estado.campos?.grupo} placeholder="Família" />
          <ListaGrupos id="grupos-novo" grupos={grupos} />
        </Campo>
      </div>
      <Campo rotulo="Faixa" dica="Vale para todos os nomes; dá para mudar cada um depois.">
        <Selecao name="faixa" defaultValue={manter?.faixa ?? "adulto"}>
          <OpcoesFaixa />
        </Selecao>
      </Campo>
      <div>
        <BotaoEnviar pendente="Adicionando…">Adicionar</BotaoEnviar>
      </div>
    </form>
  );
}

export function FormConvite({
  convite,
  rotulosLado,
  grupos,
}: {
  convite: ConviteFamilia;
  rotulosLado: Record<Lado, string>;
  grupos: string[];
}) {
  const [estado, acao] = useActionState(salvarConvite, ESTADO_INICIAL);
  return (
    <form action={acao} className="flex flex-col gap-3">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <input type="hidden" name="id" value={convite.id} />
      <Campo rotulo="Nome do convite">
        <Entrada name="nome" required maxLength={120} defaultValue={convite.nome} />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="De quem">
          <Selecao name="lado" defaultValue={convite.lado}>
            <OpcoesLado rotulos={rotulosLado} />
          </Selecao>
        </Campo>
        <Campo rotulo="Grupo (opcional)">
          <Entrada name="grupo" list="grupos-convite" maxLength={60} defaultValue={convite.grupo ?? ""} />
          <ListaGrupos id="grupos-convite" grupos={grupos} />
        </Campo>
      </div>
      <div>
        <BotaoEnviar>Salvar convite</BotaoEnviar>
      </div>
    </form>
  );
}

export function FormPessoa({ pessoa, sozinha }: { pessoa: Pessoa; sozinha: boolean }) {
  const [estado, acao] = useActionState(salvarPessoa, ESTADO_INICIAL);
  return (
    <div className="flex flex-col gap-3">
      <form action={acao} className="flex flex-col gap-3">
        {estado.erro && <Aviso>{estado.erro}</Aviso>}
        {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
        <input type="hidden" name="id" value={pessoa.id} />
        <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
          <Campo rotulo="Nome">
            <Entrada name="nome" required maxLength={120} defaultValue={pessoa.nome} />
          </Campo>
          <Campo rotulo="Confirmação">
            <Selecao name="confirmacao" defaultValue={pessoa.confirmacao}>
              {Object.entries(CONFIRMACOES).map(([v, { rotulo }]) => (
                <option key={v} value={v}>
                  {rotulo}
                </option>
              ))}
            </Selecao>
          </Campo>
        </div>
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <Campo rotulo="Faixa">
            <Selecao name="faixa" defaultValue={pessoa.faixa}>
              <OpcoesFaixa />
            </Selecao>
          </Campo>
          <Campo rotulo="Idade">
            <Entrada name="idade" type="number" min={0} max={120} inputMode="numeric" defaultValue={pessoa.idade ?? ""} />
          </Campo>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Telefone (opcional)">
            <Entrada name="telefone" type="tel" maxLength={40} defaultValue={pessoa.telefone ?? ""} />
          </Campo>
          <Campo rotulo="E-mail (opcional)">
            <Entrada name="email" type="email" maxLength={254} defaultValue={pessoa.email ?? ""} />
          </Campo>
        </div>
        <Campo rotulo="Restrição alimentar (opcional)" dica="Alergias, vegetariano, sem glúten… vai para o buffet.">
          <Entrada name="restricao_alimentar" maxLength={500} defaultValue={pessoa.restricaoAlimentar ?? ""} />
        </Campo>
        <Campo rotulo="Observação (opcional)">
          <AreaTexto name="observacao" maxLength={2000} rows={2} defaultValue={pessoa.observacao ?? ""} />
        </Campo>
        <div>
          <BotaoEnviar variante="secundario">Salvar</BotaoEnviar>
        </div>
      </form>
      <ExcluirPessoa pessoa={pessoa} sozinha={sozinha} />
    </div>
  );
}

function ExcluirPessoa({ pessoa, sozinha }: { pessoa: Pessoa; sozinha: boolean }) {
  const [confirmando, setConfirmando] = useState(false);
  if (!confirmando) {
    return (
      <div>
        <Botao type="button" variante="perigo" className="px-3 py-1.5" onClick={() => setConfirmando(true)}>
          Excluir {pessoa.nome}
        </Botao>
      </div>
    );
  }
  return (
    <form action={excluirPessoa} className="flex flex-wrap items-center gap-2" role="alert">
      <input type="hidden" name="id" value={pessoa.id} />
      <input type="hidden" name="convite_id" value={pessoa.conviteId} />
      <span className="text-sm">
        Excluir {pessoa.nome}?{sozinha && " É a única pessoa: o convite sai junto."}
      </span>
      <BotaoEnviar variante="perigo" pendente="Excluindo…">
        Sim, excluir
      </BotaoEnviar>
      <Botao type="button" variante="fantasma" onClick={() => setConfirmando(false)}>
        Cancelar
      </Botao>
    </form>
  );
}

export function FormAdicionarPessoa({ conviteId }: { conviteId: string }) {
  const [estado, acao] = useActionState(adicionarPessoa, ESTADO_INICIAL);
  const manter = estado.erro ? estado.campos : undefined;
  return (
    <form action={acao} key={estado.ok ?? ""} className="flex flex-col gap-3">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <input type="hidden" name="convite_id" value={conviteId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <Campo rotulo="Nome">
          <Entrada name="nome" required maxLength={120} defaultValue={manter?.nome} />
        </Campo>
        <Campo rotulo="Faixa">
          <Selecao name="faixa" defaultValue={manter?.faixa ?? "adulto"}>
            <OpcoesFaixa />
          </Selecao>
        </Campo>
      </div>
      <div>
        <BotaoEnviar pendente="Adicionando…">Adicionar ao convite</BotaoEnviar>
      </div>
    </form>
  );
}

export function ExcluirConvite({ convite }: { convite: ConviteFamilia }) {
  const [confirmando, setConfirmando] = useState(false);
  if (!confirmando) {
    return (
      <Botao type="button" variante="perigo" onClick={() => setConfirmando(true)}>
        Excluir convite
      </Botao>
    );
  }
  const n = convite.pessoas.length;
  return (
    <form action={excluirConvite} className="flex flex-wrap items-center gap-2" role="alert">
      <input type="hidden" name="id" value={convite.id} />
      <span className="text-sm">
        Excluir “{convite.nome}”{n > 1 ? ` e as ${n} pessoas dele` : ""}? Isso não tem volta.
      </span>
      <BotaoEnviar variante="perigo" pendente="Excluindo…">
        Sim, excluir
      </BotaoEnviar>
      <Botao type="button" variante="fantasma" onClick={() => setConfirmando(false)}>
        Cancelar
      </Botao>
    </form>
  );
}
