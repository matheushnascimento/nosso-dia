import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cartao, Esqueleto, Titulo } from "@/components/ui";
import { requireEvento } from "@/lib/dal";
import { ehCategoriaFornecedor } from "@/lib/rotulos";
import { FormFornecedor } from "../form-fornecedor";

export const metadata: Metadata = { title: "Novo fornecedor" };

export default function NovoFornecedor({ searchParams }: PageProps<"/fornecedores/novo">) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link href="/fornecedores" className="text-sm text-tinta-suave hover:text-tinta">
          ← Fornecedores
        </Link>
        <Titulo className="mt-2">Novo fornecedor</Titulo>
      </div>
      <Cartao>
        <Suspense fallback={<Esqueleto className="h-[32rem]" />}>
          <Formulario searchParams={searchParams} />
        </Suspense>
      </Cartao>
    </div>
  );
}

async function Formulario({ searchParams }: { searchParams: PageProps<"/fornecedores/novo">["searchParams"] }) {
  await requireEvento();
  const sp = await searchParams;
  const bruto = Array.isArray(sp.categoria) ? sp.categoria[0] : sp.categoria;
  const categoria = bruto && ehCategoriaFornecedor(bruto) ? bruto : "local";
  return (
    <FormFornecedor
      valores={{
        nome: "",
        categoria,
        status: "pesquisando",
        telefone: "",
        email: "",
        instagram: "",
        site: "",
        valor_orcado: "",
        valor_contratado: "",
        notas: "",
      }}
    />
  );
}
