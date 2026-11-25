"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Botao } from "@/components/ui";

/** Botão de submit que desabilita e troca o texto enquanto a action roda. */
export function BotaoEnviar({
  children,
  pendente = "Salvando…",
  ...props
}: ComponentProps<typeof Botao> & { pendente?: string }) {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" {...props} disabled={pending || props.disabled} aria-busy={pending}>
      {pending ? pendente : children}
    </Botao>
  );
}
