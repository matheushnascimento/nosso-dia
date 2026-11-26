-- Testes do M2 · #18 orçamento por categoria (rodada C). Ana e Bruno são um casal; Carla está em outro casamento.
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
-- SQLSTATE (ou nome da constraint, se houver) do erro; null se não deu erro
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
\set bruno '00000000-0000-0000-0000-00000000000b'
\set carla '00000000-0000-0000-0000-00000000000c'

-- ------------------------------------------------------------------ Ana distribui
select pg_temp.como(:'ana', 'ana@x.com') \g /dev/null
set role authenticated;
insert into orcamento_categorias (evento_id, categoria, planejado_centavos, prioridade) values
  (:'ev', 'local', 675000, 1), (:'ev', 'buffet', 1350000, null), (:'ev', 'reserva', 225000, null);
select pg_temp.ok('Ana grava o planejado do próprio casamento',
  pg_temp.linhas(format('select * from orcamento_categorias where evento_id = %L', :'ev')) = 3);
select pg_temp.ok('uma linha por categoria',
  pg_temp.erro(format($$insert into orcamento_categorias (evento_id, categoria) values (%L, 'local')$$, :'ev'))
    = 'orcamento_categorias_unica');
select pg_temp.ok('cada prioridade uma vez só',
  pg_temp.erro(format($$update orcamento_categorias set prioridade = 1 where evento_id = %L and categoria = 'buffet'$$, :'ev'))
    = 'orcamento_categorias_prioridade_unica');
select pg_temp.ok('prioridade só de 1 a 3',
  pg_temp.erro(format($$update orcamento_categorias set prioridade = 4 where evento_id = %L and categoria = 'buffet'$$, :'ev'))
    = 'orcamento_categorias_prioridade_check');
select pg_temp.ok('a reserva não recebe prioridade',
  pg_temp.erro(format($$update orcamento_categorias set prioridade = 2 where evento_id = %L and categoria = 'reserva'$$, :'ev'))
    = 'orcamento_categorias_reserva_sem_prioridade');
select pg_temp.ok('categoria fora da lista é recusada',
  pg_temp.erro(format($$insert into orcamento_categorias (evento_id, categoria) values (%L, 'padaria')$$, :'ev'))
    = 'orcamento_categorias_categoria_check');
select pg_temp.ok('planejado negativo é recusado',
  pg_temp.erro(format($$update orcamento_categorias set planejado_centavos = -1 where evento_id = %L and categoria = 'local'$$, :'ev'))
    = 'orcamento_categorias_planejado_centavos_check');
reset role;

-- ------------------------------------------------------------------ Bruno (mesmo casal)
select pg_temp.como(:'bruno', 'bruno@x.com') \g /dev/null
set role authenticated;
select pg_temp.ok('Bruno lê e ajusta o planejado',
  pg_temp.linhas(format('select * from orcamento_categorias where evento_id = %L', :'ev')) = 3
  and pg_temp.erro(format($$update orcamento_categorias set planejado_centavos = 700000 where evento_id = %L and categoria = 'local'$$, :'ev')) is null);
reset role;

-- ------------------------------------------------------------------ Carla (outro casamento)
select pg_temp.como(:'carla', 'carla@x.com') \g /dev/null
set role authenticated;
select pg_temp.ok('Carla não lê o orçamento da Ana',
  pg_temp.linhas('select * from orcamento_categorias') = 0);
update orcamento_categorias set planejado_centavos = 0 where evento_id = :'ev';
delete from orcamento_categorias where evento_id = :'ev';
select pg_temp.ok('Carla não cria categoria no casamento da Ana (RLS)',
  pg_temp.erro(format($$insert into orcamento_categorias (evento_id, categoria) values (%L, 'musica')$$, :'ev'))
    = '42501');
insert into orcamento_categorias (evento_id, categoria) values (:'carla_ev', 'musica') returning id as carla_musica \gset
select pg_temp.ok('Carla não move a própria categoria para o casamento da Ana',
  pg_temp.erro(format($$update orcamento_categorias set evento_id = %L where id = %L$$, :'ev', :'carla_musica')) is not null);
reset role;
select pg_temp.ok('...conferindo como superusuário: o orçamento da Ana segue intacto',
  (select count(*) = 3 and sum(planejado_centavos) = 700000 + 1350000 + 225000
     from orcamento_categorias where evento_id = :'ev'));

-- ------------------------------------------------------------------ anônimo
set role anon;
select pg_temp.ok('anônimo não acessa a tabela',
  pg_temp.erro('select * from orcamento_categorias') = '42501');
reset role;
