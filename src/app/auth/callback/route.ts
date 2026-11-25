import { NextResponse, type NextRequest } from "next/server";
import { destinoSeguro } from "@/lib/erros";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino dos links de e-mail do Supabase (confirmação de cadastro e recuperação de senha).
 * O @supabase/ssr usa PKCE: o link chega com ?code=..., que trocamos por uma sessão.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = destinoSeguro(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL("/entrar?erro=link", origin));
}
