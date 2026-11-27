-- Testes do M2 · #24 música, assessoria e setlist (rodada C).
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

-- ------------------------------------------------------------------ pacotes
select pg_temp.ok('catálogo: música (4) e assessoria (4), automáticos; modelos do M0 desativados',
  (select bool_and(automatico) from pacotes where codigo in ('musica', 'assessoria'))
  and (select count(*) = 4 from tarefa_modelos where ativo and pacote = 'musica')
  and (select count(*) = 4 from tarefa_modelos where ativo and pacote = 'assessoria')
  and (select bool_and(not ativo) from tarefa_modelos where codigo in ('contratar_musica', 'decidir_assessoria')));
select pg_temp.ok('todo casamento tem as 8 tarefas, sem duplicar as absorvidas',
  not exists (select 1 from eventos e
               where (select count(*) from tarefas t join tarefa_modelos m on m.id = t.modelo_id
                       where t.evento_id = e.id and m.pacote in ('musica', 'assessoria')) <> 8)
  and not exists (select 1 from tarefas t join tarefa_modelos m on m.id = t.modelo_id
                   where m.codigo in ('contratar_musica', 'decidir_assessoria'))
  and not exists (select 1 from tarefas where titulo = 'Decidir se terão assessoria ou cerimonial'
                   group by evento_id having count(*) > 1));
select pg_temp.ok('itens da setlist apontam para /musica',
  (select count(*) = 3 and bool_and(link = '/musica') from tarefa_modelo_subitens s
     join tarefa_modelos m on m.id = s.modelo_id where m.codigo = 'mus_setlist'));
select pg_temp.ok('sem tarefa repetida de música da cerimônia (fica com os pacotes de cerimônia)',
  not exists (select 1 from tarefa_modelos where pacote = 'musica' and titulo ilike '%cerimônia%'));

-- ------------------------------------------------------------------ setlist: RLS
select pg_temp.como(:'ana', 'ana@x.com') \g /dev/null
set role authenticated;
insert into musicas (evento_id, momento, titulo, artista, link, ordem) values
  (:'ev', 'entrada_noivos', 'Canon in D', 'Pachelbel', 'https://open.spotify.com/track/abc', 1),
  (:'ev', 'primeira_danca', 'Perfect', 'Ed Sheeran', null, 1);
select pg_temp.ok('Ana adiciona músicas ao próprio casamento',
  pg_temp.linhas(format('select * from musicas where evento_id = %L', :'ev')) = 2);
select pg_temp.ok('link só http(s); momento só da lista; título obrigatório',
  pg_temp.erro(format($$insert into musicas (evento_id, momento, titulo, link) values (%L, 'festa', 'X', 'javascript:alert(1)')$$, :'ev')) = 'musicas_link_check'
  and pg_temp.erro(format($$insert into musicas (evento_id, momento, titulo) values (%L, 'karaoke', 'X')$$, :'ev')) = 'musicas_momento_check'
  and pg_temp.erro(format($$insert into musicas (evento_id, momento, titulo) values (%L, 'festa', '  ')$$, :'ev')) = 'musicas_titulo_check');
reset role;

select pg_temp.como(:'carla', 'carla@x.com') \g /dev/null
set role authenticated;
select pg_temp.ok('Carla não lê a setlist da Ana', pg_temp.linhas('select * from musicas') = 0);
update musicas set titulo = 'invadido';
delete from musicas;
select pg_temp.ok('Carla não adiciona música no casamento da Ana',
  pg_temp.erro(format($$insert into musicas (evento_id, momento, titulo) values (%L, 'festa', 'X')$$, :'ev')) = '42501');
insert into musicas (evento_id, momento, titulo) values (:'carla_ev', 'festa', 'Música da Carla') returning id as m_carla \gset
select pg_temp.ok('Carla não move a própria música para o casamento da Ana',
  pg_temp.erro(format($$update musicas set evento_id = %L where id = %L$$, :'ev', :'m_carla')) = '42501');
reset role;
select pg_temp.ok('...conferindo como superusuário: a setlist da Ana intacta',
  (select count(*) = 2 and bool_and(titulo <> 'invadido') from musicas where evento_id = :'ev'));
set role anon;
select pg_temp.ok('anônimo não acessa a setlist', pg_temp.erro('select * from musicas') = '42501');
reset role;
