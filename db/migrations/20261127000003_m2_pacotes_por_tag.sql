-- =============================================================================
-- Nosso Dia · M2 · #20 Infra: pacotes ativados por tag
-- =============================================================================
--
-- Além de automático ou de escolha, um pacote pode ser ativado por uma TAG do casamento
-- (ex.: 'ao_ar_livre'). Definir a tag copia o pacote (mesma _copiar_pacote do M1); tirar a tag
-- remove só as tarefas intactas (mesma _remover_pacote: pendentes e não editadas).
--
-- As tags possíveis ficam no catálogo `tags` (a #21 insere as do questionário de estilo e formato).
-- Migrations de conteúdo com pacotes por tag chamam public._aplicar_pacote_por_tag('<pacote>')
-- para levar o pacote aos casamentos que já têm a tag.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Catálogo de tags e tag do pacote
-- -----------------------------------------------------------------------------
create table public.tags (
  codigo    text primary key check (codigo ~ '^[a-z0-9_]+$'),
  nome      text not null check (char_length(nome) between 1 and 80),
  descricao text,
  ordem     integer not null default 0,
  ativo     boolean not null default true
);

-- nula = regra atual (automático ou de escolha)
alter table public.pacotes
  add column tag text references public.tags (codigo) on update cascade,
  add constraint pacotes_tag_exclusiva check (tag is null or (not automatico and grupo_escolha is null));

create index pacotes_tag_idx on public.pacotes (tag) where tag is not null;

-- -----------------------------------------------------------------------------
-- Tags de cada casamento
-- -----------------------------------------------------------------------------
create table public.evento_tags (
  evento_id   uuid not null references public.eventos (id) on delete cascade,
  tag         text not null references public.tags (codigo) on update cascade,
  definida_em timestamptz not null default now(),
  definida_por uuid references public.perfis (id) on delete set null,
  primary key (evento_id, tag)
);

-- -----------------------------------------------------------------------------
-- Internos
-- -----------------------------------------------------------------------------

-- Normaliza a lista pedida: sem nulos, sem repetição, em ordem. Recusa tag fora do catálogo.
create or replace function public._normalizar_tags(p_tags text[])
returns text[]
language plpgsql
stable
set search_path = ''
as $$
declare
  v_tags text[] := coalesce(
    (select array_agg(distinct t order by t) from unnest(p_tags) t where t is not null), '{}');
begin
  if exists (
    select 1 from unnest(v_tags) t
     where not exists (select 1 from public.tags g where g.codigo = t and g.ativo)
  ) then
    raise exception 'Tag desconhecida.' using errcode = 'P0001', hint = 'tag_inexistente';
  end if;
  return v_tags;
end;
$$;

-- Para migrations de conteúdo: aplica um pacote por tag nos casamentos que já têm a tag.
create or replace function public._aplicar_pacote_por_tag(p_pacote text)
returns integer
language sql
security definer
set search_path = ''
as $$
  select coalesce(sum(public._copiar_pacote(et.evento_id, p.codigo)), 0)::integer
    from public.pacotes p
    join public.evento_tags et on et.tag = p.tag
   where p.codigo = p_pacote and p.ativo;
$$;

-- -----------------------------------------------------------------------------
-- RPC · previa_tags: o que muda se o casamento passar a ter exatamente estas tags
--   entram = tarefas novas que os pacotes das tags ganhas criariam
--   saem   = tarefas intactas (pendentes, não editadas) dos pacotes das tags perdidas
--   ficam  = tarefas desses pacotes que ficam por estarem concluídas ou editadas
-- -----------------------------------------------------------------------------
create or replace function public.previa_tags(p_evento_id uuid, p_tags text[])
returns table (entram integer, saem integer, ficam integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tags text[];
begin
  if (select auth.uid()) is null or not public.eh_membro(p_evento_id) then
    raise exception 'Sem acesso a este casamento.' using errcode = '42501';
  end if;
  v_tags := public._normalizar_tags(p_tags);

  return query
  with ganhos as (
    select p.codigo from public.pacotes p
     where p.ativo and p.tag = any (v_tags)
       and not exists (select 1 from public.evento_pacotes ep where ep.evento_id = p_evento_id and ep.pacote = p.codigo)
  ),
  perdidos as (
    select ep.pacote as codigo from public.evento_pacotes ep
      join public.pacotes p on p.codigo = ep.pacote
     where ep.evento_id = p_evento_id and p.tag is not null and not (p.tag = any (v_tags))
  ),
  tarefas_perdidas as (
    select t.status, t.editada from public.tarefas t
      join public.tarefa_modelos m on m.id = t.modelo_id
     where t.evento_id = p_evento_id and m.pacote in (select codigo from perdidos)
  )
  select
    (select count(*) from public.tarefa_modelos m
      where m.ativo and m.pacote in (select codigo from ganhos)
        and not exists (select 1 from public.tarefas t where t.evento_id = p_evento_id and t.modelo_id = m.id)
        -- modelo que substitui um antigo absorve a tarefa existente em vez de criar outra
        and not exists (
          select 1 from public.tarefas t join public.tarefa_modelos velho on velho.id = t.modelo_id
           where t.evento_id = p_evento_id and velho.codigo = any (m.substitui)))::integer,
    (select count(*) from tarefas_perdidas where status = 'pendente' and not editada)::integer,
    (select count(*) from tarefas_perdidas where status = 'concluida' or editada)::integer;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC · definir_tags: o casamento passa a ter exatamente estas tags.
-- Tags ganhas ativam seus pacotes; tags perdidas desativam os delas. Idempotente.
-- -----------------------------------------------------------------------------
create or replace function public.definir_tags(p_evento_id uuid, p_tags text[])
returns table (criadas integer, removidas integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_tags      text[];
  v_pacote    text;
  v_criadas   integer := 0;
  v_removidas integer := 0;
begin
  if v_uid is null or not public.eh_membro(p_evento_id) then
    raise exception 'Sem acesso a este casamento.' using errcode = '42501';
  end if;
  v_tags := public._normalizar_tags(p_tags);

  perform 1 from public.eventos where id = p_evento_id for update;  -- serializa mudanças concorrentes

  delete from public.evento_tags where evento_id = p_evento_id and not (tag = any (v_tags));
  insert into public.evento_tags (evento_id, tag, definida_por)
  select p_evento_id, t, v_uid from unnest(v_tags) t
  on conflict (evento_id, tag) do nothing;

  -- pacotes cuja tag saiu
  for v_pacote in
    select ep.pacote from public.evento_pacotes ep
      join public.pacotes p on p.codigo = ep.pacote
     where ep.evento_id = p_evento_id and p.tag is not null and not (p.tag = any (v_tags))
  loop
    v_removidas := v_removidas + public._remover_pacote(p_evento_id, v_pacote);
  end loop;

  -- pacotes das tags presentes (copiar é idempotente: o que já existe não duplica)
  for v_pacote in
    select p.codigo from public.pacotes p where p.ativo and p.tag = any (v_tags) order by p.ordem, p.codigo
  loop
    v_criadas := v_criadas + public._copiar_pacote(p_evento_id, v_pacote);
  end loop;

  return query select v_criadas, v_removidas;
end;
$$;

-- -----------------------------------------------------------------------------
-- ativar_pacote / desativar_pacote: pacote por tag só muda pelas tags
-- (igual ao M1, com a checagem nova)
-- -----------------------------------------------------------------------------
create or replace function public.ativar_pacote(p_evento_id uuid, p_pacote text)
returns table (criadas integer, removidas integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pacote    public.pacotes%rowtype;
  v_outro     text;
  v_removidas integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;
  if not public.eh_membro(p_evento_id) then
    raise exception 'Sem acesso a este casamento.' using errcode = '42501';
  end if;

  select * into v_pacote from public.pacotes where codigo = p_pacote and ativo;
  if not found then
    raise exception 'Checklist não encontrado.' using errcode = 'P0001', hint = 'pacote_inexistente';
  end if;
  if v_pacote.tag is not null then
    raise exception 'Este checklist entra pelas escolhas de estilo e formato.'
      using errcode = 'P0001', hint = 'pacote_por_tag';
  end if;

  perform 1 from public.eventos where id = p_evento_id for update;  -- serializa trocas concorrentes

  if v_pacote.grupo_escolha is not null then
    for v_outro in
      select ep.pacote
        from public.evento_pacotes ep
        join public.pacotes p on p.codigo = ep.pacote
       where ep.evento_id = p_evento_id
         and p.grupo_escolha = v_pacote.grupo_escolha
         and p.codigo <> p_pacote
    loop
      v_removidas := v_removidas + public._remover_pacote(p_evento_id, v_outro);
    end loop;
  end if;

  return query select public._copiar_pacote(p_evento_id, p_pacote), v_removidas;
end;
$$;

create or replace function public.desativar_pacote(p_evento_id uuid, p_pacote text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;
  if not public.eh_membro(p_evento_id) then
    raise exception 'Sem acesso a este casamento.' using errcode = '42501';
  end if;
  if exists (select 1 from public.pacotes where codigo = p_pacote and automatico) then
    raise exception 'Este checklist faz parte de todo casamento e não pode ser removido.'
      using errcode = 'P0001', hint = 'pacote_automatico';
  end if;
  if exists (select 1 from public.pacotes where codigo = p_pacote and tag is not null) then
    raise exception 'Este checklist entra pelas escolhas de estilo e formato.'
      using errcode = 'P0001', hint = 'pacote_por_tag';
  end if;

  perform 1 from public.eventos where id = p_evento_id for update;
  return public._remover_pacote(p_evento_id, p_pacote);
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS e permissões: catálogo legível; tags do casamento só pelas RPCs
-- -----------------------------------------------------------------------------
alter table public.tags        enable row level security;
alter table public.evento_tags enable row level security;

revoke all on public.tags, public.evento_tags from anon;
revoke insert, update, delete on public.tags, public.evento_tags from authenticated;
grant select on public.tags, public.evento_tags to authenticated;

create policy tags_select on public.tags
  for select to authenticated using (true);
create policy evento_tags_select on public.evento_tags
  for select to authenticated using (public.eh_membro(evento_id));

revoke execute on function
  public._normalizar_tags(text[]),
  public._aplicar_pacote_por_tag(text),
  public.previa_tags(uuid, text[]),
  public.definir_tags(uuid, text[])
from public, anon, authenticated;

grant execute on function public._normalizar_tags(text[])     to authenticated;
grant execute on function public.previa_tags(uuid, text[])    to authenticated;
grant execute on function public.definir_tags(uuid, text[])   to authenticated;
