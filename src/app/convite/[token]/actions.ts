"use server";

import { redirect } from "next/navigation";
import { requireSessao } from "@/lib/dal";
import { mensagemDeErro, type EstadoForm } from "@/lib/erros";
import { texto } from "@/lib/formato";

export async function aceitarConvite(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { supabase } = await requireSessao();
  const { error } = await supabase.rpc("aceitar_convite", { p_token: texto(fd, "token") });
  if (error) return { erro: mensagemDeErro(error, "Não foi possível aceitar o convite.") };
  redirect("/painel");
}
