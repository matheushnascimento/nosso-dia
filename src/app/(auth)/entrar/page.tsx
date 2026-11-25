import type { Metadata } from "next";
import { Suspense } from "react";
import { Esqueleto } from "@/components/ui";
import { FormEntrar } from "../formularios";

export const metadata: Metadata = { title: "Entrar" };

export default function Pagina() {
  return (
    <Suspense fallback={<Esqueleto className="h-80" />}>
      <FormEntrar />
    </Suspense>
  );
}
