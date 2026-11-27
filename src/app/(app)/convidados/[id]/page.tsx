import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cartao, Esqueleto, Titulo } from "@/components/ui";
import { gruposParaSugerir, rotulosLado } from "@/lib/convidados";
import { listarConvites, obterConvite } from "@/lib/convidados-dados";
import { getMembros, requireEvento } from "@/lib/dal";
import { pluralizar } from "@/lib/formato";
import { ExcluirConvite, FormAdicionarPessoa, FormConvite, FormPessoa } from "../form-convidados";

export const metadata: Metadata = { title: "Convite" };

export default function PaginaConvite({ params }: PageProps<"/convidados/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/convidados" className="text-sm text-tinta-suave hover:text-tinta">
        ← Convidados
      </Link>
      <Suspense fallback={<Esqueleto className="h-[36rem]" />}>
        <Conteudo params={params} />
      </Suspense>
    </div>
  );
}

async function Conteudo({ params }: { params: PageProps<"/convidados/[id]">["params"] }) {
  const ctx = await requireEvento();
  const { id } = await params;
  const [convite, membros, todos] = await Promise.all([obterConvite(ctx, id), getMembros(ctx), listarConvites(ctx)]);
  if (!convite) notFound();
  const lados = rotulosLado(membros);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Titulo>{convite.nome}</Titulo>
        <p className="mt-1 text-tinta-suave">
          {pluralizar(convite.pessoas.length, "pessoa", "pessoas")} · {lados[convite.lado]}
          {convite.grupo && ` · ${convite.grupo}`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {convite.pessoas.map((p) => (
            <Cartao key={p.id}>
              <FormPessoa pessoa={p} sozinha={convite.pessoas.length === 1} />
            </Cartao>
          ))}
          <Cartao>
            <p className="mb-4 font-serif text-xl">Mais alguém neste convite</p>
            <FormAdicionarPessoa conviteId={convite.id} />
          </Cartao>
        </div>

        <aside className="flex flex-col gap-4">
          <Cartao>
            <p className="mb-4 font-serif text-xl">Convite</p>
            <FormConvite convite={convite} rotulosLado={lados} grupos={gruposParaSugerir(todos)} />
          </Cartao>
          <div>
            <ExcluirConvite convite={convite} />
          </div>
        </aside>
      </div>
    </div>
  );
}
