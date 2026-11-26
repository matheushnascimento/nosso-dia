-- =============================================================================
-- Nosso Dia · Base: o que o app usava do Supabase, para rodar em qualquer Postgres
-- =============================================================================
-- Roda antes de todas as outras migrations. Cria:
--   • os papéis `anon` (visitante) e `authenticated` (usuário logado). O app entra no banco
--     com o usuário dono e, a cada requisição, faz `SET LOCAL ROLE authenticated` (ou anon);
--   • o schema `auth`, com a tabela de usuários e as funções `auth.uid()` e `auth.jwt()`.
--     A identidade vem de `request.jwt.claim.sub` e `request.jwt.claims`, que o servidor
--     define na transação (`set_config(..., true)`) a partir da sessão do Better Auth;
--   • as permissões padrão que o Supabase dava no schema public. As migrations seguintes
--     revogam e concedem em cima delas, então manter o mesmo ponto de partida mantém o RLS igual.
--
-- Funciona no Neon (sem superusuário): papéis NOLOGIN, sem BYPASSRLS. Exige Postgres 16+. O `service_role` do
-- Supabase não existe aqui: nada no app o usava.
-- Os papéis são do servidor inteiro (não de cada banco), por isso a criação é idempotente.
-- =============================================================================

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if not exists (select from pg_roles where rolname = r) then
      execute format('create role %I nologin', r);
    end if;
    -- Quem aplica as migrations é o mesmo usuário que o app usa: ele precisa poder ASSUMIR os
    -- papéis (SET ROLE). No Postgres 16+, quem cria um papel sem ser superusuário (caso do Neon)
    -- só ganha o direito de administrá-lo; o de assumir precisa ser concedido com SET TRUE.
    -- INHERIT FALSE: o dono não herda nada dos papéis, só troca para eles na requisição.
    if not pg_has_role(current_user, r, 'SET') then
      execute format('grant %I to %I with inherit false, set true', r, current_user);
    end if;
  end loop;
end;
$$;

create schema if not exists auth;

-- Usuários. Preenchida pelo app quando o Better Auth cria uma conta (mesmo id e e-mail).
-- `raw_user_meta_data` guarda o nome informado no cadastro (o trigger de perfil lê `nome`).
create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique check (email = lower(email)),
  raw_user_meta_data jsonb not null default '{}',
  criado_em          timestamptz not null default now()
);

-- Identidade da requisição atual (null quando ninguém está logado).
create function auth.uid() returns uuid
language sql stable
set search_path = ''
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create function auth.jwt() returns jsonb
language sql stable
set search_path = ''
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;

grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
-- auth.users não é exposta: só as funções security definer leem dela.
revoke all on auth.users from public, anon, authenticated;

-- Mesmo ponto de partida do Supabase: tudo concedido em public, e cada migration restringe.
alter default privileges in schema public grant all on tables    to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
