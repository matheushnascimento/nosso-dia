-- Testes do M2 · #22 checklists de espaço e buffet (rodada C). Os casamentos vêm do M0 (15_dados_pre_m1).
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

select pg_temp.ok('catálogo: espaço (4) e buffet (7), automáticos, com guia da visita',
  (select automatico from pacotes where codigo = 'espaco') and (select automatico from pacotes where codigo = 'buffet')
  and (select count(*) = 4 from tarefa_modelos where pacote = 'espaco' and ativo)
  and (select count(*) = 7 from tarefa_modelos where pacote = 'buffet' and ativo)
  and (select guia = 'visita-ao-espaco' from tarefa_modelos where codigo = 'esp_visitar'));
select pg_temp.ok('modelos do M0 desativados',
  (select bool_and(not ativo) from tarefa_modelos where codigo in ('pesquisar_espaco', 'contratar_espaco', 'contratar_buffet')));
select pg_temp.ok('todo casamento tem as 11 tarefas e nenhuma ficou nos modelos antigos',
  not exists (select 1 from eventos e
               where (select count(*) from tarefas t join tarefa_modelos m on m.id = t.modelo_id
                       where t.evento_id = e.id and m.pacote in ('espaco', 'buffet')) <> 11)
  and not exists (select 1 from tarefas t join tarefa_modelos m on m.id = t.modelo_id
                   where m.codigo in ('pesquisar_espaco', 'contratar_espaco', 'contratar_buffet')));
select pg_temp.ok('absorção sem duplicar: um "Contratar o espaço" e um "Contratar o buffet" por casamento',
  not exists (select 1 from tarefas where titulo in ('Contratar o espaço', 'Contratar o buffet')
               group by evento_id, titulo having count(*) > 1));
select pg_temp.ok('itens copiados: visita (9), visita técnica (5), cardápio (5)',
  (select itens = 9 from pg_temp.do_pacote(:'ana', 'espaco') where codigo = 'esp_visitar')
  and (select itens = 5 from pg_temp.do_pacote(:'ana', 'espaco') where codigo = 'esp_visita_tecnica')
  and (select itens = 5 from pg_temp.do_pacote(:'ana', 'buffet') where codigo = 'buf_cardapio'));
select pg_temp.ok('tarefa absorvida intacta recebe a descrição nova',
  (select t.descricao like 'Levem a lista%' from tarefas t join tarefa_modelos m on m.id = t.modelo_id
    where t.evento_id = :'ana' and m.codigo = 'esp_visitar'));

-- ------------------------------------------------------------------ editadas e concluídas antes
-- Simula um casamento ainda no M0: tarefas nos modelos antigos, uma editada e uma concluída.
begin;
update tarefa_modelos set ativo = true where codigo in ('pesquisar_espaco', 'contratar_espaco', 'contratar_buffet');
delete from tarefas t using tarefa_modelos m
 where m.id = t.modelo_id and t.evento_id = :'carla' and m.pacote in ('espaco', 'buffet');
delete from evento_pacotes where evento_id = :'carla' and pacote in ('espaco', 'buffet');
select set_config('nosso_dia.sistema', '1', true) \g /dev/null
insert into tarefas (evento_id, modelo_id, titulo, descricao, categoria, offset_dias, status, editada)
select :'carla', m.id, x.titulo, m.descricao, m.categoria, m.offset_dias, x.status::status_tarefa, x.editada
  from tarefa_modelos m
  join (values
    ('pesquisar_espaco', 'Visitar a chácara da tia', 'pendente', true),
    ('contratar_espaco', 'Contratar o espaço', 'concluida', false),
    ('contratar_buffet', 'Contratar o buffet', 'pendente', false)
  ) as x (codigo, titulo, status, editada) on x.codigo = m.codigo;
select set_config('nosso_dia.sistema', '', true) \g /dev/null
update tarefa_modelos set ativo = false where codigo in ('pesquisar_espaco', 'contratar_espaco', 'contratar_buffet');

select public._copiar_pacote(:'carla', 'espaco') + public._copiar_pacote(:'carla', 'buffet') as criadas \gset
select pg_temp.ok('cria só as 8 que não absorvem tarefa antiga', :criadas = 8);
select pg_temp.ok('editada é absorvida sem perder o título nem ganhar itens',
  (select titulo = 'Visitar a chácara da tia' and editada and itens = 0 from pg_temp.do_pacote(:'carla', 'espaco') where codigo = 'esp_visitar'));
select pg_temp.ok('concluída é absorvida e continua concluída',
  (select status = 'concluida' and itens = 0 from pg_temp.do_pacote(:'carla', 'espaco') where codigo = 'esp_contratar'));
select pg_temp.ok('intacta é absorvida com o conteúdo novo e os itens',
  (select t.descricao like 'Confiram no contrato%' from tarefas t join tarefa_modelos m on m.id = t.modelo_id
    where t.evento_id = :'carla' and m.codigo = 'buf_contratar')
  and (select count(*) = 11 from pg_temp.do_pacote(:'carla', 'espaco') a full join pg_temp.do_pacote(:'carla', 'buffet') b on false));
select pg_temp.ok('reaplicar não duplica', public._copiar_pacote(:'carla', 'espaco') + public._copiar_pacote(:'carla', 'buffet') = 0);
rollback;
