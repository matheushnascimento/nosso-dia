import { notFound } from "next/navigation";
import { Esqueleto } from "@/components/ui";
import { obterGuia } from "@/conteudo/guias";

/** Lê o slug da URL e renderiza o guia. Fica dentro de `<Suspense>` na página para que o
 *  casco (logo e link de voltar) não dependa da URL. */
export async function ConteudoDoGuia({ params }: Pick<PageProps<"/guias/[slug]">, "params">) {
  const guia = obterGuia((await params).slug);
  if (!guia) notFound();
  const { Conteudo } = guia;

  return (
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

      <div className="mt-8 space-y-4 leading-relaxed [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-medium [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1 [&_a]:underline [&_a]:decoration-rose/50 [&_a]:underline-offset-4 [&_a:hover]:decoration-rose">
        <Conteudo />
      </div>
    </article>
  );
}

/** Fallback com o formato aproximado do guia: rótulo, título, resumo e parágrafos. */
export function EsqueletoDoGuia() {
  return (
    <div aria-hidden className="space-y-4">
      <Esqueleto className="h-4 w-16" />
      <Esqueleto className="h-12 w-3/4" />
      <Esqueleto className="h-6 w-full" />
      <Esqueleto className="mt-8 h-40 w-full" />
    </div>
  );
}
