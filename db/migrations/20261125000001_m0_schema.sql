-- =============================================================================
-- Nosso Dia · M0 · Fundação
-- 01 · Tipos, tabelas, constraints e índices
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.data_status as enum ('definida', 'mes_estimado', 'indefinida');
create type public.papel_membro as enum ('parceiro');          -- M6 adiciona 'assessoria'
create type public.status_tarefa as enum ('pendente', 'concluida');

-- -----------------------------------------------------------------------------
-- Utilitário: atualizado_em automático
-- -----------------------------------------------------------------------------
create or replace function public.tg_set_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- perfis · 1:1 com auth.users
-- -----------------------------------------------------------------------------
create table public.perfis (
  id            uuid primary key references auth.users (id) on delete cascade,
  nome          text not null default '' check (char_length(nome) <= 80),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger perfis_atualizado_em
  before update on public.perfis
  for each row execute function public.tg_set_atualizado_em();

-- -----------------------------------------------------------------------------
-- eventos · o casamento
-- -----------------------------------------------------------------------------
create table public.eventos (
  id                       uuid primary key default gen_random_uuid(),
  nome_exibicao            text not null check (char_length(btrim(nome_exibicao)) between 1 and 80),
  data_status              public.data_status not null default 'indefinida',
  data                     date,
  horario_cerimonia        time,
  horario_festa            time,
  cidade                   text check (char_length(cidade) <= 80),
  uf                       char(2) check (uf in (
                             'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
                             'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  convidados_estimados     integer check (convidados_estimados between 1 and 5000),
  orcamento_total_centavos bigint  check (orcamento_total_centavos >= 0),
  fuso                     text not null default 'America/Sao_Paulo',
  criado_por               uuid references public.perfis (id) on delete set null,
  criado_em                timestamptz not null default now(),
  atualizado_em            timestamptz not null default now(),

  -- 'indefinida' <=> sem data
  constraint eventos_data_coerente check ((data_status = 'indefinida') = (data is null)),
  -- 'mes_estimado' guarda sempre o dia 1 do mês (normalizado por trigger)
  constraint eventos_mes_estimado_dia_1 check (
    data_status <> 'mes_estimado' or extract(day from data) = 1
  ),
  -- horários só fazem sentido com data definida
  constraint eventos_horario_requer_data check (
    data_status = 'definida' or (horario_cerimonia is null and horario_festa is null)
  )
);

create or replace function public.tg_eventos_normaliza()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.data_status = 'mes_estimado' and new.data is not null then
    new.data := date_trunc('month', new.data)::date;
  end if;
  if new.data_status = 'indefinida' then
    new.data := null;
  end if;
  if new.data_status <> 'definida' then
    new.horario_cerimonia := null;
    new.horario_festa := null;
  end if;
  new.nome_exibicao := btrim(new.nome_exibicao);
  return new;
end;
$$;

create trigger eventos_normaliza
  before insert or update on public.eventos
  for each row execute function public.tg_eventos_normaliza();

create trigger eventos_atualizado_em
  before update on public.eventos
  for each row execute function public.tg_set_atualizado_em();

-- -----------------------------------------------------------------------------
-- membros · quem tem acesso ao evento
-- -----------------------------------------------------------------------------
create table public.membros (
  evento_id  uuid not null references public.eventos (id) on delete cascade,
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  papel      public.papel_membro not null default 'parceiro',
  criado_em  timestamptz not null default now(),
  primary key (evento_id, usuario_id)
);

-- Regra M0: 1 evento por usuário. Remover este índice quando houver multi-eventos.
create unique index membros_um_evento_por_usuario on public.membros (usuario_id);

-- Regra M0: no máximo 2 parceiros por evento (com lock para evitar corrida).
create or replace function public.tg_membros_limite_parceiros()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_total integer;
begin
  if new.papel = 'parceiro' then
    perform 1 from public.eventos where id = new.evento_id for update;
    select count(*) into v_total
      from public.membros
     where evento_id = new.evento_id and papel = 'parceiro';
    if v_total >= 2 then
      raise exception 'Este casamento já tem 2 parceiros.'
        using errcode = 'P0001', hint = 'limite_parceiros';
    end if;
  end if;
  return new;
end;
$$;

create trigger membros_limite_parceiros
  before insert on public.membros
  for each row execute function public.tg_membros_limite_parceiros();

-- -----------------------------------------------------------------------------
-- convites_parceiro
-- -----------------------------------------------------------------------------
create table public.convites_parceiro (
  id            uuid primary key default gen_random_uuid(),
  evento_id     uuid not null references public.eventos (id) on delete cascade,
  email         text not null check (email = lower(btrim(email)) and email like '%_@_%'),
  token         uuid not null unique default gen_random_uuid(),
  convidado_por uuid references public.perfis (id) on delete set null,
  expira_em     timestamptz not null default (now() + interval '7 days'),
  aceito_em     timestamptz,
  aceito_por    uuid references public.perfis (id) on delete set null,
  cancelado_em  timestamptz,
  criado_em     timestamptz not null default now(),
  constraint convites_aceito_coerente check ((aceito_em is null) = (aceito_por is null)),
  constraint convites_nao_aceito_e_cancelado check (aceito_em is null or cancelado_em is null)
);

-- Só um convite pendente por evento (reenviar = cancelar o antigo e criar outro).
create unique index convites_um_pendente_por_evento
  on public.convites_parceiro (evento_id)
  where aceito_em is null and cancelado_em is null;

-- -----------------------------------------------------------------------------
-- tarefa_modelos · catálogo global (seed)
-- -----------------------------------------------------------------------------
create table public.tarefa_modelos (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique check (codigo ~ '^[a-z0-9_]+$'),
  titulo      text not null check (char_length(titulo) between 1 and 120),
  descricao   text,
  categoria   text not null check (categoria ~ '^[a-z0-9_]+$'),
  offset_dias integer check (offset_dias between -730 and 365),  -- D-180 = -180; D+14 = 14; nulo = sem prazo
  ordem       integer not null default 0,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- tarefas · instância no evento
-- -----------------------------------------------------------------------------
create table public.tarefas (
  id            uuid primary key default gen_random_uuid(),
  evento_id     uuid not null references public.eventos (id) on delete cascade,
  modelo_id     uuid references public.tarefa_modelos (id) on delete set null,
  titulo        text not null check (char_length(btrim(titulo)) between 1 and 120),
  descricao     text check (char_length(descricao) <= 2000),
  categoria     text not null default 'outros' check (categoria ~ '^[a-z0-9_]+$'),
  offset_dias   integer check (offset_dias between -730 and 365),
  prazo_fixo    date,
  status        public.status_tarefa not null default 'pendente',
  concluida_em  timestamptz,
  concluida_por uuid references public.perfis (id) on delete set null,
  responsavel   uuid references public.perfis (id) on delete set null,   -- nulo = ambos
  ordem         integer not null default 0,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint tarefas_conclusao_coerente check ((status = 'concluida') = (concluida_em is not null))
);

create index tarefas_evento_idx on public.tarefas (evento_id, status);
-- Evita copiar o mesmo modelo duas vezes para o mesmo evento.
create unique index tarefas_modelo_unico_por_evento
  on public.tarefas (evento_id, modelo_id) where modelo_id is not null;

create trigger tarefas_atualizado_em
  before update on public.tarefas
  for each row execute function public.tg_set_atualizado_em();
