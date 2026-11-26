/**
 * Questionário de estilo e formato (/estilo): perguntas, respostas ↔ tags do casamento.
 * Puro: usado na página, na Server Action e nos testes.
 */

export type Grupo = "formato" | "periodo" | "ambiente" | "estilo";

/** Na ordem do questionário. `multipla`: pode marcar mais de uma. */
export const PERGUNTAS: { grupo: Grupo; titulo: string; multipla: boolean }[] = [
  { grupo: "formato", titulo: "Qual o formato?", multipla: false },
  { grupo: "periodo", titulo: "Em que período?", multipla: false },
  { grupo: "ambiente", titulo: "Onde?", multipla: false },
  { grupo: "estilo", titulo: "Qual o estilo? Pode marcar mais de um.", multipla: true },
];

export type Respostas = Partial<Record<Grupo, string[]>>;

/** Tags extras que uma resposta implica: "misto" tem parte ao ar livre, então leva o checklist de ao ar livre. */
const IMPLICA: Record<string, string[]> = { misto: ["ao_ar_livre"] };

/** Respostas → lista de tags do casamento (sem repetição, em ordem). */
export function tagsDasRespostas(r: Respostas): string[] {
  const tags = new Set<string>();
  for (const { grupo } of PERGUNTAS) {
    for (const t of r[grupo] ?? []) {
      tags.add(t);
      for (const extra of IMPLICA[t] ?? []) tags.add(extra);
    }
  }
  return [...tags].sort();
}

/**
 * Tags do casamento → respostas, usando o grupo de cada tag do catálogo.
 * Uma tag implicada por outra marcada no mesmo grupo (ao_ar_livre com misto) não conta como resposta.
 */
export function respostasDasTags(tags: string[], grupoDe: Record<string, string | null>): Respostas {
  const r: Respostas = {};
  const implicadas = new Set(tags.flatMap((t) => IMPLICA[t] ?? []));
  for (const t of tags) {
    const g = grupoDe[t] as Grupo | undefined;
    if (!g || implicadas.has(t)) continue;
    (r[g] ??= []).push(t);
  }
  return r;
}
