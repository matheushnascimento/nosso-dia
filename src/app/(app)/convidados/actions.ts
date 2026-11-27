"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { consultar, requireEvento } from "@/lib/dal";
import {
  MAX_NOMES_POR_CONVITE,
  ehConfirmacao,
  ehFaixa,
  ehLado,
  lerNomes,
  nomeDoConvite,
  type Confirmacao,
} from "@/lib/convidados";
import { mensagemDeErro, type EstadoForm } from "@/lib/erros";
import { parseInteiro, pluralizar, texto } from "@/lib/formato";

/** Toda action reautentica pela DAL, roda como o usuário (RLS valendo) e filtra por evento_id. */

const UUID = /^[0-9a-f-]{36}$/i;

function lerGrupo(fd: FormData): string | null | { erro: string } {
  const grupo = texto(fd, "grupo").replace(/\s+/g, " ");
  if (grupo.length > 60) return { erro: "O nome do grupo pode ter até 60 caracteres." };
  return grupo || null;
}

/** Cadastro rápido: um convite com uma ou mais pessoas (um nome por linha). */
export async function criarConvite(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await requireEvento();
  const campos = {
    nomes: String(fd.get("nomes") ?? ""),
    nome_convite: texto(fd, "nome_convite"),
    lado: texto(fd, "lado"),
    grupo: texto(fd, "grupo"),
    faixa: texto(fd, "faixa"),
  };
  const nomes = lerNomes(campos.nomes);
  if (!nomes.length) return { erro: "Escreva pelo menos um nome.", campos };
  if (nomes.length > MAX_NOMES_POR_CONVITE) {
    return { erro: `Um convite pode ter até ${MAX_NOMES_POR_CONVITE} pessoas.`, campos };
  }
  if (nomes.some((n) => n.length > 120)) return { erro: "Algum nome passou de 120 caracteres.", campos };
  if (!ehLado(campos.lado)) return { erro: "Escolha de quem é o convite.", campos };
  const faixa = campos.faixa || "adulto";
  if (!ehFaixa(faixa)) return { erro: "Escolha uma faixa da lista.", campos };
  const grupo = lerGrupo(fd);
  if (grupo && typeof grupo === "object") return { erro: grupo.erro, campos };
  const nomeConvite = nomeDoConvite(campos.nome_convite, nomes);
  if (nomeConvite.length > 120) return { erro: "O nome do convite pode ter até 120 caracteres.", campos };

  try {
    await consultar(ctx, async (trx) => {
      const convite = await trx
        .insertInto("convites_familia")
        .values({ evento_id: ctx.evento.id, nome: nomeConvite, lado: campos.lado as "a" | "b" | "ambos", grupo })
        .returning("id")
        .executeTakeFirstOrThrow();
      await trx
        .insertInto("pessoas")
        .values(nomes.map((nome, i) => ({ evento_id: ctx.evento.id, convite_id: convite.id, nome, faixa, ordem: i + 1 })))
        .execute();
    });
  } catch (e) {
    return { erro: mensagemDeErro(e, "Não foi possível adicionar o convite."), campos };
  }
  refresh();
  // mantém lado e grupo para cadastrar o próximo do mesmo jeito
  return {
    ok: `“${nomeConvite}” adicionado${nomes.length > 1 ? ` (${pluralizar(nomes.length, "pessoa", "pessoas")})` : ""}.`,
    campos: { lado: campos.lado, grupo: campos.grupo },
  };
}

/**
 * Confirmação em lote ou de uma pessoa só. O mesmo formulário envia os dois:
 * o botão de cada linha manda `linha=<id>:<status>`; os botões do lote mandam `status` e os `ids` marcados.
 */
export async function definirConfirmacao(fd: FormData) {
  const ctx = await requireEvento();
  let ids: string[];
  let status: string;
  const linha = texto(fd, "linha");
  if (linha) {
    const [id, s] = linha.split(":");
    ids = [id];
    status = s ?? "";
  } else {
    ids = fd.getAll("ids").map(String);
    status = texto(fd, "status");
  }
  ids = ids.filter((id) => UUID.test(id));
  if (!ids.length || !ehConfirmacao(status)) return;
  try {
    await consultar(ctx, (trx) =>
      trx
        .updateTable("pessoas")
        .set({ confirmacao: status as Confirmacao })
        .where("evento_id", "=", ctx.evento.id)
        .where("id", "in", ids)
        .execute(),
    );
  } catch (e) {
    console.error("[nosso-dia] definirConfirmacao:", e);
  }
  refresh();
}

export async function salvarConvite(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await requireEvento();
  const id = texto(fd, "id");
  const nome = texto(fd, "nome").replace(/\s+/g, " ");
  const lado = texto(fd, "lado");
  if (!UUID.test(id)) return { erro: "Convite não encontrado." };
  if (!nome) return { erro: "Dê um nome ao convite." };
  if (nome.length > 120) return { erro: "O nome do convite pode ter até 120 caracteres." };
  if (!ehLado(lado)) return { erro: "Escolha de quem é o convite." };
  const grupo = lerGrupo(fd);
  if (grupo && typeof grupo === "object") return { erro: grupo.erro };
  try {
    const r = await consultar(ctx, (trx) =>
      trx
        .updateTable("convites_familia")
        .set({ nome, lado, grupo })
        .where("id", "=", id)
        .where("evento_id", "=", ctx.evento.id)
        .executeTakeFirst(),
    );
    if (!r.numUpdatedRows) return { erro: "Convite não encontrado." };
  } catch (e) {
    return { erro: mensagemDeErro(e, "Não foi possível salvar o convite.") };
  }
  refresh();
  return { ok: "Convite salvo." };
}

export async function excluirConvite(fd: FormData) {
  const ctx = await requireEvento();
  const id = texto(fd, "id");
  if (UUID.test(id)) {
    try {
      await consultar(ctx, (trx) =>
        trx.deleteFrom("convites_familia").where("id", "=", id).where("evento_id", "=", ctx.evento.id).execute(),
      );
    } catch (e) {
      console.error("[nosso-dia] excluirConvite:", e);
    }
  }
  redirect("/convidados");
}

export async function adicionarPessoa(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await requireEvento();
  const conviteId = texto(fd, "convite_id");
  const campos = { nome: texto(fd, "nome").replace(/\s+/g, " "), faixa: texto(fd, "faixa") || "adulto" };
  if (!UUID.test(conviteId)) return { erro: "Convite não encontrado.", campos };
  if (!campos.nome) return { erro: "Escreva o nome.", campos };
  if (campos.nome.length > 120) return { erro: "O nome pode ter até 120 caracteres.", campos };
  if (!ehFaixa(campos.faixa)) return { erro: "Escolha uma faixa da lista.", campos };
  const faixa = campos.faixa;
  try {
    await consultar(ctx, async (trx) => {
      const ultimo = await trx
        .selectFrom("pessoas")
        .select((eb) => eb.fn.max("ordem").as("ordem"))
        .where("convite_id", "=", conviteId)
        .where("evento_id", "=", ctx.evento.id)
        .executeTakeFirst();
      await trx
        .insertInto("pessoas")
        .values({ evento_id: ctx.evento.id, convite_id: conviteId, nome: campos.nome, faixa, ordem: (ultimo?.ordem ?? 0) + 1 })
        .execute();
    });
  } catch (e) {
    return { erro: mensagemDeErro(e, "Não foi possível adicionar a pessoa."), campos };
  }
  refresh();
  return { ok: `${campos.nome} adicionado ao convite.` };
}

export async function salvarPessoa(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await requireEvento();
  const id = texto(fd, "id");
  const nome = texto(fd, "nome").replace(/\s+/g, " ");
  const faixa = texto(fd, "faixa");
  const confirmacao = texto(fd, "confirmacao");
  const idade = parseInteiro(fd.get("idade"));
  const opcional = (campo: string, max: number) => {
    const v = texto(fd, campo);
    return v.length > max ? { erro: true as const } : v || null;
  };
  const telefone = opcional("telefone", 40);
  const email = opcional("email", 254);
  const restricao = opcional("restricao_alimentar", 500);
  const observacao = opcional("observacao", 2000);

  if (!UUID.test(id)) return { erro: "Convidado não encontrado." };
  if (!nome) return { erro: "Escreva o nome." };
  if (nome.length > 120) return { erro: "O nome pode ter até 120 caracteres." };
  if (!ehFaixa(faixa)) return { erro: "Escolha uma faixa da lista." };
  if (!ehConfirmacao(confirmacao)) return { erro: "Escolha a confirmação." };
  if (idade !== null && (Number.isNaN(idade) || idade < 0 || idade > 120)) return { erro: "A idade precisa estar entre 0 e 120." };
  for (const v of [telefone, email, restricao, observacao]) {
    if (v && typeof v === "object") return { erro: "Algum campo passou do tamanho máximo." };
  }
  if (typeof email === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "Esse e-mail não parece válido." };

  try {
    const r = await consultar(ctx, (trx) =>
      trx
        .updateTable("pessoas")
        .set({
          nome,
          faixa,
          confirmacao,
          idade,
          telefone: telefone as string | null,
          email: email as string | null,
          restricao_alimentar: restricao as string | null,
          observacao: observacao as string | null,
        })
        .where("id", "=", id)
        .where("evento_id", "=", ctx.evento.id)
        .executeTakeFirst(),
    );
    if (!r.numUpdatedRows) return { erro: "Convidado não encontrado." };
  } catch (e) {
    return { erro: mensagemDeErro(e, "Não foi possível salvar.") };
  }
  refresh();
  return { ok: `${nome}: salvo.` };
}

/** Excluir a última pessoa apaga o convite (trigger no banco); aí volta para a lista. */
export async function excluirPessoa(fd: FormData) {
  const ctx = await requireEvento();
  const id = texto(fd, "id");
  const conviteId = texto(fd, "convite_id");
  if (!UUID.test(id)) return;
  let conviteSobrou = true;
  try {
    conviteSobrou = await consultar(ctx, async (trx) => {
      await trx.deleteFrom("pessoas").where("id", "=", id).where("evento_id", "=", ctx.evento.id).execute();
      const c = await trx
        .selectFrom("convites_familia")
        .select("id")
        .where("id", "=", UUID.test(conviteId) ? conviteId : "00000000-0000-0000-0000-000000000000")
        .executeTakeFirst();
      return Boolean(c);
    });
  } catch (e) {
    console.error("[nosso-dia] excluirPessoa:", e);
  }
  if (!conviteSobrou) redirect("/convidados");
  refresh();
}
