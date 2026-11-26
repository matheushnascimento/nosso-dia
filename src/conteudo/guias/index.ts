import type { ComponentType } from "react";
import ComoFuncionaOChecklist from "./como-funciona-o-checklist";
import DocumentosDeViagem from "./documentos-de-viagem";

/**
 * Guias estáticos do app, servidos em /guias/<slug>.
 * Para criar um guia: um arquivo .tsx nesta pasta exportando o conteúdo (default)
 * e uma entrada aqui. O slug é o mesmo usado em `tarefa_modelos.guia`.
 */
export type Guia = {
  slug: string;
  titulo: string;
  resumo: string;
  /** Mostra o aviso de conteúdo informativo (jurídico, saúde, documentos). */
  informativo?: boolean;
  Conteudo: ComponentType;
};

const GUIAS: Guia[] = [
  {
    slug: "como-funciona-o-checklist",
    titulo: "Como funciona o checklist",
    resumo: "Prazos que se ajustam à data, o que é “Começar agora”, itens e checklists por escolha.",
    Conteudo: ComoFuncionaOChecklist,
  },
  {
    slug: "documentos-de-viagem",
    titulo: "Documentos de viagem",
    resumo: "O que conferir antes da lua de mel (passaporte, visto, vacinas, seguro) e onde confirmar.",
    informativo: true,
    Conteudo: DocumentosDeViagem,
  },
];

const PorSlug = new Map(GUIAS.map((g) => [g.slug, g]));

export function obterGuia(slug: string): Guia | undefined {
  return PorSlug.get(slug);
}

export function listarGuias(): Guia[] {
  return GUIAS;
}
