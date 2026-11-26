-- =============================================================================
-- Nosso Dia · M0 · Fundação
-- 02 · Regras de negócio: prazo efetivo, triggers, RPCs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Perfil criado automaticamente no cadastro (nome vem de options.data.nome no signUp)
-- -----------------------------------------------------------------------------
create or replace function public.tg_auth_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'nome', ''), 80))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_auth_novo_usuario();

-- -----------------------------------------------------------------------------
-- Helper de RLS: o usuário logado é membro do evento?
-- (security definer para não recursar nas policies de membros)
-- -----------------------------------------------------------------------------
create or replace function public.eh_membro(p_evento_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membros
     where evento_id = p_evento_id
       and usuario_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- A regra central: prazo calculado na hora, nunca gravado
--   prazo_fixo                       se preenchido
--   senão data_evento + offset_dias  se o evento tem data
--   senão nulo                       ("sem prazo")
-- -----------------------------------------------------------------------------
create or replace function public.prazo_efetivo(
  p_prazo_fixo  date,
  p_offset_dias integer,
  p_data_evento date
)
returns date
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_prazo_fixo, p_data_evento + p_offset_dias);
$$;

-- Agrupamento usado pelo painel e pela tela de tarefas.
-- "comecar_agora": prazo já estava vencido quando a tarefa entrou no evento
-- (casal que começa a planejar tarde, ou checklist adicionado depois) — não é atraso.
create or replace function public.grupo_tarefa(
  p_status    public.status_tarefa,
  p_prazo     date,
  p_criada_em date,
  p_hoje      date
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_status = 'concluida'                                  then 'concluidas'
    when p_prazo is null                                         then 'sem_prazo'
    when p_prazo < p_criada_em                                   then 'comecar_agora'
    when p_prazo < p_hoje                                        then 'atrasadas'
    when p_prazo < (date_trunc('month', p_hoje) + interval '1 month')::date
                                                                 then 'este_mes'
    when p_prazo <= (p_hoje + interval '3 months')::date         then 'proximos_3_meses'
    else 'depois'
  end;
$$;

-- -----------------------------------------------------------------------------
-- View que o front consome (respeita RLS de quem consulta)
-- -----------------------------------------------------------------------------
create or replace view public.tarefas_com_prazo
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
  )                                                                as grupo
from public.tarefas t
join public.eventos e on e.id = t.evento_id
cross join lateral (
  select public.prazo_efetivo(t.prazo_fixo, t.offset_dias, e.data) as prazo
) pz;

-- -----------------------------------------------------------------------------
-- Trigger de tarefas: carimba conclusão e valida responsável
-- -----------------------------------------------------------------------------
create or replace function public.tg_tarefas_regras()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.evento_id <> old.evento_id then
    raise exception 'Uma tarefa não pode mudar de evento.';
  end if;

  if new.status = 'concluida'
     and (tg_op = 'INSERT' or old.status is distinct from 'concluida') then
    new.concluida_em  := coalesce(new.concluida_em, now());
    new.concluida_por := coalesce(new.concluida_por, (select auth.uid()));
  elsif new.status = 'pendente' then
    new.concluida_em  := null;
    new.concluida_por := null;
  end if;

  if new.responsavel is not null and not exists (
    select 1 from public.membros
     where evento_id = new.evento_id and usuario_id = new.responsavel
  ) then
    raise exception 'O responsável precisa ser membro do casamento.';
  end if;

  new.titulo := btrim(new.titulo);
  return new;
end;
$$;

create trigger tarefas_regras
  before insert or update on public.tarefas
  for each row execute function public.tg_tarefas_regras();

-- -----------------------------------------------------------------------------
-- RPC · criar_evento (T2 · fim do onboarding)
-- Cria evento + membro + cópia dos modelos de tarefa, tudo em uma transação.
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

  insert into public.tarefas (evento_id, modelo_id, titulo, descricao, categoria, offset_dias, ordem)
  select v_evento_id, m.id, m.titulo, m.descricao, m.categoria, m.offset_dias, m.ordem
    from public.tarefa_modelos m
   where m.ativo;

  return v_evento_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC · previa_mudanca_data (T6 · antes de confirmar nova data)
-- -----------------------------------------------------------------------------
create or replace function public.previa_mudanca_data(
  p_evento_id   uuid,
  p_data_status public.data_status,
  p_data        date
)
returns table (
  mudam_de_prazo      integer,
  prazo_travado       integer,
  passam_a_atrasadas  integer,
  ficam_sem_prazo     integer
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_nova_data date;
  v_fuso      text;
  v_hoje      date;
begin
  if not public.eh_membro(p_evento_id) then
    raise exception 'Sem acesso a este casamento.' using errcode = '42501';
  end if;

  select fuso into v_fuso from public.eventos where id = p_evento_id;
  v_hoje := (now() at time zone v_fuso)::date;
  v_nova_data := case p_data_status
                   when 'indefinida'   then null
                   when 'mes_estimado' then date_trunc('month', p_data)::date
                   else p_data
                 end;

  return query
  with base as (
    select
      t.prazo_fixo,
      t.offset_dias,
      (t.criado_em at time zone e.fuso)::date                          as criada_em,
      public.prazo_efetivo(t.prazo_fixo, t.offset_dias, e.data)       as prazo_atual,
      public.prazo_efetivo(t.prazo_fixo, t.offset_dias, v_nova_data)  as prazo_novo
    from public.tarefas t
    join public.eventos e on e.id = t.evento_id
    where t.evento_id = p_evento_id
      and t.status = 'pendente'
  )
  select
    count(*) filter (where prazo_fixo is null and offset_dias is not null
                       and prazo_atual is distinct from prazo_novo)::integer,
    count(*) filter (where prazo_fixo is not null)::integer,
    count(*) filter (where public.grupo_tarefa('pendente', prazo_novo, criada_em, v_hoje) = 'atrasadas'
                       and public.grupo_tarefa('pendente', prazo_atual, criada_em, v_hoje) <> 'atrasadas')::integer,
    count(*) filter (where prazo_novo is null and prazo_atual is not null)::integer
  from base;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC · obter_convite (landing do link, pode ser chamada sem login)
-- Devolve só o mínimo para a tela "Ana & Bruno te convidou".
-- -----------------------------------------------------------------------------
create or replace function public.obter_convite(p_token uuid)
returns table (nome_exibicao text, email text, situacao text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.nome_exibicao,
    c.email,
    case
      when c.aceito_em    is not null then 'aceito'
      when c.cancelado_em is not null then 'cancelado'
      when c.expira_em    < now()     then 'expirado'
      else 'valido'
    end
  from public.convites_parceiro c
  join public.eventos e on e.id = c.evento_id
  where c.token = p_token;
$$;

-- -----------------------------------------------------------------------------
-- RPC · aceitar_convite (T3)
-- Exige que o e-mail da conta logada seja o e-mail convidado.
-- -----------------------------------------------------------------------------
create or replace function public.aceitar_convite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_email   text := lower((select auth.jwt()) ->> 'email');
  v_convite public.convites_parceiro%rowtype;
begin
  if v_uid is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;

  select * into v_convite
    from public.convites_parceiro
   where token = p_token
   for update;

  if not found
     or v_convite.aceito_em is not null
     or v_convite.cancelado_em is not null
     or v_convite.expira_em < now() then
    raise exception 'Convite inválido ou expirado.'
      using errcode = 'P0001', hint = 'convite_invalido';
  end if;

  if v_email is distinct from v_convite.email then
    raise exception 'Este convite foi enviado para outro e-mail.'
      using errcode = 'P0001', hint = 'email_diferente';
  end if;

  if exists (select 1 from public.membros where usuario_id = v_uid) then
    raise exception 'Você já participa de um casamento.'
      using errcode = 'P0001', hint = 'ja_tem_evento';
  end if;

  insert into public.membros (evento_id, usuario_id, papel)
  values (v_convite.evento_id, v_uid, 'parceiro');   -- trigger barra o 3º parceiro

  update public.convites_parceiro
     set aceito_em = now(), aceito_por = v_uid
   where id = v_convite.id;

  return v_convite.evento_id;
end;
$$;
