-- Testes do M2 · #23 checklists de bebidas, foto e vídeo e decoração (rodada C).
\set ON_ERROR_STOP 1
\pset footer off
\pset tuples_only on
\pset format unaligned

create function pg_temp.ok(teste text, condicao boolean) returns text language sql as $$
  select case when condicao then 'ok    ' else 'FALHOU' end || ' · ' || teste; $$;
create function pg_temp.do_pacote(ev uuid, p text) returns table (codigo text, titulo text, status text, editada boolean, itens bigint)
language sql as $$
  select m.codigo, t.titulo, t.status::text, t.editada, (select count(*) from tarefa_subitens s where s.tarefa_id = t.id)
    from tarefas t join tarefa_modelos m on m.id = t.modelo_id
   where t.evento_id = ev and m.pacote = p $$;

select id as ana from eventos where nome_exibicao = 'Ana & Bruno' \gset
select id as carla from eventos where nome_exibicao = 'Carla & Davi' \gset

select pg_temp.ok('catálogo: bebidas (5), foto e vídeo (5), decoração (6), automáticos',
  (select bool_and(automatico) from pacotes where codigo in ('bebidas', 'foto_video', 'decoracao'))
  and (select array_agg(pacote || '=' || n order by pacote) from
        (select pacote, count(*) n from tarefa_modelos where ativo and pacote in ('bebidas', 'foto_video', 'decoracao') group by pacote) x)
      = array['bebidas=5', 'decoracao=6', 'foto_video=5']);
select pg_temp.ok('modelos do M0 desativados', (select bool_and(not ativo) from tarefa_modelos where codigo in ('contratar_foto', 'contratar_decoracao')));
select pg_temp.ok('todo casamento tem as 16 tarefas e nenhuma ficou nos modelos antigos',
  not exists (select 1 from eventos e
               where (select count(*) from tarefas t join tarefa_modelos m on m.id = t.modelo_id
                       where t.evento_id = e.id and m.pacote in ('bebidas', 'foto_video', 'decoracao')) <> 16)
  and not exists (select 1 from tarefas t join tarefa_modelos m on m.id = t.modelo_id
                   where m.codigo in ('contratar_foto', 'contratar_decoracao')));
select pg_temp.ok('absorção sem duplicar: um "Contratar fotografia e filmagem" e um "Contratar decoração e flores" por casamento',
  not exists (select 1 from tarefas where titulo in ('Contratar fotografia e filmagem', 'Contratar decoração e flores')
               group by evento_id, titulo having count(*) > 1));
select pg_temp.ok('itens: briefing (6), projeto de decoração (6, com iluminação), contrato de foto (4)',
  (select itens = 6 from pg_temp.do_pacote(:'ana', 'foto_video') where codigo = 'fv_briefing')
  and (select itens = 6 from pg_temp.do_pacote(:'ana', 'decoracao') where codigo = 'dec_projeto')
  and (select itens = 4 from pg_temp.do_pacote(:'ana', 'foto_video') where codigo = 'fv_contratar')
  and exists (select 1 from tarefa_modelo_subitens s join tarefa_modelos m on m.id = s.modelo_id
               where m.codigo = 'dec_projeto' and s.texto = 'Iluminação'));
select pg_temp.ok('entrega das fotos depois do casamento (D+60)',
  (select offset_dias = 60 from tarefa_modelos where codigo = 'fv_entrega'));

-- ------------------------------------------------------------------ editadas e concluídas antes
begin;
update tarefa_modelos set ativo = true where codigo in ('contratar_foto', 'contratar_decoracao');
delete from tarefas t using tarefa_modelos m
 where m.id = t.modelo_id and t.evento_id = :'carla' and m.pacote in ('foto_video', 'decoracao');
delete from evento_pacotes where evento_id = :'carla' and pacote in ('foto_video', 'decoracao');
select set_config('nosso_dia.sistema', '1', true) \g /dev/null
insert into tarefas (evento_id, modelo_id, titulo, descricao, categoria, offset_dias, status, editada)
select :'carla', m.id, x.titulo, m.descricao, m.categoria, m.offset_dias, x.status::status_tarefa, x.editada
  from tarefa_modelos m
  join (values
    ('contratar_foto', 'Fechar com o fotógrafo do primo', 'pendente', true),
    ('contratar_decoracao', 'Contratar decoração e flores', 'concluida', false)
  ) as x (codigo, titulo, status, editada) on x.codigo = m.codigo;
select set_config('nosso_dia.sistema', '', true) \g /dev/null
update tarefa_modelos set ativo = false where codigo in ('contratar_foto', 'contratar_decoracao');

select public._copiar_pacote(:'carla', 'foto_video') + public._copiar_pacote(:'carla', 'decoracao') as criadas \gset
select pg_temp.ok('cria só as 9 que não absorvem tarefa antiga', :criadas = 9);
select pg_temp.ok('editada é absorvida sem perder o título nem ganhar itens',
  (select titulo = 'Fechar com o fotógrafo do primo' and editada and itens = 0 from pg_temp.do_pacote(:'carla', 'foto_video') where codigo = 'fv_contratar'));
select pg_temp.ok('concluída é absorvida e continua concluída',
  (select status = 'concluida' from pg_temp.do_pacote(:'carla', 'decoracao') where codigo = 'dec_contratar'));
select pg_temp.ok('reaplicar não duplica', public._copiar_pacote(:'carla', 'foto_video') + public._copiar_pacote(:'carla', 'decoracao') = 0);
rollback;
