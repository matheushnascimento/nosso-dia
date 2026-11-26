/**
 * Orçamento por categoria: lista, distribuição sugerida e prioridades.
 * Funções puras (sem banco), testadas em orcamento.test.ts.
 */
import { CATEGORIAS_FORNECEDOR } from "./rotulos";

/** As categorias de fornecedor mais a reserva para imprevistos (que não tem fornecedor). */
export const CATEGORIAS_ORCAMENTO = {
  ...CATEGORIAS_FORNECEDOR,
  reserva: "Reserva para imprevistos",
} as const;

export type CategoriaOrcamento = keyof typeof CATEGORIAS_ORCAMENTO;

export function ehCategoriaOrcamento(c: string): c is CategoriaOrcamento {
  return Object.hasOwn(CATEGORIAS_ORCAMENTO, c);
}

/**
 * Distribuição sugerida, em pontos-base (10000 = 100%). Ponto de partida, não pesquisa de mercado.
 * "Trajes e beleza 7%" vira 4% + 3% porque são categorias separadas de fornecedor.
 */
export const SUGESTAO: Record<CategoriaOrcamento, number> = {
  local: 1500,
  buffet: 3000,
  bebidas: 700,
  foto_video: 1000,
  decoracao: 1000,
  musica: 600,
  assessoria: 500,
  cerimonia: 0,
  trajes: 400,
  beleza: 300,
  aliancas: 300,
  convites: 200,
  outros: 0,
  reserva: 500,
};

/** Quanto a categoria de cada prioridade ganha sobre a sugestão (1 = mais importante). */
export const FATOR_PRIORIDADE = { 1: 1.5, 2: 1.35, 3: 1.2 } as const;
export type Prioridade = keyof typeof FATOR_PRIORIDADE;

/** Até 3 categorias priorizadas, cada uma com uma prioridade diferente. A reserva não entra. */
export type Prioridades = Partial<Record<Prioridade, CategoriaOrcamento>>;

/**
 * Pesos de cada categoria depois das prioridades. As priorizadas são multiplicadas pelo fator;
 * as outras (menos a reserva, que fica fixa) cedem na mesma proporção, para o total seguir 100%.
 */
export function pesos(prioridades: Prioridades = {}): Record<CategoriaOrcamento, number> {
  const fatorDe = new Map<CategoriaOrcamento, number>();
  for (const [p, c] of Object.entries(prioridades) as [string, CategoriaOrcamento][]) {
    if (c && c !== "reserva") fatorDe.set(c, FATOR_PRIORIDADE[Number(p) as Prioridade]);
  }
  const categorias = Object.keys(SUGESTAO) as CategoriaOrcamento[];
  const total = categorias.reduce((s, c) => s + SUGESTAO[c], 0);
  const priorizadas = categorias.filter((c) => fatorDe.has(c));
  const somaPriorizadas = priorizadas.reduce((s, c) => s + SUGESTAO[c] * fatorDe.get(c)!, 0);
  const cedem = categorias.filter((c) => !fatorDe.has(c) && c !== "reserva");
  const somaCedem = cedem.reduce((s, c) => s + SUGESTAO[c], 0);
  const k = somaCedem > 0 ? Math.max(0, (total - SUGESTAO.reserva - somaPriorizadas) / somaCedem) : 0;

  return Object.fromEntries(
    categorias.map((c) => [
      c,
      c === "reserva" ? SUGESTAO.reserva : fatorDe.has(c) ? SUGESTAO[c] * fatorDe.get(c)! : SUGESTAO[c] * k,
    ]),
  ) as Record<CategoriaOrcamento, number>;
}

/**
 * Divide `totalCentavos` pelos pesos, em reais inteiros (maiores restos), e põe os centavos que
 * sobrarem na reserva. A soma é sempre exatamente o total.
 */
export function distribuir(totalCentavos: number, prioridades: Prioridades = {}): Record<CategoriaOrcamento, number> {
  if (!Number.isSafeInteger(totalCentavos) || totalCentavos < 0) throw new RangeError("total inválido");
  const w = pesos(prioridades);
  const categorias = Object.keys(w) as CategoriaOrcamento[];
  const somaPesos = categorias.reduce((s, c) => s + w[c], 0);
  const reais = Math.floor(totalCentavos / 100);
  const centavos = totalCentavos - reais * 100;

  const cotas = categorias.map((c, i) => {
    const exato = (reais * w[c]) / somaPesos;
    return { c, i, inteiro: Math.floor(exato), resto: exato - Math.floor(exato) };
  });
  let falta = reais - cotas.reduce((s, q) => s + q.inteiro, 0);
  // maiores restos primeiro; empate pela ordem da lista (resultado estável)
  for (const q of [...cotas].sort((a, b) => b.resto - a.resto || a.i - b.i)) {
    if (falta <= 0) break;
    if (w[q.c] > 0) {
      q.inteiro += 1;
      falta -= 1;
    }
  }

  const resultado = Object.fromEntries(cotas.map((q) => [q.c, q.inteiro * 100])) as Record<CategoriaOrcamento, number>;
  resultado.reserva += centavos;
  return resultado;
}
