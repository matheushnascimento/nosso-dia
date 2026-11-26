"use server";

import { refresh } from "next/cache";
import { lerData } from "@/lib/campos-evento";
import { requireEvento } from "@/lib/dal";
import { enviarEmailConvite } from "@/lib/email";
import { SITE_URL } from "@/lib/env";
import { mensagemDeErro, type EstadoForm } from "@/lib/erros";
import { parseBRL, parseInteiro, texto } from "@/lib/formato";
import { UFS } from "@/lib/rotulos";

export type Previa = {
  mudam_de_prazo: number;
  prazo_travado: number;
  passam_a_atrasadas: number;
  ficam_sem_prazo: number;
};

export type ResultadoEvento =
  | { tipo: "erro"; mensagem: string }
  | { tipo: "previa"; previa: Previa }
  | { tipo: "salvo" };

/**
 * Salvar o casamento em duas etapas:
 *  1. sem `confirmado`: se a data mudou, devolve a prévia do impacto nas tarefas;
 *  2. com `confirmado=1` (ou se a data não mudou): grava.
 */
export async function salvarEvento(fd: FormData): Promise<ResultadoEvento> {
  const ctx = await requireEvento();
  const { supabase, evento } = ctx;

  const nome = texto(fd, "nome_exibicao");
  if (!nome) return { tipo: "erro", mensagem: "Dê um nome para o casamento." };

  const data = lerData(fd, evento);
  if ("erro" in data) return { tipo: "erro", mensagem: data.erro };

  const uf = texto(fd, "uf").toUpperCase();
  if (uf && !(UFS as readonly string[]).includes(uf)) return { tipo: "erro", mensagem: "UF inválida." };

  const convidados = parseInteiro(fd.get("convidados"));
  if (Number.isNaN(convidados) || (convidados !== null && (convidados < 1 || convidados > 5000))) {
    return { tipo: "erro", mensagem: "Informe um número de convidados entre 1 e 5000." };
  }
  const orcamento = parseBRL(texto(fd, "orcamento"));
  if (Number.isNaN(orcamento)) return { tipo: "erro", mensagem: "Não entendemos o valor do orçamento." };

  const novaData = data.data ?? null;
  const dataMudou = data.data_status !== evento.data_status || novaData !== evento.data;

  if (dataMudou && texto(fd, "confirmado") !== "1") {
    const { data: previa, error } = await supabase.rpc("previa_mudanca_data", {
      p_evento_id: evento.id,
      p_data_status: data.data_status,
      p_data: data.data,
    });
    if (error || !previa?.[0]) return { tipo: "erro", mensagem: mensagemDeErro(error) };
    return { tipo: "previa", previa: previa[0] };
  }

  const { error } = await supabase
    .from("eventos")
    .update({
      nome_exibicao: nome,
      data_status: data.data_status,
      data: novaData,
      horario_cerimonia: data.horario_cerimonia ?? null,
      horario_festa: data.horario_festa ?? null,
      cidade: texto(fd, "cidade") || null,
      uf: uf || null,
      convidados_estimados: convidados,
      orcamento_total_centavos: orcamento,
    })
    .eq("id", evento.id);
  if (error) return { tipo: "erro", mensagem: mensagemDeErro(error, "Não foi possível salvar.") };

  refresh();
  return { tipo: "salvo" };
}

export async function salvarMeuNome(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await requireEvento();
  const nome = texto(fd, "nome");
  if (!nome) return { erro: "Informe seu nome." };
  const { error } = await ctx.supabase.from("perfis").update({ nome }).eq("id", ctx.userId);
  if (error) return { erro: mensagemDeErro(error) };
  refresh();
  return { ok: "Nome atualizado." };
}

export async function convidarParceiro(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await requireEvento();
  const email = texto(fd, "email").toLowerCase();
  if (!email.includes("@")) return { erro: "Informe um e-mail válido.", campos: { email } };
  if (email === ctx.email) return { erro: "Esse é o seu e-mail. Informe o do seu amor.", campos: { email } };

  const { data, error } = await ctx.supabase
    .from("convites_parceiro")
    .insert({ evento_id: ctx.evento.id, email, convidado_por: ctx.userId })
    .select("token")
    .single();
  if (error) {
    const msg =
      error.code === "23505"
        ? "Já existe um convite pendente. Cancele-o para enviar outro."
        : mensagemDeErro(error, "Não foi possível criar o convite.");
    return { erro: msg, campos: { email } };
  }

  const enviado = await enviarEmailConvite({
    para: email,
    link: `${SITE_URL}/convite/${data.token}`,
    nomeEvento: ctx.evento.nome_exibicao,
    quemConvidou: ctx.nome || "Seu amor",
  });

  refresh();
  return {
    ok: enviado
      ? `Convite enviado para ${email}.`
      : `Convite criado. Copie o link abaixo e envie para ${email}.`,
  };
}

export async function cancelarConvite(fd: FormData) {
  const ctx = await requireEvento();
  await ctx.supabase
    .from("convites_parceiro")
    .update({ cancelado_em: new Date().toISOString() })
    .eq("id", texto(fd, "id"))
    .eq("evento_id", ctx.evento.id);
  refresh();
}

/**
 * Escolha de checklist num grupo (ex.: tipo de cerimônia).
 * `pacote` vazio = "ainda não decidimos": desativa o escolhido atual do grupo.
 */
export async function escolherPacote(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await requireEvento();
  const pacote = texto(fd, "pacote");
  const atual = texto(fd, "atual");
  if (pacote === atual) return {};

  if (!pacote) {
    if (!atual) return {};
    const { data, error } = await ctx.supabase.rpc("desativar_pacote", {
      p_evento_id: ctx.evento.id,
      p_pacote: atual,
    });
    if (error) return { erro: mensagemDeErro(error) };
    refresh();
    return { ok: resumoTroca(0, data ?? 0) };
  }

  const { data, error } = await ctx.supabase.rpc("ativar_pacote", {
    p_evento_id: ctx.evento.id,
    p_pacote: pacote,
  });
  if (error || !data?.[0]) return { erro: mensagemDeErro(error) };
  refresh();
  return { ok: resumoTroca(data[0].criadas, data[0].removidas) };
}

function resumoTroca(criadas: number, removidas: number): string {
  const partes = [];
  if (criadas) partes.push(`${criadas} ${criadas === 1 ? "tarefa adicionada" : "tarefas adicionadas"}`);
  if (removidas) partes.push(`${removidas} ${removidas === 1 ? "tarefa removida" : "tarefas removidas"}`);
  return partes.length ? `Checklist atualizado: ${partes.join(", ")}.` : "Checklist atualizado.";
}
