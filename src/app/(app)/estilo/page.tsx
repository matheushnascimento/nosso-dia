import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cartao, Esqueleto, Titulo } from "@/components/ui";
import { contar } from "@/lib/convidados";
import { listarConvites } from "@/lib/convidados-dados";
import { requireEvento } from "@/lib/dal";
import { carregarEstilo, listarReferencias, type Referencia } from "@/lib/estilo-dados";
import { CATEGORIAS_FORNECEDOR, type CategoriaFornecedor } from "@/lib/rotulos";
import { FormEstilo } from "./form-estilo";
import { ExcluirReferencia, FormReferencia } from "./referencias";

export const metadata: Metadata = { title: "Estilo e formato" };

export default function PaginaEstilo() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Titulo>Estilo e formato</Titulo>
        <p className="mt-2 max-w-2xl text-tinta-suave">
          Algumas respostas trazem tarefas próprias para o checklist (por exemplo, o plano B de um casamento ao ar livre).
          Dá para mudar quando quiserem.
        </p>
      </div>
      <Suspense fallback={<Esqueleto className="h-[36rem]" />}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  const ctx = await requireEvento();
  const [estilo, referencias, convites] = await Promise.all([
    carregarEstilo(ctx),
    listarReferencias(ctx),
    listarConvites(ctx),
  ]);
  // número real quando a lista já começou; senão, a estimativa
  const naLista = contar(convites).pessoas;
  const estimados = ctx.evento.convidados_estimados;

  const porCategoria = new Map<CategoriaFornecedor, Referencia[]>();
  for (const r of referencias) porCategoria.set(r.categoria, [...(porCategoria.get(r.categoria) ?? []), r]);
  const ordem = Object.keys(CATEGORIAS_FORNECEDOR) as CategoriaFornecedor[];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <Cartao>
        <p className="mb-4 text-sm text-tinta-suave">
          {naLista > 0 ? (
            <>
              Convidados: {naLista} na lista ·{" "}
              <Link href="/convidados" className="underline underline-offset-4 hover:text-tinta">
                ver a lista
              </Link>
            </>
          ) : (
            <>
              Convidados: {estimados ? `cerca de ${estimados}` : "ainda não informado"} ·{" "}
              <Link href="/configuracoes" className="underline underline-offset-4 hover:text-tinta">
                mudar em Configurações
              </Link>
            </>
          )}
        </p>
        <FormEstilo opcoes={estilo.opcoes} respostas={estilo.respostas} />
      </Cartao>

      <aside className="flex flex-col gap-6">
        <Cartao>
          <p className="mb-1 font-serif text-xl">Referências</p>
          <p className="mb-4 text-sm text-tinta-suave">Links de inspiração (Pinterest, Instagram, sites) para mostrar aos fornecedores.</p>
          <FormReferencia />
        </Cartao>
        {ordem
          .filter((c) => porCategoria.has(c))
          .map((c) => (
            <Cartao key={c} className="py-4">
              <p className="font-serif text-lg">{CATEGORIAS_FORNECEDOR[c]}</p>
              <ul className="mt-2 flex flex-col gap-3">
                {porCategoria.get(c)!.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="block truncate underline-offset-4 hover:text-rose hover:underline"
                      >
                        {new URL(r.url).hostname.replace(/^www\./, "")}
                        {new URL(r.url).pathname !== "/" && <span className="text-tinta-suave">{new URL(r.url).pathname}</span>}
                      </a>
                      {r.nota && <p className="mt-0.5 text-tinta-suave">{r.nota}</p>}
                    </div>
                    <ExcluirReferencia id={r.id} />
                  </li>
                ))}
              </ul>
            </Cartao>
          ))}
      </aside>
    </div>
  );
}
