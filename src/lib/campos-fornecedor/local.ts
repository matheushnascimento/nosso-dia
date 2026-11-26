import type { CampoDef } from "./tipos";

/** Espaço */
export const CAMPOS_LOCAL: CampoDef[] = [
  { chave: "capacidade", rotulo: "Capacidade", tipo: "inteiro", min: 1, max: 5000, sufixo: "pessoas" },
  { chave: "cerimonia_no_local", rotulo: "Cerimônia no próprio local", tipo: "booleano" },
  { chave: "horario_limite", rotulo: "Horário limite da festa", tipo: "hora" },
  { chave: "plano_b_chuva", rotulo: "Plano B para chuva", tipo: "booleano", dica: "Área coberta ou tenda para a parte ao ar livre." },
  { chave: "exclusividade", rotulo: "Exige fornecedores exclusivos", tipo: "booleano", dica: "Buffet, bebidas ou decoração só da casa." },
  { chave: "estacionamento", rotulo: "Estacionamento", tipo: "booleano" },
  { chave: "acessibilidade", rotulo: "Acessibilidade", tipo: "booleano", dica: "Sem escadas ou com rampa e banheiro adaptado." },
];
