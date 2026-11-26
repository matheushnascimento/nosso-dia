import type { CampoDef } from "./tipos";

/** Decoração e flores */
export const CAMPOS_DECORACAO: CampoDef[] = [
  {
    chave: "inclusos",
    rotulo: "Itens inclusos",
    tipo: "multipla",
    opcoes: { flores: "Flores", mobiliario: "Mobiliário", iluminacao: "Iluminação" },
  },
  { chave: "montagem_desmontagem", rotulo: "Montagem e desmontagem inclusas", tipo: "booleano" },
];
