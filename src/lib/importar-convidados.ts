/**
 * Importação de convidados por planilha (CSV). Puro: roda no navegador (prévia) e de novo no servidor
 * (que nunca confia na prévia). Testes em importar-convidados.test.ts.
 */
import { normalizarNome, type Confirmacao, type Faixa, type Lado } from "./convidados";

export const LIMITE_BYTES = 500_000;
export const LIMITE_LINHAS = 2000;

// ----------------------------------------------------------------------------- leitura do arquivo

/** UTF-8 (com ou sem BOM); se não for UTF-8 válido, Windows-1252, que é como o Excel salva CSV no Brasil. */
export function decodificar(bytes: Uint8Array): string {
  let texto: string;
  try {
    texto = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    texto = new TextDecoder("windows-1252").decode(bytes);
  }
  return texto.replace(/^﻿/, "");
}

/** O separador mais frequente na primeira linha (fora de aspas): ponto e vírgula, vírgula ou tab. */
function detectarSeparador(texto: string): string {
  const contagem: Record<string, number> = { ";": 0, ",": 0, "\t": 0 };
  let aspas = false;
  for (const ch of texto) {
    if (ch === '"') aspas = !aspas;
    else if (!aspas && (ch === "\n" || ch === "\r")) break;
    else if (!aspas && ch in contagem) contagem[ch]++;
  }
  const [sep, n] = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0];
  return n > 0 ? sep : ";";
}

/** CSV com aspas ("" dentro de aspas vira "), quebra de linha dentro de aspas e \r\n. Linhas vazias saem. */
export function lerCsv(textoBruto: string): string[][] {
  const texto = textoBruto.replace(/^﻿/, "");
  const sep = detectarSeparador(texto);
  const linhas: string[][] = [];
  let linha: string[] = [];
  let celula = "";
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (aspas) {
      if (ch === '"' && texto[i + 1] === '"') {
        celula += '"';
        i++;
      } else if (ch === '"') aspas = false;
      else celula += ch;
    } else if (ch === '"' && celula === "") aspas = true;
    else if (ch === sep) {
      linha.push(celula);
      celula = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && texto[i + 1] === "\n") i++;
      linha.push(celula);
      linhas.push(linha);
      linha = [];
      celula = "";
    } else celula += ch;
  }
  if (celula !== "" || linha.length) {
    linha.push(celula);
    linhas.push(linha);
  }
  return linhas.map((l) => l.map((c) => c.trim())).filter((l) => l.some((c) => c !== ""));
}

// ----------------------------------------------------------------------------- colunas

export const CAMPOS = {
  nome: { rotulo: "Nome", sinonimos: ["nome", "nome completo", "convidado", "convidada", "pessoa", "name"] },
  convite: { rotulo: "Convite (quem vem junto)", sinonimos: ["convite", "familia", "nucleo", "casal", "grupo familiar"] },
  lado: { rotulo: "De quem", sinonimos: ["de quem", "lado", "convidado de", "quem convidou"] },
  grupo: { rotulo: "Grupo", sinonimos: ["grupo", "categoria", "circulo", "tipo"] },
  faixa: { rotulo: "Faixa (adulto, criança, bebê)", sinonimos: ["faixa", "faixa etaria", "adulto ou crianca", "crianca"] },
  idade: { rotulo: "Idade", sinonimos: ["idade", "anos"] },
  telefone: { rotulo: "Telefone", sinonimos: ["telefone", "celular", "whatsapp", "whats", "fone", "tel"] },
  email: { rotulo: "E-mail", sinonimos: ["email", "e mail"] },
  restricao: { rotulo: "Restrição alimentar", sinonimos: ["restricao alimentar", "restricao", "alergia", "alergias", "dieta"] },
  observacao: { rotulo: "Observação", sinonimos: ["observacao", "observacoes", "obs", "notas", "nota", "comentario"] },
  confirmacao: { rotulo: "Confirmação", sinonimos: ["confirmacao", "confirmado", "rsvp", "presenca", "vai"] },
} as const;
export type Campo = keyof typeof CAMPOS;
export const LISTA_CAMPOS = Object.keys(CAMPOS) as Campo[];

/** Coluna (índice) de cada campo, ou null. */
export type Mapeamento = Record<Campo, number | null>;

function chaveCabecalho(s: string): string {
  return normalizarNome(s).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Adivinha o campo de cada coluna pelo nome: primeiro nomes iguais, depois nomes que contêm o sinônimo. */
export function adivinharMapeamento(cabecalho: string[]): Mapeamento {
  const mapa = Object.fromEntries(LISTA_CAMPOS.map((c) => [c, null])) as Mapeamento;
  const chaves = cabecalho.map(chaveCabecalho);
  const usadas = new Set<number>();
  const tentar = (bate: (chave: string, sinonimo: string) => boolean) => {
    for (const campo of LISTA_CAMPOS) {
      if (mapa[campo] !== null) continue;
      const i = chaves.findIndex((k, idx) => !usadas.has(idx) && CAMPOS[campo].sinonimos.some((s) => bate(k, s)));
      if (i >= 0) {
        mapa[campo] = i;
        usadas.add(i);
      }
    }
  };
  tentar((k, s) => k === s);
  tentar((k, s) => s.length >= 4 && (k.startsWith(`${s} `) || k.endsWith(` ${s}`) || k.includes(` ${s} `)));
  return mapa;
}

/** A primeira linha parece cabeçalho se alguma coluna foi reconhecida pelo nome. */
export function pareceCabecalho(primeira: string[]): boolean {
  return Object.values(adivinharMapeamento(primeira)).some((v) => v !== null);
}

// ----------------------------------------------------------------------------- valores

export type Pessoa = {
  nome: string;
  convite: string | null;
  lado: Lado;
  grupo: string | null;
  faixa: Faixa;
  idade: number | null;
  telefone: string | null;
  email: string | null;
  restricao: string | null;
  observacao: string | null;
  confirmacao: Confirmacao;
};

export type LinhaImportada = {
  /** número da linha na planilha (1 = primeira linha do arquivo) */
  numero: number;
  /** o nome como veio, para mostrar também as linhas com erro */
  nomeBruto: string;
  pessoa: Pessoa | null;
  erros: string[];
  avisos: string[];
  /** por que parece repetida (já na lista ou repetida na planilha) */
  duplicado: string | null;
};

export type Contexto = {
  /** primeiro nome de cada membro, para reconhecer "de quem" */
  nomesLado: { a: string; b: string };
  ladoPadrao: Lado;
};

const SIM = new Set(["sim", "s", "confirmado", "confirmada", "confirmados", "vai", "vem", "yes", "x", "ok"]);
const NAO = new Set(["nao", "n", "recusado", "recusou", "nao vai", "nao vem", "no"]);

function lerLado(bruto: string, ctx: Contexto): { lado: Lado; aviso?: string } {
  const v = normalizarNome(bruto).replace(/^(de|da|do) /, "");
  if (!v) return { lado: ctx.ladoPadrao };
  const a = normalizarNome(ctx.nomesLado.a);
  const b = normalizarNome(ctx.nomesLado.b);
  if (a && (v === a || v.startsWith(`${a} `))) return { lado: "a" };
  if (b && (v === b || v.startsWith(`${b} `))) return { lado: "b" };
  if (["ambos", "dos dois", "os dois", "casal", "nosso", "nossos", "dos noivos"].includes(v)) return { lado: "ambos" };
  return { lado: ctx.ladoPadrao, aviso: `“De quem” não reconhecido (${bruto}): ficou o padrão.` };
}

function lerFaixa(bruto: string, idade: number | null): { faixa: Faixa; aviso?: string } {
  const v = normalizarNome(bruto);
  if (["adulto", "adulta", "adultos", "a"].includes(v)) return { faixa: "adulto" };
  if (["crianca", "criancas", "c", "infantil"].includes(v)) return { faixa: "crianca" };
  if (["bebe", "bebes", "b", "colo"].includes(v)) return { faixa: "bebe" };
  const porIdade: Faixa | null = idade === null ? null : idade <= 5 ? "bebe" : idade <= 12 ? "crianca" : "adulto";
  if (!v) return { faixa: porIdade ?? "adulto" };
  return { faixa: porIdade ?? "adulto", aviso: `Faixa não reconhecida (${bruto}): ficou ${porIdade ?? "adulto"}.` };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function lerLinha(celulas: string[], mapa: Mapeamento, ctx: Contexto): Omit<LinhaImportada, "numero" | "duplicado" | "nomeBruto"> {
  const erros: string[] = [];
  const avisos: string[] = [];
  const valor = (c: Campo) => {
    const i = mapa[c];
    return i === null ? "" : (celulas[i] ?? "").replace(/\s+/g, " ").trim();
  };
  const limite = (c: Campo, max: number) => {
    const v = valor(c);
    if (v.length > max) erros.push(`${CAMPOS[c].rotulo}: até ${max} caracteres.`);
    return v || null;
  };

  const nome = valor("nome");
  if (!nome) erros.push("Sem nome.");
  else if (nome.length > 120) erros.push("Nome: até 120 caracteres.");

  let idade: number | null = null;
  const idadeBruta = valor("idade");
  if (idadeBruta) {
    const n = Number(idadeBruta.replace(/\s*anos?$/i, ""));
    if (Number.isInteger(n) && n >= 0 && n <= 120) idade = n;
    else erros.push(`Idade inválida (${idadeBruta}).`);
  }

  const email = limite("email", 254)?.toLowerCase() ?? null;
  if (email && !EMAIL.test(email)) erros.push(`E-mail inválido (${email}).`);

  const lado = lerLado(valor("lado"), ctx);
  if (lado.aviso) avisos.push(lado.aviso);
  const faixa = lerFaixa(valor("faixa"), idade);
  if (faixa.aviso) avisos.push(faixa.aviso);
  const conf = normalizarNome(valor("confirmacao"));

  const pessoa: Pessoa = {
    nome,
    convite: limite("convite", 120),
    lado: lado.lado,
    grupo: limite("grupo", 60),
    faixa: faixa.faixa,
    idade,
    telefone: limite("telefone", 40),
    email,
    restricao: limite("restricao", 500),
    observacao: limite("observacao", 2000),
    confirmacao: SIM.has(conf) ? "confirmado" : NAO.has(conf) ? "recusado" : "pendente",
  };
  return { pessoa: erros.length ? null : pessoa, erros, avisos };
}

// ----------------------------------------------------------------------------- duplicados

/** Só os dígitos, sem o 55 do Brasil na frente. Menos de 8 dígitos não serve para comparar. */
export function chaveTelefone(tel: string | null): string | null {
  let d = (tel ?? "").replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  return d.length >= 8 ? d : null;
}

export type Existentes = { nome: string; telefone: string | null; email: string | null }[];

/**
 * Lê as linhas e marca as que parecem repetidas: mesmo nome (sem acento e maiúsculas), mesmo telefone ou mesmo
 * e-mail de alguém já na lista ou de uma linha anterior da planilha. Só o nome já basta: assim importar o mesmo
 * arquivo duas vezes não duplica ninguém, mesmo sem telefone ou e-mail.
 */
export function interpretar(
  linhas: string[][],
  opcoes: { mapa: Mapeamento; temCabecalho: boolean; contexto: Contexto; existentes: Existentes },
): LinhaImportada[] {
  const naLista = new Map<string, string>();
  const naPlanilha = new Map<string, string>();
  const chaves = (p: { nome: string; telefone: string | null; email: string | null }) =>
    [
      ["nome", normalizarNome(p.nome)],
      ["tel", chaveTelefone(p.telefone)],
      ["email", p.email?.toLowerCase() || null],
    ].filter((k): k is [string, string] => Boolean(k[1])).map(([t, v]) => `${t}:${v}`);
  for (const e of opcoes.existentes) for (const k of chaves(e)) naLista.set(k, e.nome);

  const inicio = opcoes.temCabecalho ? 1 : 0;
  return linhas.slice(inicio).map((celulas, i) => {
    const lida = lerLinha(celulas, opcoes.mapa, opcoes.contexto);
    let duplicado: string | null = null;
    if (lida.pessoa) {
      const ks = chaves(lida.pessoa);
      const motivo = (k: string, quem: string, onde: string) =>
        k.startsWith("nome:") ? `Mesmo nome de ${quem} ${onde}.` : k.startsWith("tel:") ? `Mesmo telefone de ${quem} ${onde}.` : `Mesmo e-mail de ${quem} ${onde}.`;
      for (const k of ks) {
        if (naLista.has(k)) {
          duplicado = motivo(k, naLista.get(k)!, "(já na lista)");
          break;
        }
        if (naPlanilha.has(k)) {
          duplicado = motivo(k, naPlanilha.get(k)!, "(linha anterior da planilha)");
          break;
        }
      }
      for (const k of ks) if (!naPlanilha.has(k)) naPlanilha.set(k, lida.pessoa.nome);
    }
    const nomeBruto = opcoes.mapa.nome === null ? "" : (celulas[opcoes.mapa.nome] ?? "").trim();
    return { numero: i + inicio + 1, nomeBruto, ...lida, duplicado };
  });
}

// ----------------------------------------------------------------------------- agrupamento

export type ConviteNovo = { chave: string; nome: string; lado: Lado; grupo: string | null; pessoas: Pessoa[] };
export type Agrupado = { novos: ConviteNovo[]; emExistentes: Map<string, Pessoa[]> };

/**
 * Quem tem o mesmo valor na coluna "convite" vai junto. Se já existe um convite com esse nome, entra nele.
 * Sem a coluna (ou vazia), cada pessoa vira um convite. Lado e grupo vêm da primeira pessoa do convite.
 */
export function agrupar(pessoas: Pessoa[], convitesExistentes: { id: string; nome: string }[]): Agrupado {
  const existentes = new Map(convitesExistentes.map((c) => [normalizarNome(c.nome), c.id]));
  const novos = new Map<string, ConviteNovo>();
  const emExistentes = new Map<string, Pessoa[]>();
  pessoas.forEach((p, i) => {
    if (p.convite) {
      const chave = normalizarNome(p.convite);
      const id = existentes.get(chave);
      if (id) {
        emExistentes.set(id, [...(emExistentes.get(id) ?? []), p]);
        return;
      }
      const atual = novos.get(chave);
      if (atual) atual.pessoas.push(p);
      else novos.set(chave, { chave, nome: p.convite, lado: p.lado, grupo: p.grupo, pessoas: [p] });
    } else {
      novos.set(`#${i}`, { chave: `#${i}`, nome: p.nome, lado: p.lado, grupo: p.grupo, pessoas: [p] });
    }
  });
  return { novos: [...novos.values()], emExistentes };
}

/** Modelo para baixar: separado por ponto e vírgula, que o Excel em português abre direto. */
export const MODELO_CSV =
  "﻿nome;convite;de quem;grupo;faixa;idade;telefone;email;restrição alimentar;observação\n" +
  "João Silva;Família Silva;dos dois;Família;adulto;;(11) 99999-0000;joao@exemplo.com;;\n" +
  "Maria Silva;Família Silva;dos dois;Família;adulto;;;;sem glúten;\n" +
  "Pedro Silva;Família Silva;dos dois;Família;criança;8;;;;\n" +
  "Carla Souza;;dos dois;Trabalho;adulto;;;;;vem de outra cidade\n";
