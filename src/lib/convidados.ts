/** Convidados: rótulos, contagens e filtros (puro, sem banco; testes em convidados.test.ts). */

export const FAIXAS = {
  adulto: { rotulo: "Adulto", curto: "adulto" },
  crianca: { rotulo: "Criança (6 a 12)", curto: "criança" },
  bebe: { rotulo: "Bebê (0 a 5)", curto: "bebê" },
} as const;
export type Faixa = keyof typeof FAIXAS;

export const CONFIRMACOES = {
  pendente: { rotulo: "Pendente", tom: "neutro" },
  confirmado: { rotulo: "Confirmado", tom: "salvia" },
  recusado: { rotulo: "Não vai", tom: "alerta" },
} as const;
export type Confirmacao = keyof typeof CONFIRMACOES;

export const LADOS = ["a", "b", "ambos"] as const;
export type Lado = (typeof LADOS)[number];

export const GRUPOS_SUGERIDOS = ["Família", "Amigos", "Trabalho", "Faculdade", "Escola", "Vizinhos"];

/** Máximo de nomes num cadastro rápido (um convite). */
export const MAX_NOMES_POR_CONVITE = 30;

export function ehFaixa(v: string): v is Faixa {
  return Object.hasOwn(FAIXAS, v);
}
export function ehConfirmacao(v: string): v is Confirmacao {
  return Object.hasOwn(CONFIRMACOES, v);
}
export function ehLado(v: string): v is Lado {
  return (LADOS as readonly string[]).includes(v);
}

export type Pessoa = {
  id: string;
  conviteId: string;
  nome: string;
  faixa: Faixa;
  idade: number | null;
  confirmacao: Confirmacao;
  telefone: string | null;
  email: string | null;
  restricaoAlimentar: string | null;
  observacao: string | null;
};

export type ConviteFamilia = {
  id: string;
  nome: string;
  lado: Lado;
  grupo: string | null;
  pessoas: Pessoa[];
};

/**
 * "a" é o primeiro membro do casamento (quem criou), "b" o parceiro (membros na ordem de entrada).
 * Mostra o primeiro nome de cada um; antes de o parceiro entrar, "Seu amor".
 */
export function rotulosLado(membros: { nome: string }[]): Record<Lado, string> {
  const primeiro = (n: string | undefined) => n?.trim().split(/\s+/)[0] || null;
  const [m1, m2] = membros;
  return {
    a: primeiro(m1?.nome) ?? "Você",
    b: primeiro(m2?.nome) ?? "Seu amor",
    ambos: "Dos dois",
  };
}

/** Minúsculas, sem acento e com espaços simples: para busca e, na #46, para achar duplicados. */
export function normalizarNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Um nome por linha (vírgula e ponto e vírgula também separam). Ignora vazios e repetidos. */
export function lerNomes(bruto: string): string[] {
  const vistos = new Set<string>();
  const nomes: string[] = [];
  for (const parte of bruto.split(/[\n,;]+/)) {
    const nome = parte.replace(/\s+/g, " ").trim();
    const chave = normalizarNome(nome);
    if (!nome || vistos.has(chave)) continue;
    vistos.add(chave);
    nomes.push(nome);
  }
  return nomes;
}

/** Nome do convite quando o casal não informa: "Ana", "Ana e Bruno", "Ana e família". */
export function nomeDoConvite(informado: string, nomes: string[]): string {
  const limpo = informado.replace(/\s+/g, " ").trim();
  if (limpo) return limpo;
  if (nomes.length <= 1) return nomes[0] ?? "";
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`;
  return `${nomes[0]} e família`;
}

export type Contagem = {
  convites: number;
  pessoas: number;
  confirmados: number;
  pendentes: number;
  recusados: number;
  adultos: number;
  criancas: number;
  bebes: number;
  comRestricao: number;
};

export function contar(convites: ConviteFamilia[]): Contagem {
  const c: Contagem = {
    convites: 0, pessoas: 0, confirmados: 0, pendentes: 0, recusados: 0,
    adultos: 0, criancas: 0, bebes: 0, comRestricao: 0,
  };
  for (const convite of convites) {
    if (convite.pessoas.length) c.convites++;
    for (const p of convite.pessoas) {
      c.pessoas++;
      if (p.confirmacao === "confirmado") c.confirmados++;
      else if (p.confirmacao === "pendente") c.pendentes++;
      else c.recusados++;
      if (p.faixa === "adulto") c.adultos++;
      else if (p.faixa === "crianca") c.criancas++;
      else c.bebes++;
      if (p.restricaoAlimentar) c.comRestricao++;
    }
  }
  return c;
}

export type Filtro = { lado?: Lado; grupo?: string; faixa?: Faixa; confirmacao?: Confirmacao; busca?: string };

export function temFiltro(f: Filtro): boolean {
  return Boolean(f.lado || f.grupo || f.faixa || f.confirmacao || f.busca);
}

/**
 * Lado e grupo filtram o convite; faixa, confirmação e busca filtram as pessoas.
 * A busca acha pelo nome da pessoa ou do convite (sem acento). Convite sem ninguém visível sai da lista.
 */
export function filtrar(convites: ConviteFamilia[], f: Filtro): ConviteFamilia[] {
  const busca = f.busca ? normalizarNome(f.busca) : "";
  const grupo = f.grupo ? normalizarNome(f.grupo) : "";
  const resultado: ConviteFamilia[] = [];
  for (const c of convites) {
    if (f.lado && c.lado !== f.lado) continue;
    if (grupo && normalizarNome(c.grupo ?? "") !== grupo) continue;
    const conviteBate = busca !== "" && normalizarNome(c.nome).includes(busca);
    const pessoas = c.pessoas.filter(
      (p) =>
        (!f.faixa || p.faixa === f.faixa) &&
        (!f.confirmacao || p.confirmacao === f.confirmacao) &&
        (!busca || conviteBate || normalizarNome(p.nome).includes(busca)),
    );
    if (pessoas.length) resultado.push({ ...c, pessoas });
  }
  return resultado;
}

/** Grupos já usados (sem repetir maiúsculas/acentos) seguidos das sugestões que faltam. */
export function gruposParaSugerir(convites: ConviteFamilia[]): string[] {
  const vistos = new Map<string, string>();
  for (const g of [...convites.map((c) => c.grupo), ...GRUPOS_SUGERIDOS]) {
    if (g && !vistos.has(normalizarNome(g))) vistos.set(normalizarNome(g), g);
  }
  return [...vistos.values()];
}

/** Grupos em uso, em ordem alfabética (para o filtro). */
export function gruposEmUso(convites: ConviteFamilia[]): string[] {
  const vistos = new Map<string, string>();
  for (const c of convites) if (c.grupo && !vistos.has(normalizarNome(c.grupo))) vistos.set(normalizarNome(c.grupo), c.grupo);
  return [...vistos.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
