import type { CampoDef } from "./tipos";

export const CAMPOS_BEBIDAS: CampoDef[] = [
  {
    chave: "modalidade",
    rotulo: "Cobrança",
    tipo: "opcao",
    opcoes: { por_pessoa: "Por pessoa", consignado: "Consignado (paga o que consumir)" },
  },
  { chave: "preco_por_pessoa", rotulo: "Preço por pessoa", tipo: "dinheiro", dica: "Se a cobrança for por pessoa." },
  {
    chave: "inclusos",
    rotulo: "Itens inclusos",
    tipo: "multipla",
    opcoes: {
      agua_refrigerante: "Água e refrigerante",
      sucos: "Sucos",
      cerveja: "Cerveja",
      vinho: "Vinho",
      espumante: "Espumante",
      destilados: "Destilados",
      cafe: "Café",
    },
  },
  { chave: "horas_bar", rotulo: "Horas de bar", tipo: "inteiro", min: 1, max: 24, sufixo: "horas" },
  { chave: "bar_drinks", rotulo: "Bar de drinks", tipo: "booleano" },
];
