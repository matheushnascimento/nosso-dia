/** Traduz erros do banco e do login em mensagens para o casal. */

const POR_HINT: Record<string, string> = {
  ja_tem_evento: "Você já participa de um casamento.",
  limite_parceiros: "Este casamento já tem os dois parceiros.",
  convite_invalido: "Este convite não é mais válido. Peça um novo link.",
  email_diferente:
    "Este convite foi enviado para outro e-mail. Entre com a conta do e-mail convidado.",
  pacote_automatico: "Este checklist faz parte de todo casamento e não pode ser removido.",
  pacote_inexistente: "Esse checklist não está disponível.",
  data_passada: "A data do casamento não pode estar no passado.",
  votos_vazios: "Escreva os votos antes de marcar como prontos.",
  votos_longos: "Os votos passaram do limite de 10.000 caracteres.",
};

/** Códigos de erro do Better Auth (APIError.body.code). */
const POR_CODIGO_AUTH: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
  INVALID_EMAIL: "Informe um e-mail válido.",
  EMAIL_NOT_VERIFIED: "Confirme seu e-mail antes de entrar. Enviamos um novo link para a sua caixa de entrada.",
  PASSWORD_TOO_SHORT: "A senha precisa ter pelo menos 8 caracteres.",
  PASSWORD_TOO_LONG: "A senha é longa demais.",
  INVALID_TOKEN: "Este link expirou ou já foi usado. Peça um novo.",
  TOKEN_EXPIRED: "Este link expirou ou já foi usado. Peça um novo.",
  INVALID_ORIGIN: "Não foi possível confirmar de onde veio o pedido. Recarregue a página e tente de novo.",
};

/** Checks do banco com mensagem própria (postgres.js expõe o nome em `constraint_name`). */
const POR_CONSTRAINT: Record<string, string> = {
  fornecedores_contratado_com_valor: "Para marcar como contratado, informe o valor contratado.",
  fornecedores_categoria_check: "Escolha uma categoria da lista.",
};

type ErroBanco = { message?: string; hint?: string | null; code?: string | null; constraint_name?: string | null };

/** Erros do Postgres (lançados pelo driver): regras de negócio vêm com `hint`. */
export function mensagemDeErro(e: unknown, padrao = "Algo deu errado. Tente de novo."): string {
  const erro = e as ErroBanco | null;
  if (!erro) return padrao;
  if (erro.hint && POR_HINT[erro.hint]) return POR_HINT[erro.hint];
  if (erro.constraint_name && POR_CONSTRAINT[erro.constraint_name]) return POR_CONSTRAINT[erro.constraint_name];
  if (erro.code === "23505") return "Já existe um registro igual.";
  if (erro.code === "42501") return "Você não tem permissão para isso.";
  console.error("[nosso-dia] erro do banco:", erro.code ?? "", erro.message ?? e);
  return padrao;
}

/** Estado padrão dos formulários com useActionState. */
export type EstadoForm = { erro?: string; ok?: string; campos?: Record<string, string> };
export const ESTADO_INICIAL: EstadoForm = {};

/** Aceita só caminhos internos em ?next= (evita open redirect). */
export function destinoSeguro(next: string | null | undefined, padrao = "/painel"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return padrao;
  }
  return next;
}

/** Erros do Better Auth (lançados como APIError pelas chamadas `auth().api.*`). */
export function mensagemDeErroAuth(e: unknown, padrao = "Algo deu errado. Tente de novo."): string {
  const erro = e as { status?: string | number; statusCode?: number; body?: { code?: string } } | null;
  if (erro?.status === "TOO_MANY_REQUESTS" || erro?.statusCode === 429) {
    return "Muitas tentativas. Espere alguns minutos e tente de novo.";
  }
  const codigo = erro?.body?.code;
  if (codigo && POR_CODIGO_AUTH[codigo]) return POR_CODIGO_AUTH[codigo];
  console.error("[nosso-dia] erro de autenticação:", e);
  return padrao;
}

/**
 * Para ações sem mensagem na tela (marcar tarefa, excluir item…): um erro, como um id adulterado
 * no formulário, vai para o log em vez de derrubar a página. O RLS já impediu o efeito.
 */
export async function semDerrubar(acao: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.error(`[nosso-dia] ${acao}:`, e);
  }
}
