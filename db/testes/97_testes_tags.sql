-- Testes do M2 · #20 pacotes ativados por tag (rodada C). Catálogo de teste numa transação desfeita no fim.
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
\set ana   '00000000-0000-0000-0000-00000000000a'
\set carla '00000000-0000-0000-0000-00000000000c'

begin;
-- catálogo de teste: tag com um pacote de 2 tarefas; a segunda tem um subitem
insert into tags (codigo, nome) values ('teste_ar_livre', 'Ao ar livre (teste)'), ('teste_noite', 'À noite (teste)');
insert into pacotes (codigo, nome, tag) values ('teste_externo', 'Casamento ao ar livre (teste)', 'teste_ar_livre');
insert into tarefa_modelos (codigo, titulo, categoria, offset_dias, pacote) values
  ('tx_tenda', 'Reservar tenda (teste)', 'local', -120, 'teste_externo'),
  ('tx_repelente', 'Comprar repelente (teste)', 'dia_d', -7, 'teste_externo');
insert into tarefa_modelo_subitens (modelo_id, texto)
  select id, 'Repelente em spray' from tarefa_modelos where codigo = 'tx_repelente';
create function pg_temp.tx(ev uuid) returns table (codigo text, status text, editada boolean, itens bigint) language sql as $$
  select m.codigo, t.status::text, t.editada, (select count(*) from tarefa_subitens s where s.tarefa_id = t.id)
    from tarefas t join tarefa_modelos m on m.id = t.modelo_id
   where t.evento_id = ev and m.pacote = 'teste_externo' $$;
grant execute on function pg_temp.tx(uuid) to authenticated;

select pg_temp.ok('pacote não pode ser por tag e automático ao mesmo tempo',
  pg_temp.erro($$insert into pacotes (codigo, nome, tag, automatico) values ('x_x', 'X', 'teste_noite', true)$$)
    = 'pacotes_tag_exclusiva');

select pg_temp.como(:'ana', 'ana@x.com') \g /dev/null
set role authenticated;
-- ------------------------------------------------------------------ ativar
select pg_temp.ok('prévia: 2 tarefas entram, nenhuma sai',
  (select entram = 2 and saem = 0 and ficam = 0 from previa_tags(:'ev', array['teste_ar_livre'])));
-- a chamada num comando e a conferência em outro: no mesmo comando, as subconsultas não veem o que a função gravou
select criadas, removidas from definir_tags(:'ev', array['teste_ar_livre']) \gset
select pg_temp.ok('definir a tag ativa o pacote: 2 criadas, com subitem',
  :criadas = 2 and :removidas = 0
  and (select count(*) = 2 and sum(itens) = 1 from pg_temp.tx(:'ev'))
  and exists (select 1 from evento_pacotes where evento_id = :'ev' and pacote = 'teste_externo')
  and pg_temp.linhas(format('select * from evento_tags where evento_id = %L', :'ev')) = 1);
select pg_temp.ok('definir de novo (com repetição) não duplica',
  (select criadas = 0 and removidas = 0 from definir_tags(:'ev', array['teste_ar_livre', 'teste_ar_livre', null]))
  and (select count(*) = 2 from pg_temp.tx(:'ev')));
select pg_temp.ok('prévia sem mudança: 0 entram, 0 saem',
  (select entram = 0 and saem = 0 from previa_tags(:'ev', array['teste_ar_livre'])));

-- ------------------------------------------------------------------ desativar
update tarefas set titulo = 'Reservar tenda grande' where evento_id = :'ev'
   and modelo_id = (select id from tarefa_modelos where codigo = 'tx_tenda');
select pg_temp.ok('prévia ao tirar a tag: 1 sai, 1 fica (editada)',
  (select entram = 0 and saem = 1 and ficam = 1 from previa_tags(:'ev', '{}')));
select criadas, removidas from definir_tags(:'ev', '{}') \gset
select pg_temp.ok('tirar a tag remove só a intacta; a editada sobrevive',
  :criadas = 0 and :removidas = 1
  and (select array_agg(codigo) = array['tx_tenda'] from pg_temp.tx(:'ev'))
  and not exists (select 1 from evento_pacotes where evento_id = :'ev' and pacote = 'teste_externo')
  and pg_temp.linhas(format('select * from evento_tags where evento_id = %L', :'ev')) = 0);

-- ------------------------------------------------------------------ reativar
select criadas from definir_tags(:'ev', array['teste_ar_livre']) \gset
select pg_temp.ok('reativar: recria só a que saiu (1), sem duplicar a editada',
  :criadas = 1
  and (select count(*) = 2 and count(distinct codigo) = 2 from pg_temp.tx(:'ev')));
update tarefas set status = 'concluida' where evento_id = :'ev'
   and modelo_id = (select id from tarefa_modelos where codigo = 'tx_repelente');
select removidas from definir_tags(:'ev', array['teste_noite']) \gset
select pg_temp.ok('concluída e editada sobrevivem à remoção da tag',
  :removidas = 0
  and (select count(*) = 2 from pg_temp.tx(:'ev'))
  and pg_temp.linhas(format($$select * from evento_tags where evento_id = %L and tag = 'teste_noite'$$, :'ev')) = 1);

-- ------------------------------------------------------------------ recusas
select pg_temp.ok('tag fora do catálogo é recusada (hint tag_inexistente)',
  pg_temp.erro(format($$select * from definir_tags(%L, array['churrasco'])$$, :'ev')) = 'P0001'
  and (select count(*) = 1 from evento_tags where evento_id = :'ev'));
select pg_temp.ok('pacote por tag não se ativa nem desativa direto (só pelas tags)',
  pg_temp.erro(format($$select * from ativar_pacote(%L, 'teste_externo')$$, :'ev')) = 'P0001'
  and pg_temp.erro(format($$select desativar_pacote(%L, 'teste_externo')$$, :'ev')) = 'P0001');
select pg_temp.ok('casal não escreve direto em evento_tags nem no catálogo',
  pg_temp.erro(format($$insert into evento_tags (evento_id, tag) values (%L, 'teste_ar_livre')$$, :'ev')) = '42501'
  and pg_temp.erro($$insert into tags (codigo, nome) values ('x', 'x')$$) = '42501');
reset role;

select pg_temp.como(:'carla', 'carla@x.com') \g /dev/null
set role authenticated;
select pg_temp.ok('Carla não vê, não prevê nem define tags no casamento da Ana',
  pg_temp.linhas('select * from evento_tags') = 0
  and pg_temp.erro(format($$select * from previa_tags(%L, '{}')$$, :'ev')) = '42501'
  and pg_temp.erro(format($$select * from definir_tags(%L, '{}')$$, :'ev')) = '42501');
reset role;
set role anon;
select pg_temp.ok('anônimo não acessa tags nem as funções',
  pg_temp.erro('select * from evento_tags') = '42501'
  and pg_temp.erro(format($$select * from definir_tags(%L, '{}')$$, :'ev')) = '42501');
reset role;

-- ------------------------------------------------------------------ conteúdo futuro
insert into tarefa_modelos (codigo, titulo, categoria, offset_dias, pacote)
  values ('tx_ventilador', 'Alugar ventiladores (teste)', 'local', -30, 'teste_externo');
select public._aplicar_pacote_por_tag('teste_externo') as aplicadas \gset
select pg_temp.ok('_aplicar_pacote_por_tag leva modelo novo só a quem tem a tag',
  :aplicadas = 0  -- a Ana tirou a tag
  and not exists (select 1 from pg_temp.tx(:'ev') where codigo = 'tx_ventilador'));
select pg_temp.como(:'ana', 'ana@x.com') \g /dev/null
set role authenticated;
select criadas from definir_tags(:'ev', array['teste_ar_livre']) \g /dev/null
reset role;
insert into tarefa_modelos (codigo, titulo, categoria, offset_dias, pacote)
  values ('tx_toldo', 'Alugar toldo (teste)', 'local', -30, 'teste_externo');
select public._aplicar_pacote_por_tag('teste_externo') as aplicadas \gset
select pg_temp.ok('...e com a tag de volta, o próximo modelo chega a ela',
  :aplicadas = 1
  and exists (select 1 from pg_temp.tx(:'ev') where codigo = 'tx_toldo'));
rollback;
