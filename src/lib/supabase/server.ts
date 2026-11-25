import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { supabaseEnv } from "@/lib/env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Crie um por requisição — nunca reutilize entre requisições.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, chave } = supabaseEnv();

  return createServerClient<Database>(url, chave, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado de um Server Component: não dá para gravar cookies aqui.
          // Tudo bem — o proxy renova a sessão a cada requisição.
        }
      },
    },
  });
}

export type SupabaseServer = Awaited<ReturnType<typeof createClient>>;
