-- Testes do M1 · #3 (escolha do tipo de cerimônia). Roda depois de 20_testes_m1.sql, na rodada B.
-- Usa o casamento da Carla, que os testes anteriores não alteram.
\set ON_ERROR_STOP 1
\pset footer off
\pset tuples_only on
\pset format unaligned

create function pg_temp.como(p uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p::text, false); $$;
grant execute on function pg_temp.como(uuid) to authenticated;
create function pg_temp.ok(teste text, condicao boolean) returns text language sql as $$
  select case when condicao then 'ok    ' else 'FALHOU' end || ' · ' || teste; $$;
grant execute on function pg_temp.ok(text, boolean) to authenticated;

select id as ev from eventos where nome_exibicao = 'Carla & Davi' \gset

select pg_temp.ok('5 opções no grupo cerimonia',
  (select count(*) from pacotes where grupo_escolha = 'cerimonia') = 5);
select pg_temp.ok('pacotes de escolha não foram aplicados a casamentos existentes',
  not exists (select 1 from evento_pacotes ep join pacotes p on p.codigo = ep.pacote where p.grupo_escolha = 'cerimonia'));
select pg_temp.ok('todo modelo novo tem categoria conhecida e prazo antes do casamento',
  not exists (select 1 from tarefa_modelos m join pacotes p on p.codigo = m.pacote
               where p.grupo_escolha = 'cerimonia' and (m.categoria not in ('cerimonia', 'musica') or m.offset_dias >= 0)));

select pg_temp.como('00000000-0000-0000-0000-00000000000c');
set role authenticated;

select pg_temp.ok('"Decidir o tipo de cerimônia" começa pendente',
  (select status = 'pendente' from tarefas where evento_id = :'ev' and titulo = 'Decidir o tipo de cerimônia'));

-- escolhe celebrante
select pg_temp.ok('escolher celebrante cria 5 tarefas', (select criadas = 5 from ativar_pacote(:'ev', 'celebrante')));
select pg_temp.ok('escolher conclui "Decidir o tipo de cerimônia"',
  (select status = 'concluida' and concluida_por = '00000000-0000-0000-0000-00000000000c'
     from tarefas where evento_id = :'ev' and titulo = 'Decidir o tipo de cerimônia'));
select pg_temp.ok('"Contar a história" veio com 4 itens',
  (select subitens_total = 4 from tarefas_com_prazo where evento_id = :'ev' and titulo = 'Contar a história de vocês ao celebrante'));

-- casal mexe numa tarefa do celebrante antes de trocar
update tarefa_subitens set feito = true
 where texto = 'Como vocês se conheceram'
   and tarefa_id = (select id from tarefas where evento_id = :'ev' and titulo = 'Contar a história de vocês ao celebrante');

-- troca para católica
select pg_temp.ok('trocar para católica: 7 entram, 4 intactas do celebrante saem',
  (select criadas = 7 and removidas = 4 from ativar_pacote(:'ev', 'religioso_catolico')));
select pg_temp.ok('tarefa do celebrante já iniciada continua',
  exists (select 1 from tarefas where evento_id = :'ev' and titulo = 'Contar a história de vocês ao celebrante'));
select pg_temp.ok('"Pesquisar e contratar o celebrante" (intacta) saiu',
  not exists (select 1 from tarefas where evento_id = :'ev' and titulo = 'Pesquisar e contratar o celebrante'));
select pg_temp.ok('processo matrimonial veio com 5 itens',
  (select subitens_total = 5 from tarefas_com_prazo where evento_id = :'ev' and titulo = 'Abrir o processo matrimonial na paróquia'));
select pg_temp.ok('só a católica fica ativa no grupo',
  (select array_agg(ep.pacote) = '{religioso_catolico}' from evento_pacotes ep
     join pacotes p on p.codigo = ep.pacote where ep.evento_id = :'ev' and p.grupo_escolha = 'cerimonia'));

-- só no civil
select pg_temp.ok('"só no civil" remove as 7 da católica e não cria nada',
  (select criadas = 0 and removidas = 7 from ativar_pacote(:'ev', 'so_civil')));
select pg_temp.ok('"só no civil" fica registrado como escolha',
  exists (select 1 from evento_pacotes where evento_id = :'ev' and pacote = 'so_civil'));
reset role;
