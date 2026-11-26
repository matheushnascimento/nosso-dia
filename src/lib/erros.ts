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
};

const POR_CODIGO_AUTH: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. Procure o link na sua caixa de entrada.",
  user_already_exists: "Já existe uma conta com este e-mail.",
  weak_password: "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.",
  same_password: "A nova senha precisa ser diferente da atual.",
  over_email_send_rate_limit: "Muitas tentativas. Espere alguns minutos e tente de novo.",
  over_request_rate_limit: "Muitas tentativas. Espere alguns minutos e tente de novo.",
};

type ErroSupabase = { message?: string; hint?: string | null; code?: string | null } | null;

export function mensagemDeErro(erro: ErroSupabase, padrao = "Algo deu errado. Tente de novo."): string {
  if (!erro) return padrao;
  if (erro.hint && POR_HINT[erro.hint]) return POR_HINT[erro.hint];
  if (erro.code && POR_CODIGO_AUTH[erro.code]) return POR_CODIGO_AUTH[erro.code];
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
