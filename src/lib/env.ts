/**
 * Variáveis de ambiente.
 *
 * Nada aqui pode lançar erro no carregamento do módulo: o `next build` avalia os módulos
 * das rotas para coletar configuração, e o build tem que passar mesmo sem banco
 * configurado (CI, primeiro deploy). A validação acontece só quando o valor é usado.
 */

/**
 * Página "em construção" no lugar do app inteiro.
 * Ligada com EM_CONSTRUCAO=1 ou, por segurança, sempre que o banco ou o login não estiverem configurados.
 */
export function emConstrucao(): boolean {
  return motivoEmConstrucao() !== null;
}

/** Por que o app está em modo "em construção" (null = não está). Usado nos avisos de desenvolvimento. */
export function motivoEmConstrucao(): string | null {
  if (process.env.EM_CONSTRUCAO === "1") return "EM_CONSTRUCAO=1 está definido.";
  const faltando = [
    !process.env.DATABASE_URL && "DATABASE_URL",
    !process.env.BETTER_AUTH_SECRET && "BETTER_AUTH_SECRET",
  ].filter(Boolean);
  if (faltando.length) return `faltam ${faltando.join(" e ")} (confira o .env.local e reinicie o servidor).`;
  return null;
}

/** URL pública do app, usada em links de e-mail (confirmação, recuperação, convite). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
