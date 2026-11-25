import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui";
import { listarGuias, obterGuia } from "@/conteudo/guias";

export function generateStaticParams() {
  return listarGuias().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guias/[slug]">): Promise<Metadata> {
  const guia = obterGuia((await params).slug);
  return guia ? { title: guia.titulo, description: guia.resumo } : {};
}

export default async function PaginaGuia({ params }: PageProps<"/guias/[slug]">) {
  const guia = obterGuia((await params).slug);
  if (!guia) notFound();
  const { Conteudo } = guia;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:px-6">
      <header className="mb-10 flex items-center justify-between">
        <Link href="/painel">
          <Logo />
        </Link>
        <Link href="/tarefas" className="text-sm text-tinta-suave hover:text-tinta">
          ← Voltar às tarefas
        </Link>
      </header>

      <article>
        <p className="mb-3 text-sm uppercase tracking-[0.2em] text-rose">Guia</p>
        <h1 className="font-serif text-4xl font-medium leading-tight sm:text-5xl">{guia.titulo}</h1>
        <p className="mt-3 text-lg text-tinta-suave">{guia.resumo}</p>

        {guia.informativo && (
          <p role="note" className="mt-6 rounded-xl bg-rose-claro px-4 py-3 text-sm">
            {guia.aviso ??
              "Conteúdo informativo. Exigências e prazos podem variar; confirme com o órgão ou profissional responsável na sua cidade."}
          </p>
        )}

        <div className="mt-8 space-y-4 leading-relaxed [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-medium [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
          <Conteudo />
        </div>
      </article>
    </div>
  );
}
