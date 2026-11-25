"use server";

import { redirect } from "next/navigation";
import { SITE_URL } from "@/lib/env";
import { destinoSeguro, mensagemDeErro, type EstadoForm } from "@/lib/erros";
import { texto } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";

const SENHA_MINIMA = 8;

export async function entrar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const email = texto(fd, "email").toLowerCase();
  const senha = String(fd.get("senha") ?? "");
  if (!email || !senha) return { erro: "Preencha e-mail e senha.", campos: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: mensagemDeErro(error, "Não foi possível entrar."), campos: { email } };

  redirect(destinoSeguro(texto(fd, "next")));
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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome }, // vira perfis.nome pelo trigger do banco
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { erro: mensagemDeErro(error, "Não foi possível criar a conta."), campos };

  // Confirmação de e-mail desligada no projeto: já existe sessão.
  if (data.session) redirect(next);

  return { ok: `Enviamos um link de confirmação para ${email}. Abra-o para continuar.` };
}

export async function recuperarSenha(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const email = texto(fd, "email").toLowerCase();
  if (!email.includes("@")) return { erro: "Informe um e-mail válido.", campos: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/nova-senha`,
  });
  if (error && error.code?.startsWith("over_")) {
    return { erro: mensagemDeErro(error), campos: { email } };
  }
  // Mesma resposta exista ou não a conta, para não revelar quem está cadastrado.
  return { ok: `Se houver uma conta para ${email}, enviamos um link para criar uma nova senha.` };
}

export async function definirNovaSenha(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const senha = String(fd.get("senha") ?? "");
  const confirmacao = String(fd.get("confirmacao") ?? "");
  if (senha.length < SENHA_MINIMA) {
    return { erro: `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` };
  }
  if (senha !== confirmacao) return { erro: "As senhas não conferem." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { erro: mensagemDeErro(error, "Não foi possível trocar a senha.") };

  redirect("/painel");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
