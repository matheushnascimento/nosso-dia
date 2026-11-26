/**
 * Slugs dos guias, sem o conteúdo. Fica separado do índice para o Proxy (src/proxy.ts) poder
 * responder 404 a um slug desconhecido sem carregar os componentes dos guias.
 * O índice (./index.ts) é tipado por esta lista: um guia sem slug aqui, ou um slug sem guia,
 * não compila.
 */
export const SLUGS_GUIAS = ["como-funciona-o-checklist", "documentos-de-viagem", "regime-de-bens"] as const;

export type SlugGuia = (typeof SLUGS_GUIAS)[number];

export function ehSlugDeGuia(slug: string): slug is SlugGuia {
  return (SLUGS_GUIAS as readonly string[]).includes(slug);
}
