import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { dialetoAuth } from "@/lib/db";
import { enviarEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/env";

/**
 * Login com Better Auth (e-mail e senha), guardado no mesmo Postgres do app.
 *
 * - Tabelas `ba_*` (migration 20261127000001): só o dono do banco acessa; os papéis do app não.
 * - Ids são UUID e, ao criar um usuário, um trigger do banco cria a linha em `auth.users` com o mesmo
 *   id, e-mail e nome: o resto do banco (perfis, membros, RLS por `auth.uid()`) continua igual.
 * - Cadastro exige confirmar o e-mail; trocar a senha encerra as outras sessões.
 *
 * Criado no primeiro uso, e não ao importar o módulo: o `next build` precisa passar sem as variáveis.
 */
function criar() {
  return betterAuth({
    appName: "Nosso Dia",
    baseURL: SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: origensConfiaveis(),
    database: { dialect: dialetoAuth(), type: "postgres" },

    user: { modelName: "ba_user" },
    session: { modelName: "ba_session" },
    account: { modelName: "ba_account" },
    verification: { modelName: "ba_verification" },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await enviarEmail({
          para: user.email,
          assunto: "Crie uma nova senha no Nosso Dia",
          titulo: "Nova senha",
          paragrafos: [`Oi, ${user.name}. Recebemos um pedido para criar uma nova senha para a sua conta.`],
          botao: { texto: "Criar nova senha", link: url },
          rodape: "O link vale por 1 hora. Se não foi você, ignore este e-mail: sua senha continua a mesma.",
        });
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true, // quem tenta entrar sem ter confirmado recebe um link novo
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24, // 24 horas
      sendVerificationEmail: async ({ user, url }) => {
        await enviarEmail({
          para: user.email,
          assunto: "Confirme seu e-mail no Nosso Dia",
          titulo: `Boas-vindas, ${user.name}!`,
          paragrafos: ["Falta só confirmar o seu e-mail para começar a planejar o casamento."],
          botao: { texto: "Confirmar e-mail", link: url },
          rodape: "O link vale por 24 horas.",
        });
      },
    },

    // Limite de tentativas guardado no banco: na Vercel cada função tem a própria memória.
    rateLimit: {
      enabled: process.env.NODE_ENV === "production",
      storage: "database",
      modelName: "ba_rate_limit",
    },

    advanced: {
      cookiePrefix: "nosso-dia",
      database: { generateId: "uuid" },
    },

    // Último da lista: deixa as Server Actions gravarem o cookie de sessão.
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof criar>;
const global = globalThis as unknown as { authNossoDia?: Auth };

export function auth(): Auth {
  global.authNossoDia ??= criar();
  return global.authNossoDia;
}

/** O endereço do app e, em desenvolvimento, os de DEV_ORIGINS (ex.: o homeserver pelo nome). */
function origensConfiaveis(): string[] {
  const porta = new URL(SITE_URL).port || "3000";
  const dev = (process.env.DEV_ORIGINS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => `http://${h}:${porta}`);
  return [SITE_URL, ...dev];
}
