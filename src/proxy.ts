import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { emConstrucao, motivoEmConstrucao } from "@/lib/env";

/** Rotas que exigem login. */
const PROTEGIDAS = ["/painel", "/tarefas", "/configuracoes", "/votos", "/onboarding"];
/** Rotas que um usuário logado não precisa ver. */
const SO_DESLOGADO = ["/", "/entrar", "/cadastrar"];

function casa(path: string, prefixos: string[]) {
  return prefixos.some((p) => (p === "/" ? path === "/" : path === p || path.startsWith(`${p}/`)));
}

/**
 * Roteamento básico de auth. A autorização de verdade fica no banco (RLS) e na DAL (src/lib/dal.ts).
 *
 * - Rotas protegidas: checagem otimista, só pela presença do cookie de sessão (sem ir ao banco).
 *   Cookie vencido passa, e a DAL manda para /entrar.
 * - Telas de visitante ("/", entrar, cadastrar): consulta a sessão de verdade antes de mandar para
 *   o painel. Com a checagem otimista, um cookie vencido faria um vaivém infinito com /entrar.
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

  const path = request.nextUrl.pathname;
  const temCookie = Boolean(getSessionCookie(request, { cookiePrefix: "nosso-dia" }));

  if (!temCookie && casa(path, PROTEGIDAS)) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (temCookie && casa(path, SO_DESLOGADO)) {
    const sessao = await auth().api.getSession({ headers: request.headers });
    if (sessao) {
      const url = request.nextUrl.clone();
      url.pathname = "/painel";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

let avisado = false;
/** Em `next dev`, explica no terminal por que só aparece a página em construção. */
function avisarEmDesenvolvimento() {
  if (avisado || process.env.NODE_ENV === "production") return;
  avisado = true;
  console.warn(`[nosso-dia] Mostrando a página "em construção": ${motivoEmConstrucao()}`);
}

export const config = {
  // /api/auth fica de fora: os links dos e-mails precisam chegar ao Better Auth mesmo com cookie.
  matcher: ["/((?!_next/static|_next/image|api/auth|favicon.ico|em-construcao.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
