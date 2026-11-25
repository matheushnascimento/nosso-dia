import type { Metadata } from "next";
import { Suspense } from "react";
import { Esqueleto } from "@/components/ui";
import { FormRecuperar } from "../formularios";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function Pagina() {
  return (
    <Suspense fallback={<Esqueleto className="h-80" />}>
      <FormRecuperar />
    </Suspense>
  );
}
