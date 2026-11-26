-- Testes do M1 · #1 (pacotes, subitens, backfill, RLS).
-- Rodada B de testes/rodar.sh: M0 → 15_dados_pre_m1.sql → migrations do M1 → este arquivo.
\set ON_ERROR_STOP 1
\pset footer off
\pset tuples_only on
\pset format unaligned
\pset fieldsep ' | '

create function pg_temp.como(p uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p::text, false); $$;
grant execute on function pg_temp.como(uuid) to authenticated;

create function pg_temp.ok(teste text, condicao boolean) returns text language sql as $$
  select case when condicao then 'ok    ' else 'FALHOU' end || ' · ' || teste; $$;
grant execute on function pg_temp.ok(text, boolean) to authenticated;

create function pg_temp.erro(teste text, sql text, trecho text) returns text language plpgsql as $$
begin
  execute sql;
  return 'FALHOU · ' || teste || ' (não deu erro)';
exception when others then
  if sqlerrm ilike '%' || trecho || '%' then return 'ok     · ' || teste; end if;
  return 'FALHOU · ' || teste || ' (erro inesperado: ' || sqlerrm || ')';
end $$;
grant execute on function pg_temp.erro(text, text, text) to authenticated;

select id as ev_ana   from eventos where nome_exibicao = 'Ana & Bruno'  \gset
select id as ev_carla from eventos where nome_exibicao = 'Carla & Davi' \gset

-- ============================================================ backfill
select pg_temp.ok('backfill registra o pacote base nos casamentos existentes',
  (select count(*) from evento_pacotes where pacote = 'base') = 2);
select pg_temp.ok('backfill não duplica tarefas (24 continua 24)',
  (select count(*) from tarefas where evento_id = :'ev_ana') = 24);

-- ============================================================ conteúdo de teste
-- pacote automático com um modelo que substitui o kit do M0 (com subitens)
-- e outro que substitui "Reconfirmar fornecedores" (que a Ana já concluiu)
insert into pacotes (codigo, nome, automatico, ordem) values ('t_auto', 'Teste automático', true, 10);
insert into tarefa_modelos (codigo, titulo, categoria, offset_dias, ordem, pacote, guia, substitui) values
  ('t_kit',  'Montar o kit de emergência', 'dia_d',        -3, 1, 't_auto', 'kit-de-emergencia', '{kit_dia_d}'),
  ('t_conf', 'Reconfirmar fornecedores (novo)', 'fornecedores', -14, 2, 't_auto', null, '{confirmar_fornecedores}'),
  ('t_nova', 'Tarefa nova do pacote', 'outros', -200, 3, 't_auto', null, '{}');
insert into tarefa_modelo_subitens (modelo_id, texto, ordem)
select id, x.texto, x.ordem from tarefa_modelos, (values ('Agulha e linha', 1), ('Alfinetes', 2), ('Analgésico', 3)) x(texto, ordem)
 where codigo = 't_kit';

-- grupo de escolha com dois pacotes
insert into pacotes (codigo, nome, grupo_escolha, ordem) values
  ('t_a', 'Opção A', 't_cer', 20), ('t_b', 'Opção B', 't_cer', 21);
insert into tarefa_modelos (codigo, titulo, categoria, offset_dias, ordem, pacote) values
  ('t_a1', 'Tarefa A1', 'cerimonia', -100, 1, 't_a'),
  ('t_a2', 'Tarefa A2', 'cerimonia', -90,  2, 't_a'),
  ('t_b1', 'Tarefa B1', 'cerimonia', -100, 1, 't_b');
insert into tarefa_modelo_subitens (modelo_id, texto, ordem)
select id, 'Item da A1', 1 from tarefa_modelos where codigo = 't_a1';

-- ============================================================ aplicar pacote automático em todos
select pg_temp.ok('_aplicar_pacote_em_todos cria só a tarefa nova em cada casamento (2 no total)',
  public._aplicar_pacote_em_todos('t_auto') = 2);
select pg_temp.ok('aplicar de novo não cria nada (idempotente)',
  public._aplicar_pacote_em_todos('t_auto') = 0);
select pg_temp.ok('Ana: 24 + 1 tarefa nova (as substituídas foram absorvidas)',
  (select count(*) from tarefas where evento_id = :'ev_ana') = 25);
select pg_temp.ok('kit intacto foi atualizado para o modelo novo, com 3 subitens',
  (select t.titulo = 'Montar o kit de emergência' and t.status = 'pendente'
          and (select count(*) from tarefa_subitens s where s.tarefa_id = t.id) = 3
     from tarefas t join tarefa_modelos m on m.id = t.modelo_id
    where t.evento_id = :'ev_ana' and m.codigo = 't_kit'));
select pg_temp.ok('tarefa concluída substituída mantém status e título antigos',
  (select t.status = 'concluida' and t.titulo = 'Reconfirmar todos os fornecedores'
     from tarefas t join tarefa_modelos m on m.id = t.modelo_id
    where t.evento_id = :'ev_ana' and m.codigo = 't_conf'));
select pg_temp.ok('não sobra tarefa apontando para os modelos substituídos',
  not exists (select 1 from tarefas t join tarefa_modelos m on m.id = t.modelo_id
               where t.evento_id = :'ev_ana' and m.codigo in ('kit_dia_d', 'confirmar_fornecedores')));
select pg_temp.ok('tarefa nova vencida entra em "começar agora", não em "atrasadas"',
  (select grupo = 'comecar_agora' from tarefas_com_prazo where evento_id = :'ev_ana' and titulo = 'Tarefa nova do pacote'));
select pg_temp.ok('nenhuma tarefa da Ana ficou atrasada com o pacote novo',
  not exists (select 1 from tarefas_com_prazo where evento_id = :'ev_ana' and grupo = 'atrasadas'));
select pg_temp.ok('view traz guia, pacote e contagem de subitens',
  (select guia = 'kit-de-emergencia' and pacote = 't_auto' and subitens_total = 3 and subitens_feitos = 0
     from tarefas_com_prazo where evento_id = :'ev_ana' and titulo = 'Montar o kit de emergência'));
select pg_temp.ok('cópia do sistema não marca tarefas como editadas',
  not exists (select 1 from tarefas where editada));

-- ============================================================ como Ana (membro)
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
set role authenticated;

select id as kit from tarefas where evento_id = :'ev_ana' and titulo = 'Montar o kit de emergência' \gset

select pg_temp.ok('Ana vê os subitens do próprio kit', (select count(*) from tarefa_subitens where tarefa_id = :'kit') = 3);
update tarefa_subitens set feito = true where tarefa_id = :'kit' and texto = 'Alfinetes';
select pg_temp.ok('marcar subitem atualiza a contagem na view',
  (select subitens_feitos = 1 from tarefas_com_prazo where id = :'kit'));
select pg_temp.ok('mexer em subitem marca a tarefa como editada',
  (select editada from tarefas where id = :'kit'));
insert into tarefa_subitens (tarefa_id, texto, ordem) values (:'kit', '  Carregador  ', 9);
select pg_temp.ok('Ana adiciona subitem próprio (texto normalizado)',
  exists (select 1 from tarefa_subitens where tarefa_id = :'kit' and texto = 'Carregador'));
select pg_temp.erro('subitem não pode fingir que veio do modelo',
  format($$insert into tarefa_subitens (tarefa_id, texto, modelo_subitem_id) values (%L, 'x', (select id from tarefa_modelo_subitens limit 1))$$, :'kit'),
  'row-level security');
select pg_temp.erro('subitem não muda de tarefa (grant por coluna)',
  format($$update tarefa_subitens set tarefa_id = tarefa_id where tarefa_id = %L$$, :'kit'), 'permission denied');
select pg_temp.erro('casal não altera `editada` diretamente',
  format($$update tarefas set editada = false where id = %L$$, :'kit'), 'permission denied');
select pg_temp.erro('casal não muda tarefa de evento',
  format($$update tarefas set evento_id = evento_id where id = %L$$, :'kit'), 'permission denied');
select pg_temp.erro('casal não chama _copiar_pacote',
  format($$select public._copiar_pacote(%L, 't_a')$$, :'ev_ana'), 'permission denied');
select pg_temp.erro('casal não escreve em evento_pacotes',
  format($$insert into evento_pacotes (evento_id, pacote) values (%L, 't_a')$$, :'ev_ana'), 'permission denied');
select pg_temp.erro('pacote automático não pode ser desativado',
  format($$select desativar_pacote(%L, 'base')$$, :'ev_ana'), 'não pode ser removido');
select pg_temp.erro('pacote inexistente',
  format($$select ativar_pacote(%L, 'nao_existe')$$, :'ev_ana'), 'não encontrado');

-- escolha: A, depois B
select pg_temp.ok('ativar A cria 2 tarefas', (select criadas = 2 and removidas = 0 from ativar_pacote(:'ev_ana', 't_a')));
select pg_temp.ok('ativar A de novo não muda nada', (select criadas = 0 and removidas = 0 from ativar_pacote(:'ev_ana', 't_a')));
select pg_temp.ok('A1 recebeu o subitem do modelo',
  (select subitens_total = 1 from tarefas_com_prazo where evento_id = :'ev_ana' and titulo = 'Tarefa A1'));
update tarefas set responsavel = '00000000-0000-0000-0000-00000000000a' where evento_id = :'ev_ana' and titulo = 'Tarefa A1';
select pg_temp.ok('editar A1 marca como editada', (select editada from tarefas where evento_id = :'ev_ana' and titulo = 'Tarefa A1'));
select pg_temp.ok('trocar para B: A2 intacta sai, B1 entra',
  (select criadas = 1 and removidas = 1 from ativar_pacote(:'ev_ana', 't_b')));
select pg_temp.ok('A1 editada continua; A2 saiu; B1 está lá',
  (select bool_and(x) from (values
     (exists (select 1 from tarefas where evento_id = :'ev_ana' and titulo = 'Tarefa A1')),
     (not exists (select 1 from tarefas where evento_id = :'ev_ana' and titulo = 'Tarefa A2')),
     (exists (select 1 from tarefas where evento_id = :'ev_ana' and titulo = 'Tarefa B1'))) v(x)));
select pg_temp.ok('só B fica ativo no grupo',
  (select array_agg(pacote order by pacote) = '{base,t_auto,t_b}' from evento_pacotes where evento_id = :'ev_ana'));
select pg_temp.ok('desativar B remove B1 (intacta)', desativar_pacote(:'ev_ana', 't_b') = 1);

-- excluir tarefa com subitens (cascata não quebra o trigger)
delete from tarefas where id = :'kit';
select pg_temp.ok('excluir tarefa leva os subitens junto', (select count(*) from tarefa_subitens where tarefa_id = :'kit') = 0);
reset role;

-- ============================================================ Carla (outro casamento)
select pg_temp.como('00000000-0000-0000-0000-00000000000c');
set role authenticated;
select pg_temp.ok('Carla não vê subitens nem pacotes do casamento da Ana',
  (select count(*) from tarefa_subitens s join tarefas t on t.id = s.tarefa_id where t.evento_id = :'ev_ana') = 0
  and (select count(*) from evento_pacotes where evento_id = :'ev_ana') = 0);
select pg_temp.erro('Carla não ativa pacote no casamento da Ana',
  format($$select ativar_pacote(%L, 't_a')$$, :'ev_ana'), 'Sem acesso');
update tarefa_subitens set feito = true
 where tarefa_id in (select id from tarefas where evento_id = :'ev_ana');  -- RLS: não pode afetar nada
select pg_temp.ok('Carla tem o próprio kit com 3 subitens',
  (select subitens_total = 3 from tarefas_com_prazo where evento_id = :'ev_carla' and titulo = 'Montar o kit de emergência'));
reset role;
select pg_temp.ok('Carla não conseguiu marcar nenhum subitem da Ana',
  not exists (select 1 from tarefa_subitens s join tarefas t on t.id = s.tarefa_id
               where t.evento_id = :'ev_ana' and s.feito));

-- ============================================================ casamento novo
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000e', 'eva@x.com');
select pg_temp.como('00000000-0000-0000-0000-00000000000e');
set role authenticated;
select criar_evento('Eva & Leo', 'indefinida') as ev_eva \gset
select pg_temp.ok('casamento novo recebe pacotes automáticos (base + t_auto) e nenhum de escolha',
  (select array_agg(pacote order by pacote) = '{base,t_auto}' from evento_pacotes where evento_id = :'ev_eva'));
select pg_temp.ok('casamento novo: 24 do base - 2 substituídas + 3 do t_auto = 25',
  (select count(*) from tarefas where evento_id = :'ev_eva') = 25);
reset role;
