import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Aviso, Cartao, Esqueleto, Selo, Titulo, cx } from "@/components/ui";
import { detalhesParaForm, resumoDetalhes } from "@/lib/campos-fornecedor";
import { requireEvento } from "@/lib/dal";
import { dataCurta, hojeSP } from "@/lib/datas";
import { obterFornecedor, type Fornecedor } from "@/lib/fornecedores";
import { CATEGORIAS_FORNECEDOR, STATUS_FORNECEDOR } from "@/lib/rotulos";
import { listarTarefas } from "@/lib/tarefas";
import { ExcluirFornecedor, FormFornecedor } from "../form-fornecedor";

export const metadata: Metadata = { title: "Fornecedor" };

export default function PaginaFornecedor({ params, searchParams }: PageProps<"/fornecedores/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/fornecedores" className="text-sm text-tinta-suave hover:text-tinta">
        ← Fornecedores
      </Link>
      <Suspense fallback={<Esqueleto className="h-[36rem]" />}>
        <Conteudo params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** Centavos → "3.500,00" (o formato que o campo aceita de volta). */
function paraCampo(centavos: number | null): string {
  if (centavos === null) return "";
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function Conteudo({
  params,
  searchParams,
}: {
  params: PageProps<"/fornecedores/[id]">["params"];
  searchParams: PageProps<"/fornecedores/[id]">["searchParams"];
}) {
  const ctx = await requireEvento();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const f = await obterFornecedor(ctx, id);
  if (!f) notFound();

  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-tinta-suave">{CATEGORIAS_FORNECEDOR[f.categoria]}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Titulo>{f.nome}</Titulo>
          <Selo tom={STATUS_FORNECEDOR[f.status].tom}>{STATUS_FORNECEDOR[f.status].rotulo}</Selo>
        </div>
        <Contatos f={f} />
        <ResumoDetalhes f={f} />
      </div>

      {sp.novo === "1" && <Aviso tipo="ok">Fornecedor cadastrado.</Aviso>}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Cartao>
          <FormFornecedor
            id={f.id}
            detalhes={detalhesParaForm(f.categoria, f.detalhes)}
            valores={{
              nome: f.nome,
              categoria: f.categoria,
              status: f.status,
              telefone: f.telefone ?? "",
              email: f.email ?? "",
              instagram: f.instagram ? `@${f.instagram}` : "",
              site: f.site ?? "",
              valor_orcado: paraCampo(f.valorOrcado),
              valor_contratado: paraCampo(f.valorContratado),
              notas: f.notas ?? "",
            }}
          />
        </Cartao>
        <aside className="flex flex-col gap-6">
          <Suspense fallback={<Esqueleto className="h-48" />}>
            <TarefasDaCategoria categoria={f.categoria} />
          </Suspense>
          <ExcluirFornecedor id={f.id} nome={f.nome} />
        </aside>
      </div>
    </>
  );
}

function Contatos({ f }: { f: Fornecedor }) {
  const itens = [
    f.telefone && { href: `tel:${f.telefone.replace(/[^\d+]/g, "")}`, texto: f.telefone },
    f.email && { href: `mailto:${f.email}`, texto: f.email },
    f.instagram && { href: `https://www.instagram.com/${f.instagram}`, texto: `@${f.instagram}`, externo: true },
    f.site && { href: f.site, texto: new URL(f.site).hostname.replace(/^www\./, ""), externo: true },
  ].filter(Boolean) as { href: string; texto: string; externo?: boolean }[];
  if (!itens.length) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {itens.map((i) => (
        <li key={i.href}>
          <a
            href={i.href}
            {...(i.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="text-tinta-suave underline-offset-4 hover:text-tinta hover:underline"
          >
            {i.texto}
          </a>
        </li>
      ))}
    </ul>
  );
}

function ResumoDetalhes({ f }: { f: Fornecedor }) {
  const itens = resumoDetalhes(f.categoria, f.detalhes);
  if (!itens.length) return null;
  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {itens.map((i) => (
        <div key={i.rotulo} className="flex gap-1.5">
          <dt className="text-tinta-suave">{i.rotulo}:</dt>
          <dd>{i.texto}</dd>
        </div>
      ))}
    </dl>
  );
}

async function TarefasDaCategoria({ categoria }: { categoria: Fornecedor["categoria"] }) {
  const ctx = await requireEvento();
  const tarefas = (await listarTarefas(ctx)).filter((t) => t.categoria === categoria);
  const hoje = hojeSP();
  return (
    <Cartao>
      <p className="font-serif text-xl">Tarefas de {CATEGORIAS_FORNECEDOR[categoria].toLowerCase()}</p>
      {tarefas.length === 0 ? (
        <p className="mt-2 text-sm text-tinta-suave">Nenhuma tarefa nesta categoria.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {tarefas.map((t) => (
            <li key={t.id} className="flex items-baseline justify-between gap-3">
              <span className={cx(t.status === "concluida" && "text-tinta-suave line-through")}>{t.titulo}</span>
              {t.prazo && t.status !== "concluida" && (
                <span className={cx("shrink-0", t.grupo === "atrasadas" ? "text-alerta" : "text-tinta-suave")}>
                  {dataCurta(t.prazo, hoje)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/tarefas?categoria=${categoria}`}
        className="mt-3 inline-block text-sm text-tinta-suave underline-offset-4 hover:text-tinta hover:underline"
      >
        Ver em Tarefas
      </Link>
    </Cartao>
  );
}
