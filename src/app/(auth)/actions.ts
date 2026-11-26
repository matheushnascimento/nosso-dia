"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { destinoSeguro, mensagemDeErroAuth, type EstadoForm } from "@/lib/erros";
import { texto } from "@/lib/formato";

const SENHA_MINIMA = 8;

export async function entrar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const email = texto(fd, "email").toLowerCase();
  const senha = String(fd.get("senha") ?? "");
  const next = destinoSeguro(texto(fd, "next"));
  if (!email || !senha) return { erro: "Preencha e-mail e senha.", campos: { email } };

  try {
    await auth().api.signInEmail({
      body: { email, password: senha, callbackURL: next },
      headers: await headers(),
    });
  } catch (e) {
    return { erro: mensagemDeErroAuth(e, "Não foi possível entrar."), campos: { email } };
  }
  redirect(next);
}

export async function cadastrar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const nome = texto(fd, "nome");
  const email = texto(fd, "email").toLowerCase();
  const senha = String(fd.get("senha") ?? "");
  const next = destinoSeguro(texto(fd, "next"), "/onboarding");
  const campos = { nome, email };

  if (!nome) return { erro: "Como podemos te chamar?", campos };
  if (!email.includes("@")) return { erro: "Informe um e-mail válido.", campos };
  if (senha.length < SENHA_MINIMA) {
    return { erro: `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`, campos };
  }

  try {
    // Com confirmação de e-mail obrigatória, não cria sessão: o link do e-mail faz o login e leva a `next`.
    // Se o e-mail já tiver conta, a resposta é a mesma (não revela quem está cadastrado).
    await auth().api.signUpEmail({
      body: { name: nome.slice(0, 80), email, password: senha, callbackURL: next },
      headers: await headers(),
    });
  } catch (e) {
    return { erro: mensagemDeErroAuth(e, "Não foi possível criar a conta."), campos };
  }
  return { ok: `Enviamos um link de confirmação para ${email}. Abra-o para continuar.` };
}

export async function recuperarSenha(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const email = texto(fd, "email").toLowerCase();
  if (!email.includes("@")) return { erro: "Informe um e-mail válido.", campos: { email } };

  try {
    await auth().api.requestPasswordReset({
      body: { email, redirectTo: "/nova-senha" },
      headers: await headers(),
    });
  } catch (e) {
    if (e instanceof APIError && e.status === "TOO_MANY_REQUESTS") {
      return { erro: mensagemDeErroAuth(e), campos: { email } };
    }
    // Para o casal a resposta não muda, mas o erro precisa aparecer no log do servidor.
    console.error("[nosso-dia] recuperarSenha:", e);
  }
  // Mesma resposta exista ou não a conta, para não revelar quem está cadastrado.
  return { ok: `Se houver uma conta para ${email}, enviamos um link para criar uma nova senha.` };
}

export async function definirNovaSenha(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const token = texto(fd, "token");
  const senha = String(fd.get("senha") ?? "");
  const confirmacao = String(fd.get("confirmacao") ?? "");
  if (!token) return { erro: "Link inválido. Peça um novo em “Esqueci a senha”." };
  if (senha.length < SENHA_MINIMA) {
    return { erro: `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` };
  }
  if (senha !== confirmacao) return { erro: "As senhas não conferem." };

  try {
    // Troca a senha e encerra todas as sessões (revokeSessionsOnPasswordReset).
    await auth().api.resetPassword({ body: { token, newPassword: senha }, headers: await headers() });
  } catch (e) {
    return { erro: mensagemDeErroAuth(e, "Não foi possível trocar a senha.") };
  }
  redirect("/entrar?senha=nova");
}

export async function sair() {
  try {
    await auth().api.signOut({ headers: await headers() });
  } catch {
    // sessão já inválida: o cookie é limpo do mesmo jeito
  }
  redirect("/");
}
