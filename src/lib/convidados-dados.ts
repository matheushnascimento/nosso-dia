import "server-only";
import { consultar, type ContextoComEvento } from "@/lib/dal";
import type { ConviteFamilia, Pessoa } from "@/lib/convidados";

const COLUNAS_PESSOA = [
  "id", "convite_id", "nome", "faixa", "idade", "confirmacao",
  "telefone", "email", "restricao_alimentar", "observacao",
] as const;

type LinhaPessoa = {
  id: string;
  convite_id: string;
  nome: string;
  faixa: Pessoa["faixa"];
  idade: number | null;
  confirmacao: Pessoa["confirmacao"];
  telefone: string | null;
  email: string | null;
  restricao_alimentar: string | null;
  observacao: string | null;
};

function paraPessoa(l: LinhaPessoa): Pessoa {
  return {
    id: l.id,
    conviteId: l.convite_id,
    nome: l.nome,
    faixa: l.faixa,
    idade: l.idade,
    confirmacao: l.confirmacao,
    telefone: l.telefone,
    email: l.email,
    restricaoAlimentar: l.restricao_alimentar,
    observacao: l.observacao,
  };
}

/** Convites em ordem alfabética, cada um com as pessoas na ordem de cadastro. */
export async function listarConvites(ctx: ContextoComEvento): Promise<ConviteFamilia[]> {
  const { convites, pessoas } = await consultar(ctx, async (trx) => ({
    convites: await trx
      .selectFrom("convites_familia")
      .select(["id", "nome", "lado", "grupo"])
      .where("evento_id", "=", ctx.evento.id)
      .execute(),
    pessoas: await trx
      .selectFrom("pessoas")
      .select(COLUNAS_PESSOA)
      .where("evento_id", "=", ctx.evento.id)
      .orderBy("ordem")
      .orderBy("criado_em")
      .execute(),
  }));
  const porConvite = new Map<string, Pessoa[]>();
  for (const p of pessoas) porConvite.set(p.convite_id, [...(porConvite.get(p.convite_id) ?? []), paraPessoa(p)]);
  return convites
    .map((c) => ({ ...c, pessoas: porConvite.get(c.id) ?? [] }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** null se não existe ou não é do casamento (o RLS também esconde). */
export async function obterConvite(ctx: ContextoComEvento, id: string): Promise<ConviteFamilia | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { convite, pessoas } = await consultar(ctx, async (trx) => ({
    convite: await trx
      .selectFrom("convites_familia")
      .select(["id", "nome", "lado", "grupo"])
      .where("id", "=", id)
      .where("evento_id", "=", ctx.evento.id)
      .executeTakeFirst(),
    pessoas: await trx
      .selectFrom("pessoas")
      .select(COLUNAS_PESSOA)
      .where("convite_id", "=", id)
      .where("evento_id", "=", ctx.evento.id)
      .orderBy("ordem")
      .orderBy("criado_em")
      .execute(),
  }));
  return convite ? { ...convite, pessoas: pessoas.map(paraPessoa) } : null;
}
