-- =============================================================================
-- Nosso Dia · M1 · #1 Infra: pacotes de checklist, subitens e guias
-- =============================================================================
--
-- Pacote  = conjunto de modelos de tarefa. Pode ser:
--   · automático: entra em todo casamento (ex.: 'base');
--   · de escolha: o casal escolhe um por grupo (ex.: grupo 'cerimonia' → 'celebrante').
-- Subitem = item marcável dentro de uma tarefa (documentos, itens do kit…).
-- Guia    = texto de apoio estático no app (/guias/<slug>), ligado ao modelo.
--
-- Migrations de conteúdo futuras (#2…#8) inserem pacotes/modelos e chamam
-- public._aplicar_pacote_em_todos('<pacote>') para levar o conteúdo aos casamentos existentes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Catálogo de pacotes
-- -----------------------------------------------------------------------------
create table public.pacotes (
  codigo        text primary key check (codigo ~ '^[a-z0-9_]+$'),
  nome          text not null check (char_length(nome) between 1 and 80),
  descricao     text,
  automatico    boolean not null default false,
  grupo_escolha text check (grupo_escolha ~ '^[a-z0-9_]+$'),
  ordem         integer not null default 0,
  ativo         boolean not null default true,
  constraint pacotes_automatico_ou_escolha check (not (automatico and grupo_escolha is not null))
);

insert into public.pacotes (codigo, nome, descricao, automatico, ordem) values
  ('base', 'Planejamento geral', 'O essencial para qualquer casamento.', true, 0);

-- -----------------------------------------------------------------------------
-- Modelos: pacote, guia e substituição de modelos antigos
-- -----------------------------------------------------------------------------
alter table public.tarefa_modelos
  add column pacote    text not null default 'base'
                       references public.pacotes (codigo) on update cascade,
  add column guia      text check (guia ~ '^[a-z0-9-]+$'),
  -- códigos de modelos que este substitui: tarefas antigas são absorvidas, não duplicadas
  add column substitui text[] not null default '{}';

create index tarefa_modelos_pacote_idx on public.tarefa_modelos (pacote);

create table public.tarefa_modelo_subitens (
  id        uuid primary key default gen_random_uuid(),
  modelo_id uuid not null references public.tarefa_modelos (id) on delete cascade,
  texto     text not null check (char_length(texto) between 1 and 200),
  ordem     integer not null default 0
);

create index tarefa_modelo_subitens_modelo_idx on public.tarefa_modelo_subitens (modelo_id, ordem);

-- -----------------------------------------------------------------------------
-- Tarefas: marca de edição (para saber o que pode ser removido ao desativar um pacote)
-- -----------------------------------------------------------------------------
alter table public.tarefas add column editada boolean not null default false;

-- Operações do sistema (cópia de pacotes) ligam esta flag na transação
-- para não marcarem tarefas como editadas pelo casal.
create or replace function public._eh_sistema()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('nosso_dia.sistema', true), '') = '1';
$$;

create or replace function public.tg_tarefas_marca_editada()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public._eh_sistema()
     and (new.titulo, new.descricao, new.categoria, new.prazo_fixo, new.responsavel)
         is distinct from
         (old.titulo, old.descricao, old.categoria, old.prazo_fixo, old.responsavel) then
    new.editada := true;
  end if;
  return new;
end;
$$;

create trigger tarefas_marca_editada
  before update on public.tarefas
  for each row execute function public.tg_tarefas_marca_editada();

-- -----------------------------------------------------------------------------
-- Subitens das tarefas
-- -----------------------------------------------------------------------------
create table public.tarefa_subitens (
  id                uuid primary key default gen_random_uuid(),
  tarefa_id         uuid not null references public.tarefas (id) on delete cascade,
  modelo_subitem_id uuid references public.tarefa_modelo_subitens (id) on delete set null,
  texto             text not null check (char_length(btrim(texto)) between 1 and 200),
  feito             boolean not null default false,
  ordem             integer not null default 0,
  criado_em         timestamptz not null default now()
);

create index tarefa_subitens_tarefa_idx on public.tarefa_subitens (tarefa_id, ordem);

-- Mexer em subitem conta como editar a tarefa.
create or replace function public.tg_subitens_marca_tarefa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- pg_trigger_depth() > 1: veio de cascata (tarefa sendo apagada) — nada a marcar
  if public._eh_sistema() or pg_trigger_depth() > 1 then
    return null;
  end if;
  update public.tarefas
     set editada = true
   where id = coalesce(new.tarefa_id, old.tarefa_id)
     and not editada;
  return null;
end;
$$;

create trigger subitens_marca_tarefa
  after insert or update or delete on public.tarefa_subitens
  for each row execute function public.tg_subitens_marca_tarefa();

create or replace function public.tg_subitens_normaliza()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.texto := btrim(new.texto);
  return new;
end;
$$;

create trigger subitens_normaliza
  before insert or update on public.tarefa_subitens
  for each row execute function public.tg_subitens_normaliza();

-- -----------------------------------------------------------------------------
-- Pacotes ativos por casamento
-- -----------------------------------------------------------------------------
create table public.evento_pacotes (
  evento_id   uuid not null references public.eventos (id) on delete cascade,
  pacote      text not null references public.pacotes (codigo) on update cascade,
  ativado_em  timestamptz not null default now(),
  ativado_por uuid references public.perfis (id) on delete set null,
  primary key (evento_id, pacote)
);

-- -----------------------------------------------------------------------------
-- Helper de RLS para subitens
-- -----------------------------------------------------------------------------
create or replace function public.eh_membro_tarefa(p_tarefa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.tarefas t
      join public.membros m on m.evento_id = t.evento_id
     where t.id = p_tarefa_id
       and m.usuario_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- Núcleo: copiar um pacote para um casamento (interno, sem checagem de acesso)
--   1. absorve tarefas de modelos substituídos (sem duplicar)
--   2. cria as tarefas que faltam
--   3. copia subitens para tarefas pendentes, intactas e ainda sem subitens
--   4. registra o pacote como ativo
-- Idempotente. Retorna quantas tarefas novas foram criadas.
-- -----------------------------------------------------------------------------
create or replace function public._copiar_pacote(p_evento_id uuid, p_pacote text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_modelo  public.tarefa_modelos%rowtype;
  v_antiga  uuid;
  v_criadas integer;
begin
  perform set_config('nosso_dia.sistema', '1', true);

  -- 1. absorver
  for v_modelo in
    select * from public.tarefa_modelos
     where pacote = p_pacote and ativo and cardinality(substitui) > 0
  loop
    continue when exists (
      select 1 from public.tarefas where evento_id = p_evento_id and modelo_id = v_modelo.id
    );

    select t.id into v_antiga
      from public.tarefas t
      join public.tarefa_modelos velho on velho.id = t.modelo_id
     where t.evento_id = p_evento_id
       and velho.codigo = any (v_modelo.substitui)
     order by (t.status = 'concluida') desc, t.criado_em
     limit 1;

    if v_antiga is not null then
      -- tarefa intacta é atualizada para o conteúdo novo; concluída/editada só muda de modelo
      update public.tarefas t
         set modelo_id   = v_modelo.id,
             titulo      = case when t.status = 'pendente' and not t.editada then v_modelo.titulo      else t.titulo      end,
             descricao   = case when t.status = 'pendente' and not t.editada then v_modelo.descricao   else t.descricao   end,
             categoria   = case when t.status = 'pendente' and not t.editada then v_modelo.categoria   else t.categoria   end,
             offset_dias = case when t.status = 'pendente' and not t.editada then v_modelo.offset_dias else t.offset_dias end,
             ordem       = case when t.status = 'pendente' and not t.editada then v_modelo.ordem       else t.ordem       end
       where t.id = v_antiga;
    end if;
  end loop;

  -- 2. criar o que falta
  insert into public.tarefas (evento_id, modelo_id, titulo, descricao, categoria, offset_dias, ordem)
  select p_evento_id, m.id, m.titulo, m.descricao, m.categoria, m.offset_dias, m.ordem
    from public.tarefa_modelos m
   where m.pacote = p_pacote and m.ativo
  on conflict (evento_id, modelo_id) where modelo_id is not null do nothing;
  get diagnostics v_criadas = row_count;

  -- 3. subitens
  insert into public.tarefa_subitens (tarefa_id, modelo_subitem_id, texto, ordem)
  select t.id, s.id, s.texto, s.ordem
    from public.tarefas t
    join public.tarefa_modelos m on m.id = t.modelo_id
    join public.tarefa_modelo_subitens s on s.modelo_id = m.id
   where t.evento_id = p_evento_id
     and m.pacote = p_pacote
     and t.status = 'pendente'
     and not t.editada
     and not exists (select 1 from public.tarefa_subitens x where x.tarefa_id = t.id);

  -- 4. registrar
  insert into public.evento_pacotes (evento_id, pacote, ativado_por)
  values (p_evento_id, p_pacote, (select auth.uid()))
  on conflict (evento_id, pacote) do nothing;

  perform set_config('nosso_dia.sistema', '', true);
  return v_criadas;
end;
$$;

-- Remove do casamento as tarefas pendentes e intactas do pacote. Retorna quantas saíram.
create or replace function public._remover_pacote(p_evento_id uuid, p_pacote text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_removidas integer;
begin
  perform set_config('nosso_dia.sistema', '1', true);

  delete from public.tarefas t
   using public.tarefa_modelos m
   where m.id = t.modelo_id
     and m.pacote = p_pacote
     and t.evento_id = p_evento_id
     and t.status = 'pendente'
     and not t.editada;
  get diagnostics v_removidas = row_count;

  delete from public.evento_pacotes where evento_id = p_evento_id and pacote = p_pacote;

  perform set_config('nosso_dia.sistema', '', true);
  return v_removidas;
end;
$$;

-- Para migrations de conteúdo: aplica um pacote automático em todos os casamentos.
create or replace function public._aplicar_pacote_em_todos(p_pacote text)
returns integer
language sql
security definer
set search_path = ''
as $$
  select coalesce(sum(public._copiar_pacote(e.id, p_pacote)), 0)::integer
    from public.eventos e;
$$;

-- -----------------------------------------------------------------------------
-- RPCs públicas
-- -----------------------------------------------------------------------------

-- Ativa um pacote. Se ele pertence a um grupo de escolha, desativa os outros do grupo.
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

-- Desativa um pacote de escolha. Pacotes automáticos não podem ser desativados.
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

  perform 1 from public.eventos where id = p_evento_id for update;
  return public._remover_pacote(p_evento_id, p_pacote);
end;
$$;

-- -----------------------------------------------------------------------------
-- criar_evento passa a ativar os pacotes automáticos (em vez de copiar todos os modelos)
-- -----------------------------------------------------------------------------
create or replace function public.criar_evento(
  p_nome_exibicao            text,
  p_data_status              public.data_status default 'indefinida',
  p_data                     date    default null,
  p_horario_cerimonia        time    default null,
  p_horario_festa            time    default null,
  p_cidade                   text    default null,
  p_uf                       text    default null,
  p_convidados_estimados     integer default null,
  p_orcamento_total_centavos bigint  default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_evento_id uuid;
  v_pacote    text;
begin
  if v_uid is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;

  if exists (select 1 from public.membros where usuario_id = v_uid) then
    raise exception 'Você já participa de um casamento.'
      using errcode = 'P0001', hint = 'ja_tem_evento';
  end if;

  insert into public.eventos (
    nome_exibicao, data_status, data, horario_cerimonia, horario_festa,
    cidade, uf, convidados_estimados, orcamento_total_centavos, criado_por
  ) values (
    p_nome_exibicao, p_data_status, p_data, p_horario_cerimonia, p_horario_festa,
    nullif(btrim(p_cidade), ''), upper(nullif(btrim(p_uf), '')),
    p_convidados_estimados, p_orcamento_total_centavos, v_uid
  )
  returning id into v_evento_id;

  insert into public.membros (evento_id, usuario_id, papel)
  values (v_evento_id, v_uid, 'parceiro');

  for v_pacote in
    select codigo from public.pacotes where automatico and ativo order by ordem, codigo
  loop
    perform public._copiar_pacote(v_evento_id, v_pacote);
  end loop;

  return v_evento_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- View: inclui pacote, guia, edição e contagem de subitens
-- (drop + create: a lista de colunas de t.* mudou com `editada`)
-- -----------------------------------------------------------------------------
drop view public.tarefas_com_prazo;

create view public.tarefas_com_prazo
with (security_invoker = true)
as
select
  t.*,
  pz.prazo                                                         as prazo_efetivo,
  (t.prazo_fixo is not null)                                       as prazo_travado,
  (t.prazo_fixo is null and t.offset_dias is not null
     and e.data_status = 'mes_estimado')                           as prazo_aproximado,
  public.grupo_tarefa(
    t.status,
    pz.prazo,
    (t.criado_em at time zone e.fuso)::date,
    (now() at time zone e.fuso)::date
  )                                                                as grupo,
  m.pacote                                                         as pacote,
  m.guia                                                           as guia,
  coalesce(si.total, 0)                                            as subitens_total,
  coalesce(si.feitos, 0)                                           as subitens_feitos
from public.tarefas t
join public.eventos e on e.id = t.evento_id
left join public.tarefa_modelos m on m.id = t.modelo_id
cross join lateral (
  select public.prazo_efetivo(t.prazo_fixo, t.offset_dias, e.data) as prazo
) pz
left join lateral (
  select count(*)::integer as total, count(*) filter (where s.feito)::integer as feitos
    from public.tarefa_subitens s
   where s.tarefa_id = t.id
) si on true;

-- -----------------------------------------------------------------------------
-- RLS e permissões
-- -----------------------------------------------------------------------------
alter table public.pacotes                enable row level security;
alter table public.tarefa_modelo_subitens enable row level security;
alter table public.tarefa_subitens        enable row level security;
alter table public.evento_pacotes         enable row level security;

revoke all on public.pacotes, public.tarefa_modelo_subitens, public.tarefa_subitens,
              public.evento_pacotes, public.tarefas_com_prazo
  from anon;

-- catálogo: só leitura
create policy pacotes_select on public.pacotes
  for select to authenticated using (ativo);
create policy tarefa_modelo_subitens_select on public.tarefa_modelo_subitens
  for select to authenticated using (true);
revoke insert, update, delete on public.pacotes, public.tarefa_modelo_subitens from authenticated;

-- pacotes ativos: leitura para membros; escrita só via RPC
create policy evento_pacotes_select on public.evento_pacotes
  for select to authenticated using (public.eh_membro(evento_id));
revoke insert, update, delete on public.evento_pacotes from authenticated;

-- subitens: CRUD para membros do casamento da tarefa
create policy tarefa_subitens_select on public.tarefa_subitens
  for select to authenticated using (public.eh_membro_tarefa(tarefa_id));
create policy tarefa_subitens_insert on public.tarefa_subitens
  for insert to authenticated
  with check (public.eh_membro_tarefa(tarefa_id) and modelo_subitem_id is null);
create policy tarefa_subitens_update on public.tarefa_subitens
  for update to authenticated
  using (public.eh_membro_tarefa(tarefa_id)) with check (public.eh_membro_tarefa(tarefa_id));
create policy tarefa_subitens_delete on public.tarefa_subitens
  for delete to authenticated using (public.eh_membro_tarefa(tarefa_id));

revoke update on public.tarefa_subitens from authenticated;
grant  update (texto, feito, ordem) on public.tarefa_subitens to authenticated;

-- `editada` é controlada pelo banco
revoke update on public.tarefas from authenticated;
grant  update (titulo, descricao, categoria, offset_dias, prazo_fixo, status, responsavel, ordem)
  on public.tarefas to authenticated;

grant select on public.tarefas_com_prazo to authenticated;

-- funções
revoke execute on function
  public._eh_sistema(),
  public._copiar_pacote(uuid, text),
  public._remover_pacote(uuid, text),
  public._aplicar_pacote_em_todos(text),
  public.eh_membro_tarefa(uuid),
  public.ativar_pacote(uuid, text),
  public.desativar_pacote(uuid, text),
  public.tg_tarefas_marca_editada(),
  public.tg_subitens_marca_tarefa(),
  public.tg_subitens_normaliza()
from public, anon, authenticated;

-- chamada pelo trigger de edição, que roda com o usuário logado
grant execute on function public._eh_sistema()                    to authenticated;
grant execute on function public.eh_membro_tarefa(uuid)         to authenticated;
grant execute on function public.ativar_pacote(uuid, text)      to authenticated;
grant execute on function public.desativar_pacote(uuid, text)   to authenticated;

-- -----------------------------------------------------------------------------
-- Backfill: casamentos que já existem passam a ter os pacotes automáticos registrados
-- (as tarefas do 'base' já existem; nada é duplicado)
-- -----------------------------------------------------------------------------
select public._copiar_pacote(e.id, p.codigo)
  from public.eventos e
  cross join public.pacotes p
 where p.automatico and p.ativo;
