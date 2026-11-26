-- Testes do M2 · #21 estilo e formato (rodada C): catálogo, pacotes por tag reais e referências.
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
grant execute on function pg_temp.linhas(text) to authenticated;
select id as ev from eventos where nome_exibicao = 'Ana & Bruno' \gset
select id as carla_ev from eventos where nome_exibicao = 'Carla & Davi' \gset
\set ana   '00000000-0000-0000-0000-00000000000a'
\set carla '00000000-0000-0000-0000-00000000000c'
create function pg_temp.do_pacote(ev uuid, p text) returns bigint language sql as $$
  select count(*) from tarefas t join tarefa_modelos m on m.id = t.modelo_id where t.evento_id = ev and m.pacote = p $$;
grant execute on function pg_temp.do_pacote(uuid, text) to authenticated;

select pg_temp.ok('catálogo: 4 formatos, 3 períodos, 3 ambientes, 5 estilos',
  (select array_agg(grupo || '=' || n order by grupo) from (select grupo, count(*) n from tags where grupo is not null group by grupo) x)
  = array['ambiente=3', 'estilo=5', 'formato=4', 'periodo=3']);
select pg_temp.ok('pacotes por tag: ao_ar_livre (5), noite (2), destination (4); nenhum automático',
  (select array_agg(p.codigo || '=' || (select count(*) from tarefa_modelos m where m.pacote = p.codigo) order by p.codigo)
     from pacotes p where p.tag is not null) = array['ao_ar_livre=5', 'destination=4', 'noite=2']);
select pg_temp.ok('nenhum casamento recebeu os pacotes por tag sem responder',
  not exists (select 1 from evento_pacotes where pacote in ('ao_ar_livre', 'noite', 'destination')));

select pg_temp.como(:'ana', 'ana@x.com') \g /dev/null
set role authenticated;
select pg_temp.ok('prévia de "ao ar livre + noite": 7 entram',
  (select entram = 7 and saem = 0 from previa_tags(:'ev', array['tradicional', 'noite', 'ao_ar_livre', 'rustico'])));
select criadas from definir_tags(:'ev', array['tradicional', 'noite', 'ao_ar_livre', 'rustico']) \gset
select pg_temp.ok('marcar ao ar livre cria as tarefas do plano B (com subitens); noite, as de luz',
  :criadas = 7
  and pg_temp.do_pacote(:'ev', 'ao_ar_livre') = 5 and pg_temp.do_pacote(:'ev', 'noite') = 2
  and (select count(*) = 4 from tarefa_subitens s join tarefas t on t.id = s.tarefa_id
        join tarefa_modelos m on m.id = t.modelo_id where t.evento_id = :'ev' and m.codigo = 'ext_plano_b'));
select criadas from definir_tags(:'ev', array['tradicional', 'noite', 'ao_ar_livre', 'rustico']) \gset
select pg_temp.ok('responder de novo igual não duplica', :criadas = 0 and pg_temp.do_pacote(:'ev', 'ao_ar_livre') = 5);
update tarefas set status = 'concluida' where evento_id = :'ev'
   and modelo_id = (select id from tarefa_modelos where codigo = 'ext_plano_b');
select removidas from definir_tags(:'ev', array['tradicional', 'noite', 'fechado', 'rustico']) \gset
select pg_temp.ok('desmarcar ao ar livre remove as 4 intactas; a concluída fica',
  :removidas = 4 and pg_temp.do_pacote(:'ev', 'ao_ar_livre') = 1 and pg_temp.do_pacote(:'ev', 'noite') = 2);
select criadas from definir_tags(:'ev', array['tradicional', 'noite', 'misto', 'ao_ar_livre', 'rustico']) \gset
select pg_temp.ok('misto (com ao_ar_livre) traz de volta só as 4, sem duplicar a concluída',
  :criadas = 4 and pg_temp.do_pacote(:'ev', 'ao_ar_livre') = 5);

-- ------------------------------------------------------------------ referências
insert into referencias (evento_id, categoria, url, nota) values
  (:'ev', 'decoracao', 'https://www.pinterest.com/pin/123', 'Mesa com flores do campo');
select pg_temp.ok('referência com https é aceita', pg_temp.linhas('select * from referencias') = 1);
select pg_temp.ok('referência só aceita URL http(s)',
  pg_temp.erro(format($$insert into referencias (evento_id, categoria, url) values (%L, 'decoracao', 'javascript:alert(1)')$$, :'ev')) = 'referencias_url_check'
  and pg_temp.erro(format($$insert into referencias (evento_id, categoria, url) values (%L, 'decoracao', 'ftp://x.com/a')$$, :'ev')) = 'referencias_url_check'
  and pg_temp.erro(format($$insert into referencias (evento_id, categoria, url) values (%L, 'decoracao', 'https://')$$, :'ev')) = 'referencias_url_check');
select pg_temp.ok('referência com categoria fora da lista é recusada',
  pg_temp.erro(format($$insert into referencias (evento_id, categoria, url) values (%L, 'padaria', 'https://x.com')$$, :'ev')) = 'referencias_categoria_check');
reset role;

select pg_temp.como(:'carla', 'carla@x.com') \g /dev/null
set role authenticated;
select pg_temp.ok('Carla não lê, não altera e não cria referências no casamento da Ana',
  pg_temp.linhas('select * from referencias') = 0
  and pg_temp.erro(format($$insert into referencias (evento_id, categoria, url) values (%L, 'decoracao', 'https://x.com')$$, :'ev')) = '42501');
update referencias set nota = 'invadido';
delete from referencias;
insert into referencias (evento_id, categoria, url) values (:'carla_ev', 'trajes', 'https://x.com/vestido') returning id as ref_carla \gset
select pg_temp.ok('Carla não move a própria referência para o casamento da Ana',
  pg_temp.erro(format($$update referencias set evento_id = %L where id = %L$$, :'ev', :'ref_carla')) = '42501');
reset role;
select pg_temp.ok('...conferindo como superusuário: a da Ana intacta',
  (select nota = 'Mesa com flores do campo' from referencias where evento_id = :'ev'));
set role anon;
select pg_temp.ok('anônimo não acessa referências', pg_temp.erro('select * from referencias') = '42501');
reset role;
