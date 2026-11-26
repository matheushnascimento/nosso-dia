import type { CampoDef } from "./tipos";

/** Buffet, bolo e doces */
export const CAMPOS_BUFFET: CampoDef[] = [
  { chave: "preco_por_pessoa", rotulo: "Preço por pessoa", tipo: "dinheiro" },
  {
    chave: "tipo_servico",
    rotulo: "Tipo de serviço",
    tipo: "opcao",
    opcoes: { empratado: "Empratado", buffet: "Buffet (self-service)", volante: "Volante", ilhas: "Ilhas ou estações", coquetel: "Coquetel" },
  },
  { chave: "data_degustacao", rotulo: "Data da degustação", tipo: "data" },
  {
    chave: "inclusos",
    rotulo: "Inclusos",
    tipo: "multipla",
    opcoes: { bolo: "Bolo", doces: "Doces", bem_casados: "Bem-casados" },
  },
  { chave: "garcons", rotulo: "Garçons", tipo: "inteiro", min: 0, max: 500 },
];
