-- =============================================================================
-- Nosso Dia · M1 · #5 Trajes e acessórios dos noivos · #6 Cabelo, maquiagem e testes
-- =============================================================================
-- Novidade: modelos POR PARCEIRO (os trajes). Cada parceiro tem a própria tarefa.
--   · casamento com 1 parceiro no app → uma tarefa compartilhada ("Os dois", parceiro = null);
--   · quando o 2º parceiro entra → a compartilhada passa a ser de quem já estava
--     (ou do responsável, se houver) e o recém-chegado ganha as suas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Estrutura
-- -----------------------------------------------------------------------------
alter table public.tarefa_modelos add column por_parceiro boolean not null default false;

alter table public.tarefas
  add column parceiro uuid references public.perfis (id) on delete set null;

comment on column public.tarefas.parceiro is
  'Para modelos por parceiro: de quem é esta tarefa. Nulo = tarefa comum ou compartilhada.';

-- Uma tarefa por (casamento, modelo, parceiro); NULLS NOT DISTINCT trata "sem parceiro" como um valor.
drop index public.tarefas_modelo_unico_por_evento;
create unique index tarefas_modelo_unico_por_evento
  on public.tarefas (evento_id, modelo_id, parceiro) nulls not distinct
  where modelo_id is not null;

-- -----------------------------------------------------------------------------
-- _copiar_pacote: passo 2 passa a tratar modelos por parceiro (passos 1, 3, 4 e 5 iguais à #3)
-- -----------------------------------------------------------------------------
create or replace function public._copiar_pacote(p_evento_id uuid, p_pacote text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_modelo   public.tarefa_modelos%rowtype;
  v_antiga   uuid;
  v_criadas  integer;
  v_mais     integer;
  v_membros  uuid[];
begin
  perform set_config('nosso_dia.sistema', '1', true);

  select coalesce(array_agg(usuario_id order by criado_em), '{}')
    into v_membros
    from public.membros
   where evento_id = p_evento_id and papel = 'parceiro';

  -- 1. absorver tarefas de modelos substituídos
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

  -- 2a. modelos comuns
  insert into public.tarefas (evento_id, modelo_id, titulo, descricao, categoria, offset_dias, ordem)
  select p_evento_id, m.id, m.titulo, m.descricao, m.categoria, m.offset_dias, m.ordem
    from public.tarefa_modelos m
   where m.pacote = p_pacote and m.ativo and not m.por_parceiro
  on conflict (evento_id, modelo_id, parceiro) where modelo_id is not null do nothing;
  get diagnostics v_criadas = row_count;

  -- 2b. modelos por parceiro
  if cardinality(v_membros) >= 2 then
    -- a tarefa compartilhada passa a ser do responsável (se houver) ou de quem já estava
    update public.tarefas t
       set parceiro    = coalesce(t.responsavel, v_membros[1]),
           responsavel = coalesce(t.responsavel, v_membros[1])
      from public.tarefa_modelos m
     where m.id = t.modelo_id
       and m.pacote = p_pacote
       and m.por_parceiro
       and t.evento_id = p_evento_id
       and t.parceiro is null
       and not exists (
         select 1 from public.tarefas x
          where x.evento_id = p_evento_id
            and x.modelo_id = t.modelo_id
            and x.parceiro = coalesce(t.responsavel, v_membros[1])
       );

    insert into public.tarefas (evento_id, modelo_id, titulo, descricao, categoria, offset_dias, ordem, parceiro, responsavel)
    select p_evento_id, m.id, m.titulo, m.descricao, m.categoria, m.offset_dias, m.ordem, u.id, u.id
      from public.tarefa_modelos m
     cross join unnest(v_membros) as u (id)
     where m.pacote = p_pacote and m.ativo and m.por_parceiro
    on conflict (evento_id, modelo_id, parceiro) where modelo_id is not null do nothing;
  else
    insert into public.tarefas (evento_id, modelo_id, titulo, descricao, categoria, offset_dias, ordem)
    select p_evento_id, m.id, m.titulo, m.descricao, m.categoria, m.offset_dias, m.ordem
      from public.tarefa_modelos m
     where m.pacote = p_pacote and m.ativo and m.por_parceiro
    on conflict (evento_id, modelo_id, parceiro) where modelo_id is not null do nothing;
  end if;
  get diagnostics v_mais = row_count;
  v_criadas := v_criadas + v_mais;

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

  -- 5. concluir as tarefas que a ativação do pacote resolve
  update public.tarefas t
     set status = 'concluida'
    from public.tarefa_modelos m, public.pacotes p
   where m.id = t.modelo_id
     and p.codigo = p_pacote
     and m.codigo = any (p.conclui)
     and t.evento_id = p_evento_id
     and t.status = 'pendente';

  perform set_config('nosso_dia.sistema', '', true);
  return v_criadas;
end;
$$;

-- Reaplica os pacotes ativos que têm modelos por parceiro (ex.: depois que alguém entra no casamento).
create or replace function public._completar_por_parceiro(p_evento_id uuid)
returns integer
language sql
security definer
set search_path = ''
as $$
  select coalesce(sum(public._copiar_pacote(p_evento_id, ep.pacote)), 0)::integer
    from public.evento_pacotes ep
   where ep.evento_id = p_evento_id
     and exists (select 1 from public.tarefa_modelos m where m.pacote = ep.pacote and m.por_parceiro and m.ativo);
$$;

revoke execute on function public._copiar_pacote(uuid, text), public._completar_por_parceiro(uuid)
  from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- aceitar_convite: igual ao M0, mais a divisão das tarefas por parceiro
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

  perform public._completar_por_parceiro(v_convite.evento_id);

  return v_convite.evento_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Conteúdo
-- -----------------------------------------------------------------------------
insert into public.pacotes (codigo, nome, descricao, automatico, ordem) values
  ('trajes_noivos', 'Trajes dos noivos',      'Escolha, provas e acessórios, para cada um de vocês.', true, 50),
  ('beleza',        'Cabelo e maquiagem',      'Contratação, teste e cuidados antes do casamento.',   true, 60);

insert into public.tarefa_modelos (codigo, pacote, titulo, descricao, categoria, offset_dias, ordem, por_parceiro, substitui) values
  -- #5 trajes (por parceiro)
  ('tr_referencias', 'trajes_noivos', 'Pesquisar referências e definir o estilo do traje',
   'Salvem imagens do que gostam e do que não querem. Ajuda muito nas lojas e ateliês.',
   'trajes', -270, 140, true, '{}'),
  ('tr_escolher', 'trajes_noivos', 'Escolher e encomendar ou alugar o traje',
   'Pergunte o prazo de confecção ou de ajuste e quantas provas estão incluídas.',
   'trajes', -210, 150, true, '{escolher_trajes}'),
  ('tr_prova1', 'trajes_noivos', '1ª prova do traje',
   'Leve os sapatos e a roupa de baixo que vai usar no dia, se já tiver.',
   'trajes', -120, 151, true, '{}'),
  ('tr_acessorios', 'trajes_noivos', 'Acessórios do traje',
   null,
   'trajes', -45, 152, true, '{}'),
  ('tr_prova2', 'trajes_noivos', '2ª prova do traje',
   null,
   'trajes', -60, 153, true, '{}'),
  ('tr_prova_final', 'trajes_noivos', 'Prova final e retirada do traje',
   'Combine onde o traje fica guardado até o dia e quem vai buscar.',
   'trajes', -14, 154, true, '{}'),

  -- #6 beleza (compartilhada)
  ('bz_pesquisar', 'beleza', 'Pesquisar profissionais de cabelo e maquiagem',
   'Veja portfólio com fotos de casamentos reais, não só de estúdio.',
   'beleza', -210, 190, false, '{}'),
  ('bz_contratar', 'beleza', 'Contratar cabelo e maquiagem',
   'Confirme se atendem no local, para quantas pessoas e o horário de chegada.',
   'beleza', -180, 191, false, '{}'),
  ('bz_referencias', 'beleza', 'Separar referências para o teste',
   'Fotos do penteado e da maquiagem que vocês gostam, e também do que não querem.',
   'beleza', -75, 199, false, '{}'),
  ('bz_teste', 'beleza', 'Fazer o teste de cabelo e maquiagem',
   'Fotografe o resultado em luz natural e com flash, e veja como fica depois de algumas horas.',
   'beleza', -60, 200, false, '{teste_beleza}'),
  ('bz_cuidados', 'beleza', 'Cuidados antes do casamento',
   'Prazos sugeridos; ajuste com quem cuida de vocês.',
   'beleza', -30, 201, false, '{}');

insert into public.tarefa_modelo_subitens (modelo_id, texto, ordem)
select m.id, s.texto, s.ordem
  from (values
    ('tr_acessorios', 'Sapatos (usar em casa antes, para amaciar)', 1),
    ('tr_acessorios', 'Véu, gravata ou outro acessório', 2),
    ('tr_acessorios', 'Joias e relógio', 3),
    ('tr_acessorios', 'Roupa de baixo e meias', 4),
    ('tr_acessorios', 'Perfume', 5),
    ('bz_cuidados', 'Pele: nada de procedimento novo nas últimas semanas', 1),
    ('bz_cuidados', 'Cabelo: corte e coloração com algumas semanas de antecedência', 2),
    ('bz_cuidados', 'Sobrancelha: alguns dias antes', 3),
    ('bz_cuidados', 'Unhas: um ou dois dias antes', 4)
  ) as s (codigo, texto, ordem)
  join public.tarefa_modelos m on m.codigo = s.codigo;

update public.tarefa_modelos
   set ativo = false
 where codigo in ('escolher_trajes', 'teste_beleza');

select public._aplicar_pacote_em_todos('trajes_noivos');
select public._aplicar_pacote_em_todos('beleza');
