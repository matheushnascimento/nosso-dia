import type { CampoDef } from "./tipos";

/** Foto e vídeo */
export const CAMPOS_FOTO_VIDEO: CampoDef[] = [
  { chave: "horas_cobertura", rotulo: "Horas de cobertura", tipo: "inteiro", min: 1, max: 24, sufixo: "horas" },
  { chave: "prazo_entrega_dias", rotulo: "Prazo de entrega", tipo: "inteiro", min: 1, max: 730, sufixo: "dias" },
  { chave: "album", rotulo: "Álbum impresso", tipo: "booleano" },
  { chave: "segundo_fotografo", rotulo: "Segundo fotógrafo", tipo: "booleano" },
  { chave: "drone", rotulo: "Drone", tipo: "booleano" },
  { chave: "making_of", rotulo: "Making of", tipo: "booleano" },
];
