-- Testes do M3 · #45 convidados e confirmações (rodada C).
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
grant execute on function pg_temp.ok(text, boolean) to authenticated, anon;
create function pg_temp.erro(sql text) returns text language plpgsql as $$
declare c text; e text;
begin execute sql; return null;
exception when others then get stacked diagnostics c = constraint_name, e = returned_sqlstate;
  return coalesce(nullif(c, ''), e);
end $$;
grant execute on function pg_temp.erro(text) to authenticated, anon;
create function pg_temp.linhas(sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute format('select count(*) from (%s) x', sql) into n; return n; end $$;
grant execute on function pg_temp.linhas(text) to authenticated;

select id as ev from eventos where nome_exibicao = 'Ana & Bruno' \gset
select id as carla_ev from eventos where nome_exibicao = 'Carla & Davi' \gset
\set ana   '00000000-0000-0000-0000-00000000000a'
\set carla '00000000-0000-0000-0000-00000000000c'

-- ------------------------------------------------------------------ Ana monta a lista
select pg_temp.como(:'ana', 'ana@x.com') \g /dev/null
set role authenticated;
insert into convites_familia (evento_id, nome, lado, grupo) values (:'ev', 'Família Silva', 'a', 'Família')
  returning id as silva \gset
insert into convites_familia (evento_id, nome) values (:'ev', 'Marcos') returning id as marcos \gset
insert into pessoas (evento_id, convite_id, nome, faixa, telefone, restricao_alimentar) values
  (:'ev', :'silva', 'João Silva', 'adulto', '11 99999-0000', 'sem glúten'),
  (:'ev', :'silva', 'Lia Silva', 'crianca', null, null);
insert into pessoas (evento_id, convite_id, nome) values (:'ev', :'marcos', 'Marcos') returning id as p_marcos \gset
select pg_temp.ok('Ana cadastra convites e convidados; padrão: adulto, pendente, dos dois',
  pg_temp.linhas(format('select * from pessoas where evento_id = %L', :'ev')) = 3
  and (select confirmacao = 'pendente' and faixa = 'adulto' from pessoas where id = :'p_marcos')
  and (select lado = 'ambos' from convites_familia where id = :'marcos'));
select pg_temp.ok('nome obrigatório, faixa e confirmação só da lista, idade de 0 a 120',
  pg_temp.erro(format($$insert into pessoas (evento_id, convite_id, nome) values (%L, %L, '  ')$$, :'ev', :'silva')) = 'pessoas_nome_check'
  and pg_temp.erro(format($$insert into pessoas (evento_id, convite_id, nome, faixa) values (%L, %L, 'X', 'idoso')$$, :'ev', :'silva')) = '22P02'
  and pg_temp.erro(format($$insert into pessoas (evento_id, convite_id, nome, idade) values (%L, %L, 'X', 200)$$, :'ev', :'silva')) = 'pessoas_idade_check');
update pessoas set confirmacao = 'confirmado' where convite_id = :'silva';
select pg_temp.ok('Ana marca a confirmação', (select bool_and(confirmacao = 'confirmado') from pessoas where convite_id = :'silva'));

-- convite vazio sai junto
update pessoas set convite_id = :'silva' where id = :'p_marcos';
select pg_temp.ok('mudar a última pessoa de convite apaga o convite que ficou vazio',
  not exists (select 1 from convites_familia where id = :'marcos')
  and (select count(*) = 3 from pessoas where convite_id = :'silva'));
delete from pessoas where id = :'p_marcos';
select pg_temp.ok('excluir uma pessoa mantém o convite com os outros',
  exists (select 1 from convites_familia where id = :'silva'));
reset role;

-- ------------------------------------------------------------------ outro casal
select pg_temp.como(:'carla', 'carla@x.com') \g /dev/null
set role authenticated;
select pg_temp.ok('Carla não lê os convidados nem os convites da Ana',
  pg_temp.linhas('select * from pessoas') = 0 and pg_temp.linhas('select * from convites_familia') = 0);
update pessoas set telefone = 'invadido';
update convites_familia set nome = 'invadido';
delete from pessoas;
delete from convites_familia;
select pg_temp.ok('Carla não cadastra convite no casamento da Ana',
  pg_temp.erro(format($$insert into convites_familia (evento_id, nome) values (%L, 'X')$$, :'ev')) = '42501');
insert into convites_familia (evento_id, nome) values (:'carla_ev', 'Convite da Carla') returning id as c_carla \gset
select pg_temp.ok('Carla não põe convidado dela num convite da Ana',
  pg_temp.erro(format($$insert into pessoas (evento_id, convite_id, nome) values (%L, %L, 'X')$$, :'carla_ev', :'silva')) = 'P0001');
select pg_temp.ok('Carla não move o próprio convite para o casamento da Ana',
  pg_temp.erro(format($$update convites_familia set evento_id = %L where id = %L$$, :'ev', :'c_carla')) is not null);
reset role;
select pg_temp.ok('...conferindo como superusuário: a lista da Ana intacta',
  (select count(*) = 2 and bool_and(telefone is distinct from 'invadido') from pessoas where evento_id = :'ev')
  and (select nome = 'Família Silva' from convites_familia where id = :'silva'));
set role anon;
select pg_temp.ok('anônimo não acessa convidados nem convites',
  pg_temp.erro('select * from pessoas') = '42501' and pg_temp.erro('select * from convites_familia') = '42501');
reset role;

-- ------------------------------------------------------------------ cascata
delete from convites_familia where id = :'silva';
select pg_temp.ok('excluir o convite exclui as pessoas dele',
  not exists (select 1 from pessoas where convite_id = :'silva'));
