import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

/** Rotas que exigem login. */
const PROTEGIDAS = ["/painel", "/tarefas", "/configuracoes", "/onboarding", "/nova-senha"];
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
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
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

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
