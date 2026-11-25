import type { Metadata } from "next";
import { Suspense } from "react";
import { Esqueleto } from "@/components/ui";
import { FormNovaSenha } from "../formularios";

export const metadata: Metadata = { title: "Nova senha" };

export default function Pagina() {
  return (
    <Suspense fallback={<Esqueleto className="h-80" />}>
      <FormNovaSenha />
    </Suspense>
  );
}
