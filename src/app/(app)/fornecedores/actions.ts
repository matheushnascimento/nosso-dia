"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { consultar, requireEvento } from "@/lib/dal";
import { mensagemDeErro, type EstadoForm } from "@/lib/erros";
import { parseBRL, texto } from "@/lib/formato";
import { ehCategoriaFornecedor, ehStatusFornecedor, type CategoriaFornecedor, type StatusFornecedor } from "@/lib/rotulos";

/**
 * Toda action reautentica pela DAL, roda como o usuário (RLS valendo) e filtra por evento_id.
 * As regras (categoria da lista, contratado com valor) são conferidas aqui e de novo no banco.
 */

type Campos = {
  categoria: CategoriaFornecedor;
  nome: string;
  telefone: string | null;
  email: string | null;
  instagram: string | null;
  site: string | null;
  status: StatusFornecedor;
  valor_orcado_centavos: number | null;
  valor_contratado_centavos: number | null;
  notas: string | null;
};

const LIMITE_VALOR = 100_000_000_000; // R$ 1 bilhão, o mesmo check do banco

function valor(fd: FormData, campo: string, rotulo: string): number | null | { erro: string } {
  const v = parseBRL(texto(fd, campo));
  if (v === null) return null;
  if (Number.isNaN(v)) return { erro: `Não entendemos o ${rotulo}. Ex.: 3.500 ou 3.500,50` };
  if (v > LIMITE_VALOR) return { erro: `O ${rotulo} passou do limite.` };
  return v;
}

/** "@fulano", "instagram.com/fulano/" ou "https://www.instagram.com/fulano" → "fulano". */
function lerInstagram(bruto: string): string | null | { erro: string } {
  if (!bruto) return null;
  const s = bruto.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[/?#].*$/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(s)) return { erro: "Instagram inválido. Use só o @ do perfil." };
  return s;
}

function lerSite(bruto: string): string | null | { erro: string } {
  if (!bruto) return null;
  const comEsquema = /^https?:\/\//i.test(bruto) ? bruto : `https://${bruto}`;
  try {
    const url = new URL(comEsquema);
    if (!url.hostname.includes(".") || comEsquema.length > 300) throw new Error();
    return url.toString();
  } catch {
    return { erro: "Site inválido. Ex.: www.espacojardim.com.br" };
  }
}

function lerCampos(fd: FormData): Campos | { erro: string } {
  const nome = texto(fd, "nome").slice(0, 120);
  if (!nome) return { erro: "Dê um nome para o fornecedor." };

  const categoria = texto(fd, "categoria");
  if (!ehCategoriaFornecedor(categoria)) return { erro: "Escolha uma categoria da lista." };

  const status = texto(fd, "status") || "pesquisando";
  if (!ehStatusFornecedor(status)) return { erro: "Situação inválida." };

  const email = texto(fd, "email").toLowerCase();
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { erro: "E-mail inválido." };
  }
  const telefone = texto(fd, "telefone");
  if (telefone.length > 40) return { erro: "Telefone longo demais." };

  const instagram = lerInstagram(texto(fd, "instagram"));
  if (instagram && typeof instagram === "object") return instagram;
  const site = lerSite(texto(fd, "site"));
  if (site && typeof site === "object") return site;

  const orcado = valor(fd, "valor_orcado", "valor orçado");
  if (orcado && typeof orcado === "object") return orcado;
  const contratado = valor(fd, "valor_contratado", "valor contratado");
  if (contratado && typeof contratado === "object") return contratado;
  if (status === "contratado" && contratado === null) {
    return { erro: "Para marcar como contratado, informe o valor contratado." };
  }

  const notas = texto(fd, "notas");
  if (notas.length > 5000) return { erro: "As notas passaram de 5.000 caracteres." };

  return {
    categoria,
    nome,
    telefone: telefone || null,
    email: email || null,
    instagram,
    site,
    status,
    valor_orcado_centavos: orcado,
    valor_contratado_centavos: contratado,
    notas: notas || null,
  };
}

/** Devolve o que a pessoa digitou, para o formulário não perder tudo num erro. */
function camposDigitados(fd: FormData): Record<string, string> {
  const nomes = ["nome", "categoria", "status", "telefone", "email", "instagram", "site", "valor_orcado", "valor_contratado", "notas"];
  return Object.fromEntries(nomes.map((n) => [n, texto(fd, n)]));
}

export async function criarFornecedor(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await requireEvento();
  const campos = lerCampos(fd);
  if ("erro" in campos) return { erro: campos.erro, campos: camposDigitados(fd) };

  let id: string;
  try {
    const novo = await consultar(ctx, (trx) =>
      trx
        .insertInto("fornecedores")
        .values({ evento_id: ctx.evento.id, ...campos })
        .returning("id")
        .executeTakeFirstOrThrow(),
    );
    id = novo.id;
  } catch (e) {
    return { erro: mensagemDeErro(e, "Não foi possível cadastrar o fornecedor."), campos: camposDigitados(fd) };
  }
  redirect(`/fornecedores/${id}?novo=1`);
}

export async function editarFornecedor(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await requireEvento();
  const id = texto(fd, "id");
  const campos = lerCampos(fd);
  if ("erro" in campos) return { erro: campos.erro, campos: camposDigitados(fd) };

  try {
    const r = await consultar(ctx, (trx) =>
      trx
        .updateTable("fornecedores")
        .set(campos)
        .where("id", "=", id)
        .where("evento_id", "=", ctx.evento.id)
        .executeTakeFirst(),
    );
    if (!r.numUpdatedRows) return { erro: "Fornecedor não encontrado." };
  } catch (e) {
    return { erro: mensagemDeErro(e, "Não foi possível salvar."), campos: camposDigitados(fd) };
  }
  refresh();
  return { ok: "Salvo." };
}

export async function excluirFornecedor(fd: FormData) {
  const ctx = await requireEvento();
  try {
    await consultar(ctx, (trx) =>
      trx.deleteFrom("fornecedores").where("id", "=", texto(fd, "id")).where("evento_id", "=", ctx.evento.id).execute(),
    );
  } catch (e) {
    console.error("[nosso-dia] excluirFornecedor:", e);
  }
  redirect("/fornecedores");
}
