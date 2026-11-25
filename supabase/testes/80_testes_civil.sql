-- Testes do M1 · #2 casamento civil e regime de bens (rodada C).
\set ON_ERROR_STOP 1
\pset footer off
\pset tuples_only on
\pset format unaligned

create function pg_temp.ok(teste text, condicao boolean) returns text language sql as $$
  select case when condicao then 'ok    ' else 'FALHOU' end || ' · ' || teste; $$;
create function pg_temp.civil(ev uuid) returns table (codigo text, titulo text, offset_dias int, status text, itens bigint)
language sql as $$
  select m.codigo, t.titulo, t.offset_dias, t.status::text,
         (select count(*) from tarefa_subitens s where s.tarefa_id = t.id)
    from tarefas t join tarefa_modelos m on m.id = t.modelo_id
   where t.evento_id = ev and m.pacote = 'civil' $$;

select id as ana from eventos where nome_exibicao = 'Ana & Bruno' \gset
select id as carla from eventos where nome_exibicao = 'Carla & Davi' \gset

select pg_temp.ok('catálogo: pacote civil automático com 8 tarefas, categoria civil',
  (select automatico from pacotes where codigo = 'civil')
  and (select count(*) = 8 and bool_and(categoria = 'civil')
         from tarefa_modelos where pacote = 'civil' and ativo));
select pg_temp.ok('habilitacao_civil do M0 desativada e absorvida (nenhuma tarefa sobrou nela)',
  (select not ativo from tarefa_modelos where codigo = 'habilitacao_civil')
  and not exists (select 1 from tarefas t join tarefa_modelos m on m.id = t.modelo_id
                   where m.codigo = 'habilitacao_civil'));
select pg_temp.ok('casamento existente recebeu as 8 tarefas (não 9: a do M0 virou a nova)',
  (select count(*) from pg_temp.civil(:'ana')) = 8
  and (select count(*) from tarefas where evento_id = :'ana' and titulo ilike '%habilitação%') = 2);
select pg_temp.ok('habilitação em D-75, explica os 90 dias e traz 6 documentos',
  (select offset_dias = -75 and itens = 6 from pg_temp.civil(:'ana') where codigo = 'cv_habilitacao')
  and (select descricao like '%90 dias%' from tarefa_modelos where codigo = 'cv_habilitacao'));
select pg_temp.ok('ordem dos prazos: regime → pacto → habilitação → certificado → celebração → pós',
  (select array_agg(codigo order by offset_dias, codigo) from pg_temp.civil(:'ana')
    where codigo in ('cv_regime', 'cv_pacto', 'cv_habilitacao', 'cv_certificado', 'cv_celebracao', 'cv_pos'))
  = array['cv_regime', 'cv_pacto', 'cv_habilitacao', 'cv_certificado', 'cv_celebracao', 'cv_pos']);
select pg_temp.ok('tarefas de regime e pacto ligadas ao guia regime-de-bens',
  (select bool_and(guia = 'regime-de-bens') from tarefa_modelos where codigo in ('cv_regime', 'cv_pacto', 'cv_habilitacao')));
select pg_temp.ok('casamento sem data também recebe (sem prazo)',
  (select count(*) = 8 from pg_temp.civil(:'carla')));
select pg_temp.ok('casamento novo recebe o pacote civil ao ser criado',
  (select count(*) from tarefas t join tarefa_modelos m on m.id = t.modelo_id
     join eventos e on e.id = t.evento_id
    where e.nome_exibicao = 'Hugo & Iris' and m.pacote = 'civil') = 8);
select pg_temp.ok('reaplicar o pacote não duplica',
  public._aplicar_pacote_em_todos('civil') = 0);
