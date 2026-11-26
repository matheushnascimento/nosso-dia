import type { Metadata } from "next";
import { Suspense } from "react";
import { sair } from "@/app/(auth)/actions";
import { BotaoLink, Botao, Esqueleto, Logo, Titulo } from "@/components/ui";
import { sql } from "kysely";
import { getSessao } from "@/lib/dal";
import { noBancoVisitante } from "@/lib/db";
import { FormAceitar } from "./form-aceitar";

export const metadata: Metadata = { title: "Convite" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function Convite({ params }: PageProps<"/convite/[token]">) {
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10 sm:py-16">
      <Logo className="mb-10" />
      <main className="w-full max-w-sm text-center">
        <Suspense fallback={<Esqueleto className="h-64" />}>
          <Conteudo params={params} />
        </Suspense>
      </main>
    </div>
  );
}

const MENSAGENS: Record<string, string> = {
  aceito: "Este convite já foi aceito.",
  cancelado: "Este convite foi cancelado.",
  expirado: "Este convite expirou. Peça um novo link para o seu amor.",
};

async function Conteudo({ params }: { params: PageProps<"/convite/[token]">["params"] }) {
  const { token } = await params;
  // Sem login: o convite é lido como visitante (obter_convite é a única porta aberta para `anon`).
  const convite = UUID.test(token)
    ? (
        await noBancoVisitante((trx) =>
          sql<{ nome_exibicao: string; email: string; situacao: string }>`
            select nome_exibicao, email, situacao from obter_convite(${token}::uuid)
          `.execute(trx),
        )
      ).rows[0]
    : undefined;

  if (!convite) {
    return <Estado titulo="Convite não encontrado" texto="Confira se o link foi copiado inteiro." />;
  }
  if (convite.situacao !== "valido") {
    return <Estado titulo={convite.nome_exibicao} texto={MENSAGENS[convite.situacao] ?? ""} />;
  }

  const sessao = await getSessao();
  const destino = `/convite/${token}`;
  const qs = new URLSearchParams({ next: destino, email: convite.email }).toString();

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm uppercase tracking-[0.2em] text-rose">Você foi convidado(a)</p>
      <Titulo className="text-5xl">{convite.nome_exibicao}</Titulo>
      <p className="text-tinta-suave">Planejem o casamento juntos: as mesmas tarefas, prazos e decisões, para os dois.</p>

      {!sessao ? (
        <div className="flex flex-col gap-3">
          <BotaoLink href={`/cadastrar?${qs}`}>Criar minha conta</BotaoLink>
          <BotaoLink href={`/entrar?${qs}`} variante="secundario">
            Já tenho conta
          </BotaoLink>
          <p className="text-xs text-tinta-suave">Use o e-mail {convite.email}.</p>
        </div>
      ) : sessao.email !== convite.email ? (
        <div className="flex flex-col gap-3 text-sm">
          <p className="rounded-xl bg-alerta-claro px-4 py-3 text-alerta">
            Você entrou como {sessao.email}, mas o convite é para {convite.email}.
          </p>
          <form action={sair}>
            <Botao variante="secundario" className="w-full">
              Sair e entrar com outra conta
            </Botao>
          </form>
        </div>
      ) : (
        <FormAceitar token={token} />
      )}
    </div>
  );
}

function Estado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="flex flex-col gap-4">
      <Titulo>{titulo}</Titulo>
      <p className="text-tinta-suave">{texto}</p>
      <BotaoLink href="/" variante="secundario" className="self-center">
        Ir para o início
      </BotaoLink>
    </div>
  );
}
