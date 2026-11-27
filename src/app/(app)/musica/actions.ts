"use server";

import { refresh } from "next/cache";
import { consultar, requireEvento } from "@/lib/dal";
import { mensagemDeErro, type EstadoForm } from "@/lib/erros";
import { texto } from "@/lib/formato";
import { ehMomento } from "@/lib/musica";

/** Toda action reautentica pela DAL, roda como o usuário (RLS valendo) e filtra por evento_id. */

function lerLink(bruto: string): string | null | { erro: string } {
  if (!bruto) return null;
  try {
    const url = new URL(bruto);
    if ((url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".") && bruto.length <= 2000) {
      return url.toString();
    }
  } catch {
    // cai no erro abaixo
  }
  return { erro: "O link precisa começar com http:// ou https://" };
}

export async function adicionarMusica(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await requireEvento();
  const campos = { momento: texto(fd, "momento"), titulo: texto(fd, "titulo"), artista: texto(fd, "artista"), link: texto(fd, "link") };
  if (!ehMomento(campos.momento)) return { erro: "Escolha um momento da lista.", campos };
  if (!campos.titulo) return { erro: "Informe o nome da música.", campos };
  if (campos.titulo.length > 200 || campos.artista.length > 200) return { erro: "Nome ou artista longo demais.", campos };
  const link = lerLink(campos.link);
  if (link && typeof link === "object") return { erro: link.erro, campos };

  try {
    await consultar(ctx, async (trx) => {
      const ultimo = await trx
        .selectFrom("musicas")
        .select((eb) => eb.fn.max("ordem").as("ordem"))
        .where("evento_id", "=", ctx.evento.id)
        .where("momento", "=", campos.momento)
        .executeTakeFirst();
      await trx
        .insertInto("musicas")
        .values({
          evento_id: ctx.evento.id,
          momento: campos.momento,
          titulo: campos.titulo,
          artista: campos.artista || null,
          link,
          ordem: (ultimo?.ordem ?? 0) + 1,
        })
        .execute();
    });
  } catch (e) {
    return { erro: mensagemDeErro(e, "Não foi possível adicionar a música."), campos };
  }
  refresh();
  // mantém o momento escolhido para adicionar a próxima
  return { ok: `“${campos.titulo}” adicionada.`, campos: { momento: campos.momento } };
}

export async function excluirMusica(fd: FormData) {
  const ctx = await requireEvento();
  try {
    await consultar(ctx, (trx) =>
      trx.deleteFrom("musicas").where("id", "=", texto(fd, "id")).where("evento_id", "=", ctx.evento.id).execute(),
    );
  } catch (e) {
    console.error("[nosso-dia] excluirMusica:", e);
  }
  refresh();
}

/** Troca de lugar com a vizinha de cima ou de baixo, dentro do mesmo momento. */
export async function moverMusica(fd: FormData) {
  const ctx = await requireEvento();
  const id = texto(fd, "id");
  const paraCima = texto(fd, "direcao") === "cima";
  try {
    await consultar(ctx, async (trx) => {
      const atual = await trx
        .selectFrom("musicas")
        .select(["id", "momento", "ordem"])
        .where("id", "=", id)
        .where("evento_id", "=", ctx.evento.id)
        .executeTakeFirst();
      if (!atual) return;
      // reordena o momento inteiro em 1..n (corrige empates) e troca as duas posições
      const lista = await trx
        .selectFrom("musicas")
        .select("id")
        .where("evento_id", "=", ctx.evento.id)
        .where("momento", "=", atual.momento)
        .orderBy("ordem")
        .orderBy("criado_em")
        .execute();
      const i = lista.findIndex((m) => m.id === id);
      const j = paraCima ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= lista.length) return;
      [lista[i], lista[j]] = [lista[j], lista[i]];
      for (const [pos, m] of lista.entries()) {
        await trx.updateTable("musicas").set({ ordem: pos + 1 }).where("id", "=", m.id).execute();
      }
    });
  } catch (e) {
    console.error("[nosso-dia] moverMusica:", e);
  }
  refresh();
}
