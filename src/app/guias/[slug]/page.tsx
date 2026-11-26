import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/ui";
import { listarGuias, obterGuia } from "@/conteudo/guias";
import { ConteudoDoGuia, EsqueletoDoGuia } from "./conteudo-do-guia";

export function generateStaticParams() {
  return listarGuias().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guias/[slug]">): Promise<Metadata> {
  const guia = obterGuia((await params).slug);
  return guia ? { title: guia.titulo, description: guia.resumo } : {};
}

// O casco (logo e link de voltar) não depende da URL e fica fora do <Suspense>; a leitura de
// `params` e o conteúdo do guia ficam no filho, para a navegação mostrar o casco na hora.
export default function PaginaGuia({ params }: PageProps<"/guias/[slug]">) {
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

      <Suspense fallback={<EsqueletoDoGuia />}>
        <ConteudoDoGuia params={params} />
      </Suspense>
    </div>
  );
}
