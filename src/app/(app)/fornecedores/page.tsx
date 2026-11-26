import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BotaoLink, Cartao, Esqueleto, Selecao, Selo, Titulo, cx } from "@/components/ui";
import { requireEvento } from "@/lib/dal";
import { formatarBRL } from "@/lib/formato";
import { listarFornecedores, resumoPorStatus, type Fornecedor } from "@/lib/fornecedores";
import {
  CATEGORIAS_FORNECEDOR,
  STATUS_FORNECEDOR,
  ehStatusFornecedor,
  type CategoriaFornecedor,
} from "@/lib/rotulos";

export const metadata: Metadata = { title: "Fornecedores" };

export default function Fornecedores({ searchParams }: PageProps<"/fornecedores">) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Titulo>Fornecedores</Titulo>
        <BotaoLink href="/fornecedores/novo">Novo fornecedor</BotaoLink>
      </div>
      <Suspense fallback={<Esqueleto className="h-[24rem]" />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/fornecedores">["searchParams"] }) {
  const ctx = await requireEvento();
  const [todos, sp] = await Promise.all([listarFornecedores(ctx), searchParams]);
  const bruto = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status = bruto && ehStatusFornecedor(bruto) ? bruto : "";

  if (todos.length === 0) {
    return (
      <Cartao className="flex flex-col items-start gap-3">
        <p className="font-serif text-xl">Nenhum fornecedor ainda</p>
        <p className="text-tinta-suave">
          Anotem aqui cada fornecedor que estão pesquisando, do primeiro contato até o contrato. Os dois veem e editam.
        </p>
        <BotaoLink href="/fornecedores/novo">Cadastrar o primeiro</BotaoLink>
      </Cartao>
    );
  }

  const porCategoria = new Map<CategoriaFornecedor, Fornecedor[]>();
  for (const f of todos) porCategoria.set(f.categoria, [...(porCategoria.get(f.categoria) ?? []), f]);

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-wrap items-end gap-2" aria-label="Filtros">
        <Selecao name="status" defaultValue={status} aria-label="Situação" className="w-auto">
          <option value="">Todas as situações</option>
          {Object.entries(STATUS_FORNECEDOR).map(([valor, { rotulo }]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Selecao>
        <button className="rounded-full border border-linha bg-cartao px-4 py-2.5 text-sm hover:border-tinta/40">Filtrar</button>
        {status && (
          <Link href="/fornecedores" className="px-2 py-2.5 text-sm text-tinta-suave hover:text-tinta">
            Limpar
          </Link>
        )}
      </form>

      {[...porCategoria].map(([categoria, lista]) => {
        const visiveis = status ? lista.filter((f) => f.status === status) : lista;
        if (!visiveis.length) return null;
        return (
          <Cartao key={categoria} className="py-4 sm:py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="font-serif text-xl">{CATEGORIAS_FORNECEDOR[categoria]}</h2>
              <span className="text-sm text-tinta-suave">{resumoPorStatus(lista)}</span>
            </div>
            <ul className="mt-2 divide-y divide-linha">
              {visiveis.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/fornecedores/${f.id}`}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 hover:text-rose"
                  >
                    <span className={cx("font-medium", f.status === "descartado" && "text-tinta-suave line-through")}>
                      {f.nome}
                    </span>
                    <span className="flex items-center gap-3 text-sm">
                      <Valor f={f} />
                      <Selo tom={STATUS_FORNECEDOR[f.status].tom}>{STATUS_FORNECEDOR[f.status].rotulo}</Selo>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={`/fornecedores/novo?categoria=${categoria}`}
              className="mt-1 inline-block text-sm text-tinta-suave underline-offset-4 hover:text-tinta hover:underline"
            >
              + Adicionar em {CATEGORIAS_FORNECEDOR[categoria]}
            </Link>
          </Cartao>
        );
      })}

      {status && ![...porCategoria.values()].some((l) => l.some((f) => f.status === status)) && (
        <Cartao>
          <p className="py-6 text-center text-tinta-suave">Nenhum fornecedor nessa situação.</p>
        </Cartao>
      )}
    </div>
  );
}

function Valor({ f }: { f: Fornecedor }) {
  if (f.valorContratado !== null) return <span>{formatarBRL(f.valorContratado)}</span>;
  if (f.valorOrcado !== null) return <span className="text-tinta-suave">orçado {formatarBRL(f.valorOrcado)}</span>;
  return null;
}
