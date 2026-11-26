"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const LINKS = [
  { href: "/painel", rotulo: "Painel" },
  { href: "/tarefas", rotulo: "Tarefas" },
  { href: "/votos", rotulo: "Votos" },
  { href: "/configuracoes", rotulo: "Configurações" },
] as const;

export function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="Principal" className="order-last flex w-full gap-1 sm:order-none sm:w-auto sm:flex-1">
      {LINKS.map((l) => {
        const ativo = path === l.href || path.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={ativo ? "page" : undefined}
            className={cx(
              "rounded-full px-3 py-1.5 text-sm transition",
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
