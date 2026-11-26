import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ehSlugDeGuia } from "@/conteudo/guias/slugs";
import type { Database } from "@/lib/database.types";
import { emConstrucao, motivoEmConstrucao, supabaseEnv } from "@/lib/env";

/** Rotas que exigem login. */
const PROTEGIDAS = ["/painel", "/tarefas", "/configuracoes", "/votos", "/onboarding", "/nova-senha"];
/** Rotas que um usuário logado não precisa ver. */
const SO_DESLOGADO = ["/", "/entrar", "/cadastrar"];

function casa(path: string, prefixos: string[]) {
  return prefixos.some((p) => (p === "/" ? path === "/" : path === p || path.startsWith(`${p}/`)));
}

/**
 * Renova a sessão do Supabase a cada requisição e faz o roteamento básico de auth.
 * A autorização de verdade fica no banco (RLS) e na DAL (src/lib/dal.ts).
 */
export async function proxy(request: NextRequest) {
  // Modo "em construção": toda página mostra o placeholder estático (public/em-construcao.html).
  if (emConstrucao()) {
    avisarEmDesenvolvimento();
    const url = request.nextUrl.clone();
    url.pathname = "/em-construcao.html";
    url.search = "";
    const r = NextResponse.rewrite(url);
    r.headers.set("X-Robots-Tag", "noindex");
    r.headers.set("Cache-Control", "no-store");
    return r;
  }

  // Guia inexistente: 404 de verdade. O conteúdo do guia fica dentro de <Suspense> (para a navegação
  // mostrar o casco na hora), e lá o notFound() só roda depois que a resposta já começou com 200.
  // Reescrever para uma rota que não existe (pastas com "_" nunca viram rota) dá a página 404 padrão.
  const guia = /^\/guias\/([^/]+)\/?$/.exec(request.nextUrl.pathname);
  if (guia && !ehSlugDeGuia(decodificar(guia[1]))) {
    const url = request.nextUrl.clone();
    url.pathname = "/_guia-nao-encontrado";
    return NextResponse.rewrite(url);
  }

  let response = NextResponse.next({ request });
  const { url: supabaseUrl, chave } = supabaseEnv();

  const supabase = createServerClient<Database>(supabaseUrl, chave, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Não coloque código entre a criação do cliente e getClaims().
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims);
  const path = request.nextUrl.pathname;

  const redirecionar = (destino: URL) => {
    const r = NextResponse.redirect(destino);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!logado && casa(path, PROTEGIDAS)) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    return redirecionar(url);
  }

  if (logado && casa(path, SO_DESLOGADO)) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    url.search = "";
    return redirecionar(url);
  }

  return response;
}

/** decodeURIComponent que não lança com URL malformada (ex.: "%E0"). */
function decodificar(segmento: string) {
  try {
    return decodeURIComponent(segmento);
  } catch {
    return segmento;
  }
}

let avisado = false;
/** Em `next dev`, explica no terminal por que só aparece a página em construção. */
function avisarEmDesenvolvimento() {
  if (avisado || process.env.NODE_ENV === "production") return;
  avisado = true;
  console.warn(`[nosso-dia] Mostrando a página "em construção": ${motivoEmConstrucao()}`);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|em-construcao.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
