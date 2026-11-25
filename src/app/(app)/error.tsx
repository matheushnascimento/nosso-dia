"use client";

import { Botao, Cartao, Subtitulo } from "@/components/ui";

export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Cartao className="mx-auto max-w-md text-center">
      <Subtitulo>Algo deu errado</Subtitulo>
      <p className="mt-2 text-sm text-tinta-suave">Não conseguimos carregar esta página. Tente de novo em instantes.</p>
      <Botao className="mt-5" onClick={reset}>
        Tentar de novo
      </Botao>
    </Cartao>
  );
}
