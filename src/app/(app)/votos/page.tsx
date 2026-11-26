import type { Metadata } from "next";
import { Suspense } from "react";
import { Cartao, Esqueleto, Subtitulo, Titulo } from "@/components/ui";
import { requireEvento } from "@/lib/dal";
import { LIMITE_VOTOS, PALAVRAS_POR_MINUTO, meusVotos } from "@/lib/votos";
import { EditorVotos } from "./editor-votos";

export const metadata: Metadata = { title: "Votos" };

const DICAS = [
  ["Comece por uma lembrança", "Uma cena concreta (o primeiro encontro, uma viagem, um dia difícil) prende mais do que adjetivos."],
  ["Prometa coisas reais", "Ao lado das grandes promessas, inclua algumas do dia a dia: elas fazem rir e soam verdadeiras."],
  ["Fale com a pessoa, não com a plateia", "Escreva como se estivessem só vocês dois. Os convidados vão sentir."],
  ["Curto é melhor", "De 1 a 2 minutos em voz alta (umas 150 a 250 palavras) costuma ser o ideal."],
  ["Leia em voz alta antes", "Frases que travam na leitura viram duas. Marque onde respirar."],
  ["Combinem o tom", "Sem mostrar o texto: só alinhem se vai ser mais emocionante ou mais divertido, e mais ou menos o tamanho."],
] as const;

export default function Votos() {
  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <Titulo>Seus votos</Titulo>
        <p className="mt-2 max-w-2xl text-tinta-suave">
          Só você lê o que escrever aqui. Seu amor vê apenas se os seus votos já estão prontos. Tudo é salvo
          sozinho enquanto você digita.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Suspense fallback={<Esqueleto className="h-96" />}>
          <Conteudo />
        </Suspense>

        <Cartao className="h-fit print:hidden">
          <Subtitulo>Dicas</Subtitulo>
          <ul className="mt-3 flex flex-col gap-3 text-sm">
            {DICAS.map(([titulo, texto]) => (
              <li key={titulo}>
                <p className="font-medium">{titulo}</p>
                <p className="text-tinta-suave">{texto}</p>
              </li>
            ))}
          </ul>
        </Cartao>
      </div>
    </div>
  );
}

async function Conteudo() {
  const ctx = await requireEvento();
  const votos = await meusVotos(ctx);
  return (
    <EditorVotos
      inicial={{ texto: votos.texto, pronto: votos.pronto }}
      meuNome={ctx.nome}
      limite={LIMITE_VOTOS}
      porMinuto={PALAVRAS_POR_MINUTO}
    />
  );
}
