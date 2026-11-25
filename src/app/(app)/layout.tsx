import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { sair } from "@/app/(auth)/actions";
import { Logo } from "@/components/ui";
import { getContexto } from "@/lib/dal";
import { NavLinks } from "./nav-links";

export default function LayoutApp({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-linha bg-papel/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 sm:px-6">
          <Link href="/painel">
            <Logo />
          </Link>
          <Suspense fallback={<span className="h-5 w-24" />}>
            <MenuUsuario />
          </Suspense>
          <NavLinks />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

async function MenuUsuario() {
  const { nome } = await getContexto();
  return (
    <form action={sair} className="flex items-center gap-3 text-sm sm:order-last">
      <span className="text-tinta-suave">{nome}</span>
      <button className="text-tinta-suave underline-offset-4 hover:text-tinta hover:underline">Sair</button>
    </form>
  );
}
