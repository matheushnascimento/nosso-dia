/** Momentos da setlist, na ordem do casamento. As chaves batem com o check de `musicas.momento`. */
export const MOMENTOS = {
  entrada_padrinhos: { rotulo: "Entrada dos padrinhos", dica: "Uma música para todos ou uma por casal de padrinhos." },
  entrada_noivos: { rotulo: "Entrada dos noivos", dica: "Se cada um entra com uma música, coloquem as duas na ordem." },
  aliancas: { rotulo: "Alianças", dica: "Para quando as alianças chegam ao altar." },
  saida: { rotulo: "Saída", dica: "Já casados: costuma ser a mais animada da cerimônia." },
  primeira_danca: { rotulo: "Primeira dança", dica: null },
  festa: { rotulo: "Festa", dica: "As que não podem faltar na pista." },
  nao_tocar: { rotulo: "Não tocar", dica: "O que o DJ ou a banda deve evitar." },
} as const;

export type Momento = keyof typeof MOMENTOS;

export function ehMomento(m: string): m is Momento {
  return Object.hasOwn(MOMENTOS, m);
}
