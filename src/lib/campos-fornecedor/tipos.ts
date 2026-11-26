/**
 * Campos próprios de cada categoria de fornecedor, guardados em `fornecedores.detalhes` (jsonb).
 * Um módulo por categoria declara os campos; `index.ts` valida o formulário e converte de volta.
 * Puro (sem servidor): o formulário usa as mesmas definições.
 */

type Base = { chave: string; rotulo: string; dica?: string };

export type CampoDef =
  | (Base & { tipo: "inteiro"; min: number; max: number; sufixo?: string })
  | (Base & { tipo: "dinheiro" })
  | (Base & { tipo: "booleano" })
  | (Base & { tipo: "hora" })
  | (Base & { tipo: "data" })
  | (Base & { tipo: "opcao"; opcoes: Record<string, string> })
  | (Base & { tipo: "multipla"; opcoes: Record<string, string> });

/** Valor já validado, como fica no jsonb. Campo vazio simplesmente não aparece. */
export type ValorDetalhe = number | boolean | string | string[];
export type Detalhes = Record<string, ValorDetalhe>;
