-- =============================================================================
-- Nosso Dia · Login com Better Auth (#26)
-- =============================================================================
-- Tabelas do Better Auth, geradas por `getMigrations` do better-auth 1.7 com as opções de
-- src/lib/auth.ts (nomes `ba_*`, ids UUID, limite de tentativas no banco). Ao mudar essas opções,
-- gere de novo e crie uma migration nova.
--
-- Segurança: só o dono do banco (o servidor do app, fora do `SET ROLE`) lê e escreve aqui.
-- A migration base concede tudo em public aos papéis do app por padrão; aqui isso é revogado,
-- e o RLS fica ligado sem nenhuma política, como segunda barreira.
--
-- `ba_user` alimenta `auth.users` por trigger, na mesma transação: mesmo id, e-mail e nome.
-- Assim perfis, membros, convites e o RLS por `auth.uid()` continuam como estão.
-- =============================================================================

create table "ba_user" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "ba_session" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" uuid not null references "ba_user" ("id") on delete cascade);

create table "ba_account" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "accountId" text not null, "providerId" text not null, "userId" uuid not null references "ba_user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "ba_verification" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "ba_rate_limit" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);

create index "ba_session_userId_idx" on "ba_session" ("userId");
create index "ba_account_userId_idx" on "ba_account" ("userId");
create index "ba_verification_identifier_idx" on "ba_verification" ("identifier");

-- -----------------------------------------------------------------------------
-- Fora do alcance dos papéis do app
-- -----------------------------------------------------------------------------
revoke all on ba_user, ba_session, ba_account, ba_verification, ba_rate_limit from public, anon, authenticated;
alter table ba_user         enable row level security;
alter table ba_session      enable row level security;
alter table ba_account      enable row level security;
alter table ba_verification enable row level security;
alter table ba_rate_limit   enable row level security;

-- -----------------------------------------------------------------------------
-- ba_user → auth.users
-- -----------------------------------------------------------------------------
create function public.tg_ba_user_sincroniza()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into auth.users (id, email, raw_user_meta_data)
    values (new.id, lower(new.email), jsonb_build_object('nome', left(btrim(new.name), 80)));
  elsif tg_op = 'UPDATE' then
    update auth.users
       set email = lower(new.email),
           raw_user_meta_data = raw_user_meta_data || jsonb_build_object('nome', left(btrim(new.name), 80))
     where id = new.id;
  elsif tg_op = 'DELETE' then
    delete from auth.users where id = old.id;   -- leva perfil, votos etc. em cascata
  end if;
  return null;
end;
$$;

revoke execute on function public.tg_ba_user_sincroniza() from public, anon, authenticated;

create trigger ba_user_sincroniza
  after insert or update of email, name or delete on ba_user
  for each row execute function public.tg_ba_user_sincroniza();
