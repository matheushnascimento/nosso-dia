-- Correção · data do casamento no passado (rodada C).
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
-- devolve o hint do erro (ou null se não deu erro)
create function pg_temp.hint(sql text) returns text language plpgsql as $$
declare h text;
begin execute sql; return null;
exception when others then get stacked diagnostics h = pg_exception_hint; return h;
end $$;
grant execute on function pg_temp.hint(text) to authenticated;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'hugo@teste.com');
select pg_temp.como('00000000-0000-0000-0000-0000000000d1', 'hugo@teste.com') \g /dev/null
set role authenticated;

select pg_temp.ok('criar com data de ontem é recusado (hint data_passada)',
  pg_temp.hint($$select criar_evento('Hugo & Iris', 'definida', hoje_sp() - 1)$$) = 'data_passada');
select pg_temp.ok('criar com mês passado é recusado',
  pg_temp.hint($$select criar_evento('Hugo & Iris', 'mes_estimado', (date_trunc('month', hoje_sp()) - interval '1 day')::date)$$) = 'data_passada');
select pg_temp.ok('criar com o mês atual é aceito (mesmo com dia já passado)',
  pg_temp.hint($$select criar_evento('Hugo & Iris', 'mes_estimado', date_trunc('month', hoje_sp())::date)$$) is null);
select id as ev from eventos where nome_exibicao = 'Hugo & Iris' \gset

select pg_temp.ok('hoje é aceito',
  pg_temp.hint(format($$update eventos set data_status = 'definida', data = hoje_sp() where id = %L$$, :'ev')) is null);
select pg_temp.ok('mudar para ontem é recusado',
  pg_temp.hint(format($$update eventos set data = hoje_sp() - 1 where id = %L$$, :'ev')) = 'data_passada');
select pg_temp.ok('mudar para "ainda não sabemos" é aceito',
  pg_temp.hint(format($$update eventos set data_status = 'indefinida' where id = %L$$, :'ev')) is null);
reset role;

-- o dia passou: a data fica no passado sem ninguém mexer nela
select set_config('nosso_dia.sistema', '1', false) \g /dev/null
update eventos set data_status = 'definida', data = hoje_sp() - 30 where id = :'ev';
select set_config('nosso_dia.sistema', '', false) \g /dev/null

set role authenticated;
select pg_temp.ok('casamento que já aconteceu: editar outros campos continua possível',
  pg_temp.hint(format($$update eventos set cidade = 'Campinas' where id = %L$$, :'ev')) is null);
select pg_temp.ok('...e regravar a mesma data também',
  pg_temp.hint(format($$update eventos set data = data where id = %L$$, :'ev')) is null);
reset role;
