import "server-only";
import { consultar, type ContextoComEvento } from "@/lib/dal";
import { MOMENTOS, type Momento } from "@/lib/musica";

export type Musica = { id: string; momento: Momento; titulo: string; artista: string | null; link: string | null };

/** Músicas por momento, na ordem dos momentos e, dentro de cada um, na ordem escolhida. */
export async function listarMusicas(ctx: ContextoComEvento): Promise<Map<Momento, Musica[]>> {
  const linhas = await consultar(ctx, (trx) =>
    trx
      .selectFrom("musicas")
      .select(["id", "momento", "titulo", "artista", "link"])
      .where("evento_id", "=", ctx.evento.id)
      .orderBy("ordem")
      .orderBy("criado_em")
      .execute(),
  );
  const mapa = new Map<Momento, Musica[]>((Object.keys(MOMENTOS) as Momento[]).map((m) => [m, []]));
  for (const l of linhas) mapa.get(l.momento as Momento)?.push({ ...l, momento: l.momento as Momento });
  return mapa;
}
