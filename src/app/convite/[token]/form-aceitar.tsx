"use client";

import { useActionState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Aviso } from "@/components/ui";
import { ESTADO_INICIAL } from "@/lib/erros";
import { aceitarConvite } from "./actions";

export function FormAceitar({ token }: { token: string }) {
  const [estado, acao] = useActionState(aceitarConvite, ESTADO_INICIAL);
  return (
    <form action={acao} className="flex flex-col gap-3">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <input type="hidden" name="token" value={token} />
      <BotaoEnviar pendente="Entrando…">Aceitar e começar a planejar</BotaoEnviar>
    </form>
  );
}
