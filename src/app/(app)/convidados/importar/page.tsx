import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Esqueleto, Titulo } from "@/components/ui";
import { rotulosLado } from "@/lib/convidados";
import { listarConvites } from "@/lib/convidados-dados";
import { getMembros, requireEvento } from "@/lib/dal";
import { Importar } from "./importar";

export const metadata: Metadata = { title: "Importar convidados" };

export default function PaginaImportar() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/convidados" className="text-sm text-tinta-suave hover:text-tinta">
        ← Convidados
      </Link>
      <div>
        <Titulo>Importar convidados</Titulo>
        <p className="mt-2 max-w-2xl text-tinta-suave">
          Tragam a lista de uma planilha. Nada é gravado antes de vocês conferirem a prévia, e quem já está na lista
          não entra de novo.
        </p>
      </div>
      <Suspense fallback={<Esqueleto className="h-96" />}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  const ctx = await requireEvento();
  const [convites, membros] = await Promise.all([listarConvites(ctx), getMembros(ctx)]);
  // só o necessário para achar repetidos na prévia (o servidor confere de novo ao importar)
  const existentes = convites.flatMap((c) => c.pessoas.map((p) => ({ nome: p.nome, telefone: p.telefone, email: p.email })));
  return <Importar rotulosLado={rotulosLado(membros)} existentes={existentes} />;
}
