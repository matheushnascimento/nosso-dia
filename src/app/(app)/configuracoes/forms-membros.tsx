"use client";

import { useActionState, useRef, useState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Aviso, Botao, Campo, Entrada } from "@/components/ui";
import { ESTADO_INICIAL } from "@/lib/erros";
import { convidarParceiro, salvarMeuNome } from "./actions";

export function FormMeuNome({ nome }: { nome: string }) {
  const [estado, acao] = useActionState(salvarMeuNome, ESTADO_INICIAL);
  return (
    <form action={acao} className="flex flex-col gap-3">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <div className="flex gap-2">
        <Entrada name="nome" required defaultValue={nome} aria-label="Seu nome" />
        <BotaoEnviar variante="secundario">Salvar</BotaoEnviar>
      </div>
    </form>
  );
}

export function FormConvidar() {
  const [estado, acao] = useActionState(convidarParceiro, ESTADO_INICIAL);
  return (
    <form action={acao} className="flex flex-col gap-3">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <Campo rotulo="E-mail do seu amor" dica="O convite vale por 7 dias. Ele(a) precisa entrar com este e-mail.">
        <div className="flex gap-2">
          <Entrada name="email" type="email" required defaultValue={estado.campos?.email} />
          <BotaoEnviar pendente="Criando…">Convidar</BotaoEnviar>
        </div>
      </Campo>
    </form>
  );
}

/**
 * `navigator.clipboard` só existe em contexto seguro (HTTPS ou localhost). Abrindo pelo IP ou nome
 * da máquina (http://homeserver:3000) ele é `undefined`; aí caímos no `execCommand("copy")` sobre o
 * campo selecionado e, se nem isso der, deixamos o link selecionado para copiar à mão.
 */
async function copiar(texto: string, campo: HTMLInputElement | null): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // permissão negada: tenta o caminho antigo
  }
  if (!campo) return false;
  campo.focus();
  campo.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  }
}

export function CopiarLink({ link }: { link: string }) {
  const [situacao, setSituacao] = useState<"" | "copiado" | "manual">("");
  const campo = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Entrada
          ref={campo}
          readOnly
          value={link}
          aria-label="Link do convite"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Botao
          type="button"
          variante="secundario"
          onClick={async () => {
            setSituacao((await copiar(link, campo.current)) ? "copiado" : "manual");
            setTimeout(() => setSituacao(""), 4000);
          }}
        >
          {situacao === "copiado" ? "Copiado!" : "Copiar"}
        </Botao>
      </div>
      {situacao === "manual" && (
        <p className="text-sm text-tinta-suave" role="status">
          Não deu para copiar sozinho. O link está selecionado: use Ctrl+C (ou toque e segure).
        </p>
      )}
    </div>
  );
}
