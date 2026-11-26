/**
 * Campos por categoria de fornecedor: definição (um módulo por categoria), validação do formulário
 * e conversão de volta para o formulário. Usado pela Server Action e pelo formulário.
 */
import { formatarBRL, parseBRL } from "../formato";
import type { CategoriaFornecedor } from "../rotulos";
import { CAMPOS_ASSESSORIA } from "./assessoria";
import { CAMPOS_BEBIDAS } from "./bebidas";
import { CAMPOS_BUFFET } from "./buffet";
import { CAMPOS_DECORACAO } from "./decoracao";
import { CAMPOS_FOTO_VIDEO } from "./foto-video";
import { CAMPOS_LOCAL } from "./local";
import { CAMPOS_MUSICA } from "./musica";
import type { CampoDef, Detalhes } from "./tipos";

export type { CampoDef, Detalhes, ValorDetalhe } from "./tipos";

const CAMPOS: Partial<Record<CategoriaFornecedor, CampoDef[]>> = {
  local: CAMPOS_LOCAL,
  buffet: CAMPOS_BUFFET,
  bebidas: CAMPOS_BEBIDAS,
  foto_video: CAMPOS_FOTO_VIDEO,
  decoracao: CAMPOS_DECORACAO,
  musica: CAMPOS_MUSICA,
  assessoria: CAMPOS_ASSESSORIA,
};

/** Campos da categoria (vazio para as que não têm campos próprios). */
export function camposDa(categoria: string): CampoDef[] {
  return CAMPOS[categoria as CategoriaFornecedor] ?? [];
}

/** Nome do input no formulário (prefixo para não colidir com os campos comuns). */
export const nomeCampo = (chave: string) => `d_${chave}`;

const LIMITE_DINHEIRO = 100_000_000_000;

/**
 * Lê do formulário só os campos declarados para a categoria; qualquer outro `d_*` é descartado.
 * Vazio = não informado (a chave não vai para o jsonb). Valor inválido = erro com o nome do campo.
 */
export function lerDetalhes(categoria: string, fd: FormData): { detalhes: Detalhes } | { erro: string } {
  const detalhes: Detalhes = {};
  for (const c of camposDa(categoria)) {
    const nome = nomeCampo(c.chave);
    if (c.tipo === "multipla") {
      const marcados = [...new Set(fd.getAll(nome).map(String))];
      if (marcados.some((m) => !Object.hasOwn(c.opcoes, m))) return { erro: `${c.rotulo}: opção inválida.` };
      if (marcados.length) detalhes[c.chave] = Object.keys(c.opcoes).filter((o) => marcados.includes(o));
      continue;
    }
    const bruto = String(fd.get(nome) ?? "").trim();
    if (!bruto) continue;
    switch (c.tipo) {
      case "inteiro": {
        const n = /^\d+$/.test(bruto) ? Number(bruto) : Number.NaN;
        if (!Number.isSafeInteger(n) || n < c.min || n > c.max) {
          return { erro: `${c.rotulo}: informe um número inteiro de ${c.min} a ${c.max}.` };
        }
        detalhes[c.chave] = n;
        break;
      }
      case "dinheiro": {
        const v = parseBRL(bruto);
        if (v === null || Number.isNaN(v) || v > LIMITE_DINHEIRO) return { erro: `${c.rotulo}: valor inválido. Ex.: 150 ou 150,50` };
        detalhes[c.chave] = v;
        break;
      }
      case "booleano":
        if (bruto !== "sim" && bruto !== "nao") return { erro: `${c.rotulo}: responda sim ou não.` };
        detalhes[c.chave] = bruto === "sim";
        break;
      case "hora": {
        const h = bruto.slice(0, 5);
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(h)) return { erro: `${c.rotulo}: horário inválido.` };
        detalhes[c.chave] = h;
        break;
      }
      case "data": {
        const d = new Date(`${bruto}T12:00:00Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(bruto) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== bruto) {
          return { erro: `${c.rotulo}: data inválida.` };
        }
        detalhes[c.chave] = bruto;
        break;
      }
      case "opcao":
        if (!Object.hasOwn(c.opcoes, bruto)) return { erro: `${c.rotulo}: opção inválida.` };
        detalhes[c.chave] = bruto;
        break;
    }
  }
  return { detalhes };
}

/** Valores para preencher o formulário: texto por campo, lista para múltipla escolha. */
export type ValoresDetalhes = Record<string, string | string[]>;

/** jsonb gravado → valores do formulário. Ignora o que não é campo da categoria. */
export function detalhesParaForm(categoria: string, detalhes: Record<string, unknown>): ValoresDetalhes {
  const valores: ValoresDetalhes = {};
  for (const c of camposDa(categoria)) {
    const v = detalhes[c.chave];
    if (v === undefined || v === null) continue;
    if (c.tipo === "multipla") valores[c.chave] = Array.isArray(v) ? v.map(String) : [];
    else if (c.tipo === "booleano") valores[c.chave] = v ? "sim" : "nao";
    else if (c.tipo === "dinheiro" && typeof v === "number") {
      valores[c.chave] = (v / 100).toLocaleString("pt-BR", { minimumFractionDigits: v % 100 ? 2 : 0, maximumFractionDigits: 2 });
    } else valores[c.chave] = String(v);
  }
  return valores;
}

/** O que foi digitado (para devolver ao formulário num erro, sem perder nada). */
export function detalhesDigitados(categoria: string, fd: FormData): ValoresDetalhes {
  return Object.fromEntries(
    camposDa(categoria).map((c) => [
      c.chave,
      c.tipo === "multipla" ? fd.getAll(nomeCampo(c.chave)).map(String) : String(fd.get(nomeCampo(c.chave)) ?? "").trim(),
    ]),
  );
}

/** Texto curto de um valor já gravado: "120 pessoas", "Sim", "R$ 150,00", "16/10/2027"… */
export function formatarDetalhe(c: CampoDef, v: unknown): string | null {
  if (v === undefined || v === null) return null;
  switch (c.tipo) {
    case "inteiro":
      return typeof v === "number" ? `${v.toLocaleString("pt-BR")}${c.sufixo ? ` ${c.sufixo}` : ""}` : null;
    case "dinheiro":
      return typeof v === "number" ? formatarBRL(v) : null;
    case "booleano":
      return v ? "Sim" : "Não";
    case "hora":
      return typeof v === "string" ? v.replace(":", "h") : null;
    case "data":
      return typeof v === "string" ? v.split("-").reverse().join("/") : null;
    case "opcao":
      return typeof v === "string" ? (c.opcoes[v] ?? null) : null;
    case "multipla":
      return Array.isArray(v) && v.length ? v.map((o) => c.opcoes[String(o)] ?? String(o)).join(", ") : null;
  }
}

/** Lista {rótulo, texto} só com o que está preenchido, na ordem dos campos. */
export function resumoDetalhes(categoria: string, detalhes: Record<string, unknown>): { rotulo: string; texto: string }[] {
  return camposDa(categoria)
    .map((c) => ({ rotulo: c.rotulo, texto: formatarDetalhe(c, detalhes[c.chave]) }))
    .filter((r): r is { rotulo: string; texto: string } => r.texto !== null);
}
