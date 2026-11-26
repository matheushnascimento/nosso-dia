import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { noBanco, type Trx } from "@/lib/db";
import type { Evento } from "@/lib/tipos";

/**
 * Data Access Layer: o único lugar que lê a sessão.
 * Server Components e Server Actions passam sempre por aqui.
 * Toda leitura de sessão precisa estar dentro de um <Suspense> (cacheComponents).
 */

export type Sessao = {
  userId: string;
  email: string;
};

/** Sessão do Better Auth validada no banco (não só o cookie). */
export const getSessao = cache(async (): Promise<Sessao | null> => {
  // `headers()` antes de `auth()`: marca a leitura como dinâmica sem criar o Better Auth no build.
  const cabecalhos = await headers();
  const resultado = await auth().api.getSession({ headers: cabecalhos });
  if (!resultado) return null;
  return { userId: resultado.user.id, email: resultado.user.email.toLowerCase() };
});

export async function requireSessao(): Promise<Sessao> {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  return sessao;
}

/** Roda consultas como o usuário logado: papel `authenticated`, RLS e `auth.uid()` valendo. */
export function consultar<T>(sessao: Sessao, fn: (trx: Trx) => Promise<T>): Promise<T> {
  return noBanco(sessao, fn);
}

export type Contexto = Sessao & {
  nome: string;
  evento: Evento | null;
};

export const getContexto = cache(async (): Promise<Contexto> => {
  const sessao = await requireSessao();
  return consultar(sessao, async (trx) => {
    const [perfil, evento] = await Promise.all([
      trx.selectFrom("perfis").select("nome").where("id", "=", sessao.userId).executeTakeFirst(),
      trx
        .selectFrom("membros")
        .innerJoin("eventos", "eventos.id", "membros.evento_id")
        .selectAll("eventos")
        .where("membros.usuario_id", "=", sessao.userId)
        .executeTakeFirst(),
    ]);
    return { ...sessao, nome: perfil?.nome ?? "", evento: evento ?? null };
  });
});

export type ContextoComEvento = Contexto & { evento: Evento };

/** Exige usuário logado E com casamento criado; senão manda para o onboarding. */
export async function requireEvento(): Promise<ContextoComEvento> {
  const ctx = await getContexto();
  if (!ctx.evento) redirect("/onboarding");
  return ctx as ContextoComEvento;
}

export type Membro = { usuarioId: string; nome: string; souEu: boolean };

export async function getMembros(ctx: ContextoComEvento): Promise<Membro[]> {
  const linhas = await consultar(ctx, (trx) =>
    trx
      .selectFrom("membros")
      .leftJoin("perfis", "perfis.id", "membros.usuario_id")
      .select(["membros.usuario_id", "perfis.nome"])
      .where("membros.evento_id", "=", ctx.evento.id)
      .orderBy("membros.criado_em")
      .execute(),
  );
  return linhas.map((m) => ({
    usuarioId: m.usuario_id,
    nome: m.nome || "Sem nome",
    souEu: m.usuario_id === ctx.userId,
  }));
}
