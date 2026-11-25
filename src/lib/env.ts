/**
 * Variáveis de ambiente.
 *
 * Nada aqui pode lançar erro no carregamento do módulo: o `next build` avalia os módulos
 * das rotas para coletar configuração, e o build tem que passar mesmo sem Supabase
 * configurado (CI, primeiro deploy). A validação acontece só quando o valor é usado.
 */

// Acesso literal a process.env.NEXT_PUBLIC_* para o Next embutir no bundle do cliente.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** O Supabase está configurado neste ambiente? */
export function supabaseConfigurado(): boolean {
  return Boolean(url && chave);
}

/**
 * Página "em construção" no lugar do app inteiro.
 * Ligada com EM_CONSTRUCAO=1 ou, por segurança, sempre que o Supabase não estiver configurado.
 */
export function emConstrucao(): boolean {
  return process.env.EM_CONSTRUCAO === "1" || !supabaseConfigurado();
}

export function supabaseEnv(): { url: string; chave: string } {
  if (!url || !chave) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não definidas. Veja .env.example.",
    );
  }
  return { url, chave };
}

/** URL pública do app, usada em links de e-mail (confirmação, recuperação, convite). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
