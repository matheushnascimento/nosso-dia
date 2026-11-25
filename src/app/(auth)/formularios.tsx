"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Aviso, Campo, Entrada, Titulo } from "@/components/ui";
import { ESTADO_INICIAL } from "@/lib/erros";
import { cadastrar, definirNovaSenha, entrar, recuperarSenha } from "./actions";

/** Repassa ?next= (e ?email=) entre entrar e cadastrar, para o fluxo do convite. */
function useContinuacao() {
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const email = params.get("email") ?? "";
  const qs = new URLSearchParams();
  if (next) qs.set("next", next);
  if (email) qs.set("email", email);
  const sufixo = qs.size ? `?${qs}` : "";
  return { next, email, sufixo, erroLink: params.get("erro") === "link" };
}

export function FormEntrar() {
  const { next, email, sufixo, erroLink } = useContinuacao();
  const [estado, acao] = useActionState(entrar, ESTADO_INICIAL);

  return (
    <form action={acao} className="flex flex-col gap-5">
      <Titulo>Que bom ver vocês</Titulo>
      {erroLink && <Aviso>O link expirou ou já foi usado. Entre ou peça um novo.</Aviso>}
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <input type="hidden" name="next" value={next} />
      <Campo rotulo="E-mail">
        <Entrada name="email" type="email" autoComplete="email" required defaultValue={estado.campos?.email ?? email} />
      </Campo>
      <Campo rotulo="Senha">
        <Entrada name="senha" type="password" autoComplete="current-password" required />
      </Campo>
      <BotaoEnviar pendente="Entrando…">Entrar</BotaoEnviar>
      <div className="flex justify-between text-sm text-tinta-suave">
        <Link href="/recuperar-senha" className="hover:text-tinta">
          Esqueci a senha
        </Link>
        <Link href={`/cadastrar${sufixo}`} className="font-medium text-tinta hover:underline">
          Criar conta
        </Link>
      </div>
    </form>
  );
}

export function FormCadastrar() {
  const { next, email, sufixo } = useContinuacao();
  const [estado, acao] = useActionState(cadastrar, ESTADO_INICIAL);

  if (estado.ok) {
    return (
      <div className="flex flex-col gap-5">
        <Titulo>Confira seu e-mail</Titulo>
        <Aviso tipo="ok">{estado.ok}</Aviso>
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-5">
      <Titulo>Vamos começar</Titulo>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <input type="hidden" name="next" value={next} />
      <Campo rotulo="Seu nome">
        <Entrada name="nome" autoComplete="given-name" required defaultValue={estado.campos?.nome} />
      </Campo>
      <Campo rotulo="E-mail">
        <Entrada name="email" type="email" autoComplete="email" required defaultValue={estado.campos?.email ?? email} />
      </Campo>
      <Campo rotulo="Senha" dica="Pelo menos 8 caracteres.">
        <Entrada name="senha" type="password" autoComplete="new-password" minLength={8} required />
      </Campo>
      <BotaoEnviar pendente="Criando conta…">Criar conta</BotaoEnviar>
      <p className="text-center text-sm text-tinta-suave">
        Já tem conta?{" "}
        <Link href={`/entrar${sufixo}`} className="font-medium text-tinta hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

export function FormRecuperar() {
  const [estado, acao] = useActionState(recuperarSenha, ESTADO_INICIAL);
  return (
    <form action={acao} className="flex flex-col gap-5">
      <Titulo>Esqueceu a senha?</Titulo>
      <p className="text-sm text-tinta-suave">Enviamos um link para você criar uma nova.</p>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.ok ? (
        <Aviso tipo="ok">{estado.ok}</Aviso>
      ) : (
        <>
          <Campo rotulo="E-mail">
            <Entrada name="email" type="email" autoComplete="email" required defaultValue={estado.campos?.email} />
          </Campo>
          <BotaoEnviar pendente="Enviando…">Enviar link</BotaoEnviar>
        </>
      )}
      <Link href="/entrar" className="text-center text-sm text-tinta-suave hover:text-tinta">
        Voltar para entrar
      </Link>
    </form>
  );
}

export function FormNovaSenha() {
  const [estado, acao] = useActionState(definirNovaSenha, ESTADO_INICIAL);
  return (
    <form action={acao} className="flex flex-col gap-5">
      <Titulo>Nova senha</Titulo>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <Campo rotulo="Nova senha" dica="Pelo menos 8 caracteres.">
        <Entrada name="senha" type="password" autoComplete="new-password" minLength={8} required />
      </Campo>
      <Campo rotulo="Repita a senha">
        <Entrada name="confirmacao" type="password" autoComplete="new-password" minLength={8} required />
      </Campo>
      <BotaoEnviar>Salvar senha</BotaoEnviar>
    </form>
  );
}
