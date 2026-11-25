"use client";

import { useActionState, useState } from "react";
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

export function CopiarLink({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="flex gap-2">
      <Entrada readOnly value={link} aria-label="Link do convite" onFocus={(e) => e.currentTarget.select()} />
      <Botao
        type="button"
        variante="secundario"
        onClick={async () => {
          await navigator.clipboard.writeText(link);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }}
      >
        {copiado ? "Copiado!" : "Copiar"}
      </Botao>
    </div>
  );
}
