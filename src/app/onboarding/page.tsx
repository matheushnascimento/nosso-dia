import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Esqueleto, Logo } from "@/components/ui";
import { getContexto } from "@/lib/dal";
import { FormOnboarding } from "./form-onboarding";

export const metadata: Metadata = { title: "Vamos começar" };

export default function Onboarding() {
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10 sm:py-16">
      <Logo className="mb-10" />
      <main className="w-full max-w-lg">
        <Suspense fallback={<Esqueleto className="h-96" />}>
          <Conteudo />
        </Suspense>
      </main>
    </div>
  );
}

async function Conteudo() {
  const ctx = await getContexto();
  if (ctx.evento) redirect("/painel");
  return <FormOnboarding meuNome={ctx.nome} />;
}
