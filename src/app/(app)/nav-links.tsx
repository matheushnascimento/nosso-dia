"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const LINKS = [
  { href: "/painel", rotulo: "Painel" },
  { href: "/tarefas", rotulo: "Tarefas" },
  { href: "/convidados", rotulo: "Convidados" },
  { href: "/orcamento", rotulo: "Orçamento" },
  { href: "/fornecedores", rotulo: "Fornecedores" },
  { href: "/estilo", rotulo: "Estilo" },
  { href: "/musica", rotulo: "Música" },
  { href: "/votos", rotulo: "Votos" },
] as const;

/** Com o link da página atual destacado (lê a URL: precisa estar dentro de <Suspense>). */
export function NavLinks() {
  return <Links path={usePathname()} />;
}

/**
 * Sem destaque: o casco pré-renderizado de rotas dinâmicas (ex.: /fornecedores/[id]) não conhece a URL.
 * Usado como fallback do <Suspense> no layout.
 */
export function NavLinksSemDestaque() {
  return <Links path={null} />;
}

function Links({ path }: { path: string | null }) {
  return (
    // Linha própria, com a largura toda; no celular rola de lado em vez de quebrar em várias linhas
    <nav
      aria-label="Principal"
      className="-mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-3 sm:w-[calc(100%+1.5rem)] sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {LINKS.map((l) => {
        const ativo = path !== null && (path === l.href || path.startsWith(`${l.href}/`));
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={ativo ? "page" : undefined}
            className={cx(
              "shrink-0 rounded-full px-3 py-1.5 text-sm transition",
              ativo ? "bg-tinta text-papel" : "text-tinta-suave hover:bg-linha/50 hover:text-tinta",
            )}
          >
            {l.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
