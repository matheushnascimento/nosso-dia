import type { Metadata } from "next";
import { Suspense } from "react";
import { Esqueleto } from "@/components/ui";
import { FormCadastrar } from "../formularios";

export const metadata: Metadata = { title: "Criar conta" };

export default function Pagina() {
  return (
    <Suspense fallback={<Esqueleto className="h-80" />}>
      <FormCadastrar />
    </Suspense>
  );
}
