/** Traduz erros do Supabase (Postgres/Auth) em mensagens para o casal. */

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

type ErroSupabase = { message?: string; hint?: string | null; code?: string | null } | null;

export function mensagemDeErro(erro: ErroSupabase, padrao = "Algo deu errado. Tente de novo."): string {
  if (!erro) return padrao;
  if (erro.hint && POR_HINT[erro.hint]) return POR_HINT[erro.hint];
  if (erro.code === "23505") return "Já existe um registro igual.";
  if (erro.code === "42501") return "Você não tem permissão para isso.";
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
