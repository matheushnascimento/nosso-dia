import type { CampoDef } from "./tipos";

export const CAMPOS_MUSICA: CampoDef[] = [
  { chave: "formato", rotulo: "Formato", tipo: "opcao", opcoes: { dj: "DJ", banda: "Banda", dj_banda: "DJ e banda" } },
  { chave: "horas", rotulo: "Horas de música", tipo: "inteiro", min: 1, max: 24, sufixo: "horas" },
  { chave: "som_luz", rotulo: "Equipamento de som e luz incluso", tipo: "booleano" },
  { chave: "cerimonia", rotulo: "Música da cerimônia inclusa", tipo: "booleano" },
];
