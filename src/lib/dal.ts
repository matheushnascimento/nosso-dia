import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import type { Tables } from "@/lib/database.types";
import { createClient, type SupabaseServer } from "@/lib/supabase/server";

/**
 * Data Access Layer: o único lugar que lê a sessão.
 * Server Components e Server Actions passam sempre por aqui.
 * Toda leitura de sessão precisa estar dentro de um <Suspense> (cacheComponents).
 */

export type Sessao = {
  /** TEMPORÁRIO (até a #27): cliente Supabase sem sessão. As leituras de dados passam a ser SQL na #27. */
  supabase: SupabaseServer;
  userId: string;
  email: string;
};

/** Sessão do Better Auth validada no banco (não só o cookie). */
export const getSessao = cache(async (): Promise<Sessao | null> => {
  // `headers()` antes de `auth()`: marca a leitura como dinâmica sem criar o Better Auth no build.
  const cabecalhos = await headers();
  const resultado = await auth().api.getSession({ headers: cabecalhos });
  if (!resultado) return null;
  return {
    supabase: await createClient(),
    userId: resultado.user.id,
    email: resultado.user.email.toLowerCase(),
  };
});

export async function requireSessao(): Promise<Sessao> {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  return sessao;
}

export type Contexto = Sessao & {
  nome: string;
  evento: Tables<"eventos"> | null;
};

export const getContexto = cache(async (): Promise<Contexto> => {
  const sessao = await requireSessao();
  const { supabase, userId } = sessao;

  const [{ data: perfil }, { data: membro }] = await Promise.all([
    supabase.from("perfis").select("nome").eq("id", userId).maybeSingle(),
    supabase.from("membros").select("evento_id").eq("usuario_id", userId).maybeSingle(),
  ]);

  let evento: Tables<"eventos"> | null = null;
  if (membro) {
    const { data } = await supabase.from("eventos").select("*").eq("id", membro.evento_id).single();
    evento = data;
  }

  return { ...sessao, nome: perfil?.nome ?? "", evento };
});

export type ContextoComEvento = Contexto & { evento: Tables<"eventos"> };

/** Exige usuário logado E com casamento criado; senão manda para o onboarding. */
export async function requireEvento(): Promise<ContextoComEvento> {
  const ctx = await getContexto();
  if (!ctx.evento) redirect("/onboarding");
  return ctx as ContextoComEvento;
}

export type Membro = { usuarioId: string; nome: string; souEu: boolean };

export async function getMembros(ctx: ContextoComEvento): Promise<Membro[]> {
  const { data } = await ctx.supabase
    .from("membros")
    .select("usuario_id, criado_em, perfis(nome)")
    .eq("evento_id", ctx.evento.id)
    .order("criado_em");
  return (data ?? []).map((m) => ({
    usuarioId: m.usuario_id,
    nome: m.perfis?.nome || "Sem nome",
    souEu: m.usuario_id === ctx.userId,
  }));
}
