import type { Metadata } from "next";
import { Suspense } from "react";
import { Cartao, Esqueleto, Titulo } from "@/components/ui";
import { requireEvento } from "@/lib/dal";
import { MOMENTOS, type Momento } from "@/lib/musica";
import { listarMusicas, type Musica } from "@/lib/musica-dados";
import { excluirMusica, moverMusica } from "./actions";
import { BotaoImprimir, FormMusica } from "./form-musica";

export const metadata: Metadata = { title: "Música" };

export default function PaginaMusica() {
  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <Titulo>Música</Titulo>
        <p className="mt-2 max-w-2xl text-tinta-suave">
          A setlist de cada momento, para entregar ao DJ, à banda e aos músicos da cerimônia. Os dois veem e editam.
        </p>
      </div>
      <Suspense fallback={<Esqueleto className="h-[32rem]" />}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  const ctx = await requireEvento();
  const musicas = await listarMusicas(ctx);
  const comMusica = [...musicas].filter(([, lista]) => lista.length > 0);

  return (
    <>
      <div className="grid gap-6 print:hidden lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          {[...musicas].map(([momento, lista]) => (
            <Cartao key={momento} className="py-4 sm:py-5">
              <h2 className="font-serif text-xl">{MOMENTOS[momento].rotulo}</h2>
              {MOMENTOS[momento].dica && <p className="text-sm text-tinta-suave">{MOMENTOS[momento].dica}</p>}
              {lista.length === 0 ? (
                <p className="mt-2 text-sm text-tinta-suave/80">Nenhuma música ainda.</p>
              ) : (
                <ol className="mt-2 divide-y divide-linha">
                  {lista.map((m, i) => (
                    <ItemMusica key={m.id} m={m} primeira={i === 0} ultima={i === lista.length - 1} />
                  ))}
                </ol>
              )}
            </Cartao>
          ))}
        </div>
        <aside className="flex flex-col gap-4">
          <Cartao className="lg:sticky lg:top-6">
            <p className="mb-4 font-serif text-xl">Adicionar música</p>
            <FormMusica />
          </Cartao>
          <BotaoImprimir desabilitado={comMusica.length === 0} />
        </aside>
      </div>

      {/* Versão impressa: só os momentos com música. */}
      <article className="hidden print:block">
        <p className="mb-1 text-sm uppercase tracking-[0.2em]">Setlist</p>
        <h1 className="mb-8 font-serif text-3xl">{ctx.evento.nome_exibicao}</h1>
        {comMusica.map(([momento, lista]) => (
          <section key={momento} className="mb-6 break-inside-avoid">
            <h2 className="mb-2 font-serif text-xl">{MOMENTOS[momento as Momento].rotulo}</h2>
            <ol className="list-inside list-decimal space-y-1">
              {lista.map((m) => (
                <li key={m.id}>
                  {m.titulo}
                  {m.artista && <span> · {m.artista}</span>}
                  {m.link && <span className="block pl-5 text-xs break-all">{m.link}</span>}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </article>
    </>
  );
}

function ItemMusica({ m, primeira, ultima }: { m: Musica; primeira: boolean; ultima: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate font-medium">
          {m.link ? (
            <a href={m.link} target="_blank" rel="noopener noreferrer nofollow" className="underline-offset-4 hover:text-rose hover:underline">
              {m.titulo}
            </a>
          ) : (
            m.titulo
          )}
        </p>
        {m.artista && <p className="truncate text-sm text-tinta-suave">{m.artista}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <form action={moverMusica}>
          <input type="hidden" name="id" value={m.id} />
          <input type="hidden" name="direcao" value="cima" />
          <button disabled={primeira} aria-label={`Subir ${m.titulo}`} className="rounded-full px-2 py-1 text-tinta-suave hover:bg-linha/50 hover:text-tinta disabled:opacity-30">
            ↑
          </button>
        </form>
        <form action={moverMusica}>
          <input type="hidden" name="id" value={m.id} />
          <input type="hidden" name="direcao" value="baixo" />
          <button disabled={ultima} aria-label={`Descer ${m.titulo}`} className="rounded-full px-2 py-1 text-tinta-suave hover:bg-linha/50 hover:text-tinta disabled:opacity-30">
            ↓
          </button>
        </form>
        <form action={excluirMusica}>
          <input type="hidden" name="id" value={m.id} />
          <button aria-label={`Excluir ${m.titulo}`} className="rounded-full px-2 py-1 text-xs text-tinta-suave hover:text-alerta">
            Excluir
          </button>
        </form>
      </div>
    </li>
  );
}
