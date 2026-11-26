import type { Metadata } from "next";
import { Suspense } from "react";
import { EscolhaPacote } from "@/components/escolha-pacote";
import { Cartao, Esqueleto, Subtitulo, Titulo } from "@/components/ui";
import { getMembros, requireEvento } from "@/lib/dal";
import { dataCurta, hojeSP } from "@/lib/datas";
import { SITE_URL } from "@/lib/env";
import { listarPacotes } from "@/lib/pacotes";
import { rotuloGrupoEscolha } from "@/lib/rotulos";
import { cancelarConvite } from "./actions";
import { FormEvento } from "./form-evento";
import { CopiarLink, FormConvidar, FormMeuNome } from "./forms-membros";

export const metadata: Metadata = { title: "Configurações" };

export default function Configuracoes() {
  return (
    <div className="flex flex-col gap-6">
      <Titulo>Configurações</Titulo>
      <Suspense fallback={<Esqueleto className="h-[32rem]" />}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  const ctx = await requireEvento();
  const [membros, pacotes] = await Promise.all([getMembros(ctx), listarPacotes(ctx)]);
  const hoje = hojeSP();

  const { data: convite } =
    membros.length < 2
      ? await ctx.supabase
          .from("convites_parceiro")
          .select("id, email, token, expira_em")
          .eq("evento_id", ctx.evento.id)
          .is("aceito_em", null)
          .is("cancelado_em", null)
          .maybeSingle()
      : { data: null };
  const conviteExpirado = convite ? new Date(convite.expira_em) < new Date() : false;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-6">
        <Cartao>
          <Subtitulo className="mb-5">O casamento</Subtitulo>
          <FormEvento evento={ctx.evento} />
        </Cartao>

        <Cartao id="checklists">
          <Subtitulo className="mb-1">Checklists</Subtitulo>
          <p className="mb-5 text-sm text-tinta-suave">
            Ativos: {pacotes.ativos.map((p) => p.nome).join(" · ") || "nenhum"}
          </p>
          {pacotes.escolhas.length > 0 ? (
            <div className="flex flex-col gap-6">
              {pacotes.escolhas.map((g) => (
                <EscolhaPacote
                  key={g.grupo}
                  pergunta={rotuloGrupoEscolha(g.grupo)}
                  opcoes={g.opcoes}
                  escolhido={g.escolhido}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-tinta-suave">Em breve: checklists que dependem das escolhas de vocês.</p>
          )}
        </Cartao>
      </div>

      <div className="flex flex-col gap-6">
        <Cartao id="membros">
          <Subtitulo className="mb-4">Vocês</Subtitulo>
          <ul className="mb-5 flex flex-col gap-2">
            {membros.map((m) => (
              <li key={m.usuarioId} className="flex items-baseline justify-between">
                <span className="font-serif text-xl">{m.nome}</span>
                {m.souEu && <span className="text-xs text-tinta-suave">você</span>}
              </li>
            ))}
          </ul>

          {membros.length >= 2 ? (
            <p className="text-sm text-tinta-suave">Os dois já estão aqui. 💛</p>
          ) : convite ? (
            <div className="flex flex-col gap-3 text-sm">
              <p>
                Convite pendente para <strong>{convite.email}</strong>
                {conviteExpirado ? (
                  <span className="text-alerta"> · expirou</span>
                ) : (
                  <span className="text-tinta-suave"> · vale até {dataCurta(convite.expira_em.slice(0, 10), hoje)}</span>
                )}
              </p>
              {!conviteExpirado && <CopiarLink link={`${SITE_URL}/convite/${convite.token}`} />}
              <form action={cancelarConvite}>
                <input type="hidden" name="id" value={convite.id} />
                <button className="text-alerta hover:underline">
                  {conviteExpirado ? "Descartar e criar outro" : "Cancelar convite"}
                </button>
              </form>
            </div>
          ) : (
            <FormConvidar />
          )}
        </Cartao>

        <Cartao>
          <Subtitulo className="mb-1">Seu perfil</Subtitulo>
          <p className="mb-4 text-sm text-tinta-suave">{ctx.email}</p>
          <FormMeuNome nome={ctx.nome} />
        </Cartao>
      </div>
    </div>
  );
}
