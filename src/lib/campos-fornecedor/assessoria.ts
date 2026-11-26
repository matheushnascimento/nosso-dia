import type { CampoDef } from "./tipos";

export const CAMPOS_ASSESSORIA: CampoDef[] = [
  { chave: "tipo", rotulo: "Tipo", tipo: "opcao", opcoes: { completa: "Completa (desde o planejamento)", do_dia: "Só do dia" } },
  { chave: "assistentes", rotulo: "Assistentes no dia", tipo: "inteiro", min: 0, max: 50 },
  { chave: "reunioes", rotulo: "Reuniões incluídas", tipo: "inteiro", min: 0, max: 100 },
];
