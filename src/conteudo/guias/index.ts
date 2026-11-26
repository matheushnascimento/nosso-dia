import type { ComponentType } from "react";
import ComoFuncionaOChecklist from "./como-funciona-o-checklist";
import DocumentosDeViagem from "./documentos-de-viagem";
import RegimeDeBens from "./regime-de-bens";
import { SLUGS_GUIAS, type SlugGuia } from "./slugs";

/**
 * Guias estáticos do app, servidos em /guias/<slug>.
 * Para criar um guia: um arquivo .tsx nesta pasta exportando o conteúdo (default),
 * o slug em ./slugs.ts e uma entrada aqui. O slug é o mesmo usado em `tarefa_modelos.guia`.
 */
export type Guia = {
  slug: SlugGuia;
  titulo: string;
  resumo: string;
  /** Mostra o aviso de conteúdo informativo (jurídico, saúde, documentos). */
  informativo?: boolean;
  /** Texto do aviso informativo, quando o padrão não basta. */
  aviso?: string;
  Conteudo: ComponentType;
};

// Um `Record` por slug: o TypeScript acusa guia faltando ou slug que não está em ./slugs.ts.
const GUIAS: Record<SlugGuia, Omit<Guia, "slug">> = {
  "como-funciona-o-checklist": {
    titulo: "Como funciona o checklist",
    resumo: "Prazos que se ajustam à data, o que é “Começar agora”, itens e checklists por escolha.",
    Conteudo: ComoFuncionaOChecklist,
  },
  "documentos-de-viagem": {
    titulo: "Documentos de viagem",
    resumo: "O que conferir antes da lua de mel (passaporte, visto, vacinas, seguro) e onde confirmar.",
    informativo: true,
    Conteudo: DocumentosDeViagem,
  },
  "regime-de-bens": {
    titulo: "Casamento civil e regime de bens",
    resumo: "Os quatro regimes com um exemplo, quando é preciso pacto antenupcial e o civil × religioso com efeito civil.",
    informativo: true,
    aviso:
      "Conteúdo informativo, não é aconselhamento jurídico. Documentos, taxas e procedimentos variam por estado e por cartório: confirme com o cartório da sua cidade e, se precisar, com um advogado.",
    Conteudo: RegimeDeBens,
  },
};

const LISTA: Guia[] = SLUGS_GUIAS.map((slug) => ({ slug, ...GUIAS[slug] }));
const PorSlug = new Map<string, Guia>(LISTA.map((g) => [g.slug, g]));

export function obterGuia(slug: string): Guia | undefined {
  return PorSlug.get(slug);
}

export function listarGuias(): Guia[] {
  return LISTA;
}
