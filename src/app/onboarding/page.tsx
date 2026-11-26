import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sair } from "@/app/(auth)/actions";
import { Esqueleto, Logo } from "@/components/ui";
import { getContexto } from "@/lib/dal";
import { hojeSP } from "@/lib/datas";
import { FormOnboarding } from "./form-onboarding";

export const metadata: Metadata = { title: "Vamos começar" };

export default function Onboarding() {
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10 sm:py-16">
      <div className="mb-10 flex w-full max-w-lg items-center justify-between">
        <Logo />
        {/* Entrou com a conta errada? Sem isto, quem não tem casamento ficaria preso aqui. */}
        <form action={sair}>
          <button className="text-sm text-tinta-suave underline-offset-4 hover:text-tinta hover:underline">Sair</button>
        </form>
      </div>
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
  return <FormOnboarding meuNome={ctx.nome} hoje={hojeSP()} />;
}
