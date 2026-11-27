-- =============================================================================
-- Nosso Dia · M3 · #45 Lista de convidados e confirmações
-- =============================================================================
-- Todo convidado pertence a um convite (quem recebe o convite junto: um casal, uma família, ou uma
-- pessoa só). O convite é a unidade do RSVP público do M5, e lado e grupo ficam nele.
-- Dados de terceiros (telefone, e-mail, restrição alimentar): só os membros do casal acessam.
-- =============================================================================

-- a: o primeiro membro do casamento (quem criou) · b: o parceiro · ambos: dos dois
create type public.lado_convidado as enum ('a', 'b', 'ambos');
create type public.faixa_etaria as enum ('adulto', 'crianca', 'bebe');
create type public.confirmacao_presenca as enum ('pendente', 'confirmado', 'recusado');

create table public.convites_familia (
  id            uuid primary key default gen_random_uuid(),
  evento_id     uuid not null references public.eventos (id) on delete cascade,
  nome          text not null check (char_length(btrim(nome)) between 1 and 120),
  lado          public.lado_convidado not null default 'ambos',
  grupo         text check (char_length(btrim(grupo)) between 1 and 60),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index convites_familia_evento_idx on public.convites_familia (evento_id);

create table public.pessoas (
  id                  uuid primary key default gen_random_uuid(),
  evento_id           uuid not null references public.eventos (id) on delete cascade,
  convite_id          uuid not null references public.convites_familia (id) on delete cascade,
  nome                text not null check (char_length(btrim(nome)) between 1 and 120),
  -- adulto · criança (6 a 12) · bebê (0 a 5): a faixa vale para as contas; a idade é só referência
  faixa               public.faixa_etaria not null default 'adulto',
  idade               smallint check (idade between 0 and 120),
  confirmacao         public.confirmacao_presenca not null default 'pendente',
  telefone            text check (char_length(telefone) <= 40),
  email               text check (char_length(email) <= 254),
  restricao_alimentar text check (char_length(restricao_alimentar) <= 500),
  observacao          text check (char_length(observacao) <= 2000),
  ordem               integer not null default 0,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);

create index pessoas_evento_idx on public.pessoas (evento_id);
create index pessoas_convite_idx on public.pessoas (convite_id, ordem);

create trigger convites_familia_atualizado_em
  before update on public.convites_familia
  for each row execute function public.tg_set_atualizado_em();
create trigger pessoas_atualizado_em
  before update on public.pessoas
  for each row execute function public.tg_set_atualizado_em();

-- -----------------------------------------------------------------------------
-- Regras: casamento imutável; a pessoa é do mesmo casamento do convite
-- -----------------------------------------------------------------------------
create or replace function public.tg_convites_familia_regras()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.evento_id <> old.evento_id then
    raise exception 'Um convite não pode mudar de casamento.';
  end if;
  return new;
end;
$$;

create trigger convites_familia_regras
  before update on public.convites_familia
  for each row execute function public.tg_convites_familia_regras();

create or replace function public.tg_pessoas_regras()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.evento_id <> old.evento_id then
    raise exception 'Um convidado não pode mudar de casamento.';
  end if;
  -- security invoker: com o RLS valendo, convite de outro casamento nem aparece
  if not exists (select 1 from public.convites_familia c where c.id = new.convite_id and c.evento_id = new.evento_id) then
    raise exception 'O convite não é deste casamento.'
      using errcode = 'P0001', hint = 'convite_de_outro_evento';
  end if;
  return new;
end;
$$;

create trigger pessoas_regras
  before insert or update of evento_id, convite_id on public.pessoas
  for each row execute function public.tg_pessoas_regras();

-- Convite que ficou sem ninguém (excluíram a última pessoa ou a mudaram de convite) sai junto.
create or replace function public.tg_pessoas_convite_vazio()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.convites_familia c
   where c.id = old.convite_id
     and not exists (select 1 from public.pessoas p where p.convite_id = old.convite_id);
  return null;
end;
$$;

create trigger pessoas_convite_vazio_delete
  after delete on public.pessoas
  for each row execute function public.tg_pessoas_convite_vazio();
create trigger pessoas_convite_vazio_update
  after update of convite_id on public.pessoas
  for each row when (old.convite_id is distinct from new.convite_id)
  execute function public.tg_pessoas_convite_vazio();

-- -----------------------------------------------------------------------------
-- RLS: CRUD para membros do evento; nada para anônimos
-- -----------------------------------------------------------------------------
alter table public.convites_familia enable row level security;
revoke all on public.convites_familia from anon;
grant select, insert, update, delete on public.convites_familia to authenticated;

create policy convites_familia_select on public.convites_familia
  for select to authenticated using (public.eh_membro(evento_id));
create policy convites_familia_insert on public.convites_familia
  for insert to authenticated with check (public.eh_membro(evento_id));
create policy convites_familia_update on public.convites_familia
  for update to authenticated using (public.eh_membro(evento_id)) with check (public.eh_membro(evento_id));
create policy convites_familia_delete on public.convites_familia
  for delete to authenticated using (public.eh_membro(evento_id));

alter table public.pessoas enable row level security;
revoke all on public.pessoas from anon;
grant select, insert, update, delete on public.pessoas to authenticated;

create policy pessoas_select on public.pessoas
  for select to authenticated using (public.eh_membro(evento_id));
create policy pessoas_insert on public.pessoas
  for insert to authenticated with check (public.eh_membro(evento_id));
create policy pessoas_update on public.pessoas
  for update to authenticated using (public.eh_membro(evento_id)) with check (public.eh_membro(evento_id));
create policy pessoas_delete on public.pessoas
  for delete to authenticated using (public.eh_membro(evento_id));
