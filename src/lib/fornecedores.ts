import "server-only";
import type { Selectable } from "kysely";
import { consultar, type ContextoComEvento } from "@/lib/dal";
import type { Fornecedores } from "@/lib/db.types";
import { CATEGORIAS_FORNECEDOR, STATUS_FORNECEDOR, type CategoriaFornecedor, type StatusFornecedor } from "@/lib/rotulos";

export type Fornecedor = {
  id: string;
  categoria: CategoriaFornecedor;
  nome: string;
  telefone: string | null;
  email: string | null;
  instagram: string | null;
  site: string | null;
  status: StatusFornecedor;
  valorOrcado: number | null;
  valorContratado: number | null;
  notas: string | null;
  detalhes: Record<string, unknown>;
  atualizadoEm: string;
};

function normalizar(f: Selectable<Fornecedores>): Fornecedor {
  return {
    id: f.id,
    categoria: f.categoria as CategoriaFornecedor, // o banco garante a lista
    nome: f.nome,
    telefone: f.telefone,
    email: f.email,
    instagram: f.instagram,
    site: f.site,
    status: f.status,
    valorOrcado: f.valor_orcado_centavos,
    valorContratado: f.valor_contratado_centavos,
    notas: f.notas,
    detalhes: (f.detalhes ?? {}) as Record<string, unknown>,
    atualizadoEm: f.atualizado_em,
  };
}

const ORDEM_CATEGORIA = Object.keys(CATEGORIAS_FORNECEDOR);
const ORDEM_STATUS = Object.keys(STATUS_FORNECEDOR);

/** Por categoria (ordem da lista), depois pelo funil (contratado por último, descartado no fim) e nome. */
export function compararFornecedores(a: Fornecedor, b: Fornecedor): number {
  return (
    ORDEM_CATEGORIA.indexOf(a.categoria) - ORDEM_CATEGORIA.indexOf(b.categoria) ||
    ORDEM_STATUS.indexOf(a.status) - ORDEM_STATUS.indexOf(b.status) ||
    a.nome.localeCompare(b.nome, "pt-BR")
  );
}

export async function listarFornecedores(ctx: ContextoComEvento): Promise<Fornecedor[]> {
  const linhas = await consultar(ctx, (trx) =>
    trx.selectFrom("fornecedores").selectAll().where("evento_id", "=", ctx.evento.id).execute(),
  );
  return linhas.map(normalizar).sort(compararFornecedores);
}

/** null se não existe ou não é do casamento (o RLS também esconde). */
export async function obterFornecedor(ctx: ContextoComEvento, id: string): Promise<Fornecedor | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const linha = await consultar(ctx, (trx) =>
    trx
      .selectFrom("fornecedores")
      .selectAll()
      .where("id", "=", id)
      .where("evento_id", "=", ctx.evento.id)
      .executeTakeFirst(),
  );
  return linha ? normalizar(linha) : null;
}

/** "3 pesquisando · 1 contratado", na ordem do funil. */
export function resumoPorStatus(lista: Fornecedor[]): string {
  const contagem = new Map<StatusFornecedor, number>();
  for (const f of lista) contagem.set(f.status, (contagem.get(f.status) ?? 0) + 1);
  return (Object.keys(STATUS_FORNECEDOR) as StatusFornecedor[])
    .filter((s) => contagem.get(s))
    .map((s) => `${contagem.get(s)} ${STATUS_FORNECEDOR[s].rotulo.toLowerCase()}`)
    .join(" · ");
}
