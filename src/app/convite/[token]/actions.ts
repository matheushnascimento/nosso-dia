"use server";

import { sql } from "kysely";
import { redirect } from "next/navigation";
import { consultar, requireSessao } from "@/lib/dal";
import { mensagemDeErro, type EstadoForm } from "@/lib/erros";
import { texto } from "@/lib/formato";

export async function aceitarConvite(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const sessao = await requireSessao();
  try {
    // aceitar_convite confere que o e-mail da sessão (auth.jwt()) é o convidado
    await consultar(sessao, (trx) => sql`select aceitar_convite(${texto(fd, "token")}::uuid)`.execute(trx));
  } catch (e) {
    return { erro: mensagemDeErro(e, "Não foi possível aceitar o convite.") };
  }
  redirect("/painel");
}
