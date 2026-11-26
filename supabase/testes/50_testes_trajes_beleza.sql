-- Testes do M1 · #5 trajes (tarefas por parceiro) · #6 beleza (rodada C).
-- A Ana está sozinha no casamento desde 15_dados_pre_m1.sql; o Bruno entra aqui, por convite.
\set ON_ERROR_STOP 1
\pset footer off
\pset tuples_only on
\pset format unaligned

create function pg_temp.como(p uuid, e text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p::text, false),
         set_config('request.jwt.claims', json_build_object('sub', p, 'email', e)::text, false); $$;
grant execute on function pg_temp.como(uuid, text) to authenticated;
create function pg_temp.ok(teste text, condicao boolean) returns text language sql as $$
  select case when condicao then 'ok    ' else 'FALHOU' end || ' · ' || teste; $$;
grant execute on function pg_temp.ok(text, boolean) to authenticated;
create function pg_temp.trajes(ev uuid) returns table (parceiro uuid, responsavel uuid, titulo text, status text, itens bigint)
language sql as $$
  select t.parceiro, t.responsavel, t.titulo, t.status::text,
         (select count(*) from tarefa_subitens s where s.tarefa_id = t.id)
    from tarefas t join tarefa_modelos m on m.id = t.modelo_id
   where t.evento_id = ev and m.pacote = 'trajes_noivos' $$;
grant execute on function pg_temp.trajes(uuid) to authenticated;

select id as ana from eventos where nome_exibicao = 'Ana & Bruno' \gset

-- ------------------------------------------------------------------ catálogo e absorção
select pg_temp.ok('6 modelos de traje por parceiro e 5 de beleza',
  (select count(*) from tarefa_modelos where pacote = 'trajes_noivos' and por_parceiro and ativo) = 6
  and (select count(*) from tarefa_modelos where pacote = 'beleza' and not por_parceiro and ativo) = 5);
select pg_temp.ok('escolher_trajes e teste_beleza desativados, nenhuma tarefa sobrou neles',
  (select count(*) from tarefa_modelos where codigo in ('escolher_trajes', 'teste_beleza') and not ativo) = 2
  and not exists (select 1 from tarefas t join tarefa_modelos m on m.id = t.modelo_id
                   where m.codigo in ('escolher_trajes', 'teste_beleza')));
select pg_temp.ok('beleza: 5 tarefas; "Cuidados" com 4 itens',
  (select count(*) from tarefas t join tarefa_modelos m on m.id = t.modelo_id
    where t.evento_id = :'ana' and m.pacote = 'beleza') = 5
  and (select subitens_total = 4 from tarefas_com_prazo where evento_id = :'ana' and titulo = 'Cuidados antes do casamento'));

-- ------------------------------------------------------------------ 1 parceiro: compartilhadas
select pg_temp.ok('Ana sozinha: 6 tarefas de traje compartilhadas (sem parceiro, sem responsável)',
  (select count(*) = 6 and bool_and(parceiro is null and responsavel is null) from pg_temp.trajes(:'ana')));
select pg_temp.ok('"Escolher os trajes" do M0 foi absorvida (6, não 7)',
  (select count(*) from pg_temp.trajes(:'ana') where titulo = 'Escolher e encomendar ou alugar o traje') = 1);
select pg_temp.ok('acessórios com 5 itens',
  (select itens = 5 from pg_temp.trajes(:'ana') where titulo = 'Acessórios do traje'));

-- Ana já marcou um item dos acessórios antes de o Bruno entrar
update tarefa_subitens set feito = true
 where texto = 'Perfume'
   and tarefa_id = (select t.id from tarefas t join tarefa_modelos m on m.id = t.modelo_id
                     where t.evento_id = :'ana' and m.codigo = 'tr_acessorios');

-- ------------------------------------------------------------------ Bruno entra
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-00000000000b', 'bruno@x.com', '{"nome":"Bruno"}');
insert into convites_parceiro (evento_id, email, convidado_por, token)
values (:'ana', 'bruno@x.com', '00000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111');

select pg_temp.como('00000000-0000-0000-0000-00000000000b', 'bruno@x.com');
set role authenticated;
select aceitar_convite('11111111-1111-1111-1111-111111111111') is not null as aceitou \gset
select pg_temp.ok('Bruno aceitou o convite', :'aceitou'::boolean);
select pg_temp.ok('agora são 12 tarefas de traje: 6 da Ana e 6 do Bruno',
  (select count(*) filter (where parceiro = '00000000-0000-0000-0000-00000000000a') = 6
      and count(*) filter (where parceiro = '00000000-0000-0000-0000-00000000000b') = 6
      and count(*) = 12
     from pg_temp.trajes(:'ana')));
select pg_temp.ok('cada tarefa de traje tem o próprio parceiro como responsável',
  (select bool_and(responsavel = parceiro) from pg_temp.trajes(:'ana')));
select pg_temp.ok('as compartilhadas ficaram com a Ana, com o item que ela marcou',
  exists (select 1 from tarefa_subitens s join tarefas t on t.id = s.tarefa_id
           where t.evento_id = :'ana' and t.parceiro = '00000000-0000-0000-0000-00000000000a'
             and s.texto = 'Perfume' and s.feito));
select pg_temp.ok('os acessórios do Bruno vêm com 5 itens, nenhum marcado',
  (select itens = 5 from pg_temp.trajes(:'ana')
    where parceiro = '00000000-0000-0000-0000-00000000000b' and titulo = 'Acessórios do traje'));
select pg_temp.ok('filtro "Minhas" do Bruno pega as 6 de traje dele',
  (select count(*) from tarefas_com_prazo where evento_id = :'ana'
     and responsavel = '00000000-0000-0000-0000-00000000000b' and categoria = 'trajes') = 6);
select pg_temp.ok('beleza continua compartilhada (5, sem duplicar)',
  (select count(*) from tarefas t join tarefa_modelos m on m.id = t.modelo_id
    where t.evento_id = :'ana' and m.pacote = 'beleza') = 5);
select pg_temp.ok('casal não define `parceiro` (grant por coluna)',
  (select count(*) = 0 from information_schema.column_privileges
    where table_name = 'tarefas' and column_name = 'parceiro' and privilege_type = 'UPDATE' and grantee = 'authenticated'));
reset role;

select pg_temp.ok('reaplicar o pacote depois da divisão não cria nada',
  public._aplicar_pacote_em_todos('trajes_noivos') = 0);
select pg_temp.ok('nenhuma duplicata por (casamento, modelo, parceiro)',
  not exists (select 1 from tarefas where modelo_id is not null
               group by evento_id, modelo_id, parceiro having count(*) > 1));

-- ------------------------------------------------------------------ responsável já definido
-- Carla (sozinha) atribui o "1ª prova" a ela mesma; ao entrar o Davi, essa tarefa fica com a Carla.
select id as carla from eventos where nome_exibicao = 'Carla & Davi' \gset
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000d', 'davi@x.com');
insert into convites_parceiro (evento_id, email, convidado_por, token)
values (:'carla', 'davi@x.com', '00000000-0000-0000-0000-00000000000c', '22222222-2222-2222-2222-222222222222');
select pg_temp.como('00000000-0000-0000-0000-00000000000c', 'carla@x.com');
set role authenticated;
update tarefas set responsavel = '00000000-0000-0000-0000-00000000000c'
 where evento_id = :'carla' and titulo = '1ª prova do traje';
reset role;
select pg_temp.como('00000000-0000-0000-0000-00000000000d', 'davi@x.com');
set role authenticated;
select aceitar_convite('22222222-2222-2222-2222-222222222222') is not null as ok2 \gset
reset role;
select pg_temp.ok('Davi entrou: 12 tarefas de traje, e a "1ª prova" atribuída continua da Carla',
  (select count(*) = 12 from pg_temp.trajes(:'carla'))
  and (select count(*) = 2 from pg_temp.trajes(:'carla') where titulo = '1ª prova do traje')
  and exists (select 1 from pg_temp.trajes(:'carla')
               where titulo = '1ª prova do traje' and parceiro = '00000000-0000-0000-0000-00000000000c'));
