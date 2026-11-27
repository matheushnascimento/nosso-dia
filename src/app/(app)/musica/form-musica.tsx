"use client";

import { useActionState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Aviso, Botao, Campo, Entrada, Selecao } from "@/components/ui";
import { ESTADO_INICIAL } from "@/lib/erros";
import { MOMENTOS } from "@/lib/musica";
import { adicionarMusica } from "./actions";

export function FormMusica() {
  const [estado, acao] = useActionState(adicionarMusica, ESTADO_INICIAL);
  const manter = estado.erro ? estado.campos : undefined;
  return (
    <form action={acao} key={estado.ok ?? JSON.stringify(estado.campos ?? {})} className="flex flex-col gap-3">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <Campo rotulo="Momento">
        <Selecao name="momento" defaultValue={estado.campos?.momento ?? "entrada_noivos"}>
          {Object.entries(MOMENTOS).map(([v, { rotulo }]) => (
            <option key={v} value={v}>
              {rotulo}
            </option>
          ))}
        </Selecao>
      </Campo>
      <Campo rotulo="Música">
        <Entrada name="titulo" required maxLength={200} defaultValue={manter?.titulo} placeholder="Ex.: Canon in D" />
      </Campo>
      <Campo rotulo="Artista (opcional)">
        <Entrada name="artista" maxLength={200} defaultValue={manter?.artista} />
      </Campo>
      <Campo rotulo="Link (opcional)" dica="Spotify, YouTube… para o DJ achar a versão certa.">
        <Entrada name="link" type="url" maxLength={2000} defaultValue={manter?.link} placeholder="https://…" />
      </Campo>
      <div>
        <BotaoEnviar pendente="Adicionando…">Adicionar</BotaoEnviar>
      </div>
    </form>
  );
}

export function BotaoImprimir({ desabilitado }: { desabilitado: boolean }) {
  return (
    <Botao type="button" variante="secundario" onClick={() => window.print()} disabled={desabilitado}>
      Imprimir a setlist
    </Botao>
  );
}
