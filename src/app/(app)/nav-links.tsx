"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const LINKS = [
  { href: "/painel", rotulo: "Painel" },
  { href: "/tarefas", rotulo: "Tarefas" },
  { href: "/orcamento", rotulo: "Orçamento" },
  { href: "/fornecedores", rotulo: "Fornecedores" },
  { href: "/votos", rotulo: "Votos" },
  { href: "/configuracoes", rotulo: "Configurações" },
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
    <nav aria-label="Principal" className="order-last flex w-full flex-wrap gap-1 sm:order-none sm:w-auto sm:flex-1">
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
