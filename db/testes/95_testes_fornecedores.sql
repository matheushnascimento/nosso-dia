-- Testes do M2 · #17 fornecedores (rodada C). Ana e Bruno são um casal; Carla está em outro casamento.
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

-- ------------------------------------------------------------------ Ana cadastra
select pg_temp.como(:'ana', 'ana@x.com') \g /dev/null
set role authenticated;
insert into fornecedores (evento_id, categoria, nome, valor_orcado_centavos)
values (:'ev', 'local', 'Espaço Jardim', 3500000) returning id as espaco \gset
select pg_temp.ok('Ana cadastra um fornecedor do próprio casamento (status inicial: pesquisando)',
  (select status = 'pesquisando' and detalhes = '{}'::jsonb from fornecedores where id = :'espaco'));
select pg_temp.ok('contratado sem valor é recusado pelo banco',
  pg_temp.erro(format($$update fornecedores set status = 'contratado' where id = %L$$, :'espaco'))
    = 'fornecedores_contratado_com_valor');
select pg_temp.ok('contratado com valor passa',
  pg_temp.erro(format($$update fornecedores set status = 'contratado', valor_contratado_centavos = 3200000
                        where id = %L$$, :'espaco')) is null);
select pg_temp.ok('categoria fora da lista é recusada',
  pg_temp.erro(format($$insert into fornecedores (evento_id, categoria, nome) values (%L, 'padaria', 'X')$$, :'ev'))
    = 'fornecedores_categoria_check');
select pg_temp.ok('detalhes precisa ser um objeto',
  pg_temp.erro(format($$update fornecedores set detalhes = '[1]' where id = %L$$, :'espaco'))
    = 'fornecedores_detalhes_check');
select pg_temp.ok('valor negativo é recusado',
  pg_temp.erro(format($$update fornecedores set valor_orcado_centavos = -1 where id = %L$$, :'espaco'))
    = 'fornecedores_valor_orcado_centavos_check');
reset role;

-- ------------------------------------------------------------------ Bruno (mesmo casal)
select pg_temp.como(:'bruno', 'bruno@x.com') \g /dev/null
set role authenticated;
select pg_temp.ok('Bruno vê e edita o fornecedor que a Ana cadastrou',
  pg_temp.linhas(format('select * from fornecedores where id = %L', :'espaco')) = 1
  and pg_temp.erro(format($$update fornecedores set notas = 'visitamos' where id = %L$$, :'espaco')) is null);
reset role;

-- ------------------------------------------------------------------ Carla (outro casamento)
select pg_temp.como(:'carla', 'carla@x.com') \g /dev/null
set role authenticated;
select pg_temp.ok('Carla não lê fornecedores do casamento da Ana',
  pg_temp.linhas('select * from fornecedores') = 0);
update fornecedores set nome = 'invadido' where id = :'espaco';
delete from fornecedores where id = :'espaco';
select pg_temp.ok('Carla não cria fornecedor no casamento da Ana (RLS)',
  pg_temp.erro(format($$insert into fornecedores (evento_id, categoria, nome) values (%L, 'buffet', 'X')$$, :'ev'))
    = '42501');
insert into fornecedores (evento_id, categoria, nome) values (:'carla_ev', 'buffet', 'Buffet da Carla')
returning id as carla_buffet \gset
select pg_temp.ok('Carla não move o próprio fornecedor para o casamento da Ana',
  pg_temp.erro(format($$update fornecedores set evento_id = %L where id = %L$$, :'ev', :'carla_buffet')) is not null);
reset role;
select pg_temp.ok('...conferindo como superusuário: o da Ana segue intacto, o da Carla no casamento dela',
  (select nome = 'Espaço Jardim' and notas = 'visitamos' from fornecedores where id = :'espaco')
  and (select evento_id = :'carla_ev' from fornecedores where id = :'carla_buffet'));

-- ------------------------------------------------------------------ anônimo
set role anon;
select pg_temp.ok('anônimo não acessa a tabela',
  pg_temp.erro('select * from fornecedores') = '42501');
reset role;
