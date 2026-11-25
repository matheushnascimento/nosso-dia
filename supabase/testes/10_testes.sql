\set ON_ERROR_STOP 1
\pset footer off
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','ana@x.com','{"nome":"Ana"}'),
 ('00000000-0000-0000-0000-00000000000b','bruno@x.com','{"nome":"Bruno"}'),
 ('00000000-0000-0000-0000-00000000000c','carla@x.com','{"nome":"Carla"}');
select 'perfis criados pelo trigger' as teste, count(*) = 3 as ok from perfis;

create function pg_temp.como(p uuid, e text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p::text, false),
         set_config('request.jwt.claims', json_build_object('sub',p,'email',e)::text, false); $$;
grant execute on function pg_temp.como(uuid,text) to authenticated, anon;
create function pg_temp.espera_erro(sql text, trecho text) returns text language plpgsql as $$
begin execute sql; return 'FALHOU (não deu erro)';
exception when others then
  return case when sqlerrm ilike '%'||trecho||'%' or coalesce(nullif(current_setting('x.h',true),''),'')<>'' then 'ok' else 'ok? erro: '||sqlerrm end;
end $$;
grant execute on function pg_temp.espera_erro(text,text) to authenticated, anon;

-- ===== Ana cria o casamento para daqui 120 dias
-- Quantas tarefas um casamento novo recebe: modelos ativos dos pacotes automáticos
-- (24 no M0; cresce com as migrations de conteúdo do M1).
select count(*) as n_tarefas from tarefa_modelos m join pacotes p on p.codigo = m.pacote
 where m.ativo and p.automatico and p.ativo \gset
select pg_temp.como('00000000-0000-0000-0000-00000000000a','ana@x.com');
set role authenticated;
select criar_evento('  Ana & Bruno ', 'definida', current_date + 120, '16:00', '18:00', 'Holambra', 'sp', 120, 4500000) as evento \gset
select 'onboarding copia as tarefas dos pacotes automáticos' as teste, count(*) = :n_tarefas as ok from tarefas;
select 'evento a 120 dias: nenhuma atrasada' as teste, count(*) filter (where grupo='atrasadas') = 0 as ok,
       count(*) filter (where grupo='comecar_agora') as comecar_agora, count(*) filter (where grupo<>'comecar_agora') as demais
  from tarefas_com_prazo;
select 'nome e UF normalizados' as teste, nome_exibicao = 'Ana & Bruno' and uf = 'SP' as ok from eventos;
select 'não cria 2º evento' as teste, pg_temp.espera_erro($$select criar_evento('X')$$, 'já participa') as ok;
select 'não altera criado_por (grant por coluna)' as teste, pg_temp.espera_erro($$update eventos set criado_por = null$$, 'permission denied') as ok;
select 'não insere tarefa com modelo_id (só RPC)' as teste,
  pg_temp.espera_erro(format($$insert into tarefas (evento_id, titulo, modelo_id) values (%L,'x',(select id from tarefa_modelos limit 1))$$, :'evento'), 'row-level security') as ok;
insert into tarefas (evento_id, titulo, categoria, offset_dias) values (:'evento', 'Escolher o bolo', 'buffet', -45);
select 'tarefa personalizada criada' as teste, count(*) = :n_tarefas + 1 as ok from tarefas;
select 'responsável precisa ser membro' as teste,
  pg_temp.espera_erro($$update tarefas set responsavel = '00000000-0000-0000-0000-00000000000c' where titulo='Escolher o bolo'$$, 'membro') as ok;

-- ===== Convite
insert into convites_parceiro (evento_id, email, convidado_por) values (:'evento', 'bruno@x.com', '00000000-0000-0000-0000-00000000000a') returning token as token_bruno \gset
select 'só 1 convite pendente' as teste,
  pg_temp.espera_erro(format($$insert into convites_parceiro (evento_id, email, convidado_por) values (%L,'z@x.com','00000000-0000-0000-0000-00000000000a')$$, :'evento'), 'duplicate') as ok;
select 'convite não pode ser forjado como aceito' as teste,
  pg_temp.espera_erro(format($$update convites_parceiro set aceito_em = now() where token = %L$$, :'token_bruno'), 'permission denied') as ok;
reset role;

-- ===== Bruno, antes de aceitar, não vê nada
select pg_temp.como('00000000-0000-0000-0000-00000000000b','bruno@x.com');
set role authenticated;
select 'não-membro não vê evento nem tarefas' as teste, (select count(*) from eventos) = 0 and (select count(*) from tarefas_com_prazo) = 0 as ok;
reset role;
-- ===== Carla tenta usar o token do Bruno
select pg_temp.como('00000000-0000-0000-0000-00000000000c','carla@x.com');
set role authenticated;
select 'token com e-mail diferente é recusado' as teste, pg_temp.espera_erro(format($$select aceitar_convite(%L)$$, :'token_bruno'), 'outro e-mail') as ok;
reset role;
-- ===== anon vê a landing do convite, mas não as tabelas
set role anon;
select 'anon lê landing do convite' as teste, nome_exibicao = 'Ana & Bruno' and situacao = 'valido' as ok from obter_convite(:'token_bruno');
select 'anon não lê tarefas' as teste, pg_temp.espera_erro($$select * from tarefas$$, 'permission denied') as ok;
select 'anon não aceita convite' as teste, pg_temp.espera_erro(format($$select aceitar_convite(%L)$$, :'token_bruno'), 'permission denied') as ok;
reset role;
-- ===== Bruno aceita
select pg_temp.como('00000000-0000-0000-0000-00000000000b','bruno@x.com');
set role authenticated;
select 'Bruno aceita convite' as teste, aceitar_convite(:'token_bruno') = :'evento' as ok;
select 'Bruno vê as mesmas tarefas e o nome da Ana' as teste,
  (select count(*) from tarefas_com_prazo) = :n_tarefas + 1 and (select count(*) from perfis) = 2 as ok;
select 'token não reutiliza' as teste, pg_temp.espera_erro(format($$select aceitar_convite(%L)$$, :'token_bruno'), 'inválido') as ok;
update tarefas set status = 'concluida' where titulo = 'Contratar o espaço';
select 'conclusão registra quem concluiu' as teste, concluida_por = '00000000-0000-0000-0000-00000000000b' and concluida_em is not null and grupo = 'concluidas' as ok
  from tarefas_com_prazo where titulo = 'Contratar o espaço';
update tarefas set status = 'pendente' where titulo = 'Contratar o espaço';
select 'desfazer limpa conclusão' as teste, concluida_por is null and concluida_em is null as ok from tarefas where titulo = 'Contratar o espaço';
update tarefas set status = 'concluida' where titulo = 'Contratar o espaço';
-- terceiro parceiro
select 'convite bloqueado com 2 parceiros' as teste, pg_temp.espera_erro(format($$insert into convites_parceiro (evento_id, email, convidado_por) values (%L,'carla@x.com','00000000-0000-0000-0000-00000000000b')$$, :'evento'), 'row-level security') as ok;
reset role;
insert into convites_parceiro (evento_id, email, convidado_por) values (:'evento', 'carla@x.com', '00000000-0000-0000-0000-00000000000b') returning token as token_carla \gset
set role authenticated;
reset role;
select pg_temp.como('00000000-0000-0000-0000-00000000000c','carla@x.com');
set role authenticated;
select '3º parceiro é bloqueado' as teste, pg_temp.espera_erro(format($$select aceitar_convite(%L)$$, :'token_carla'), '2 parceiros') as ok;
reset role;

-- ===== Mudança de data (como Ana)
select pg_temp.como('00000000-0000-0000-0000-00000000000a','ana@x.com');
set role authenticated;
update tarefas set prazo_fixo = current_date + 30 where titulo = 'Escolher o bolo';
select 'prévia: adiar 1 ano' as teste, * from previa_mudanca_data(:'evento', 'definida', current_date + 485);
select 'prévia: voltar a indefinida' as teste, * from previa_mudanca_data(:'evento', 'indefinida', null);
select prazo_efetivo as prazo_antes from tarefas_com_prazo where titulo = 'Fazer a lista preliminar de convidados' \gset
update eventos set data = current_date + 485 where id = :'evento';
select 'adiar 1 ano move prazos em 365 dias' as teste, prazo_efetivo - :'prazo_antes'::date = 365 as ok from tarefas_com_prazo where titulo = 'Fazer a lista preliminar de convidados';
select 'prazo fixo não muda' as teste, prazo_efetivo = current_date + 30 and prazo_travado as ok from tarefas_com_prazo where titulo = 'Escolher o bolo';
select 'grupos com data a 485 dias' as teste, grupo, count(*) from tarefas_com_prazo group by grupo order by 2;
update eventos set data_status = 'mes_estimado', data = current_date + 200 where id = :'evento';
select 'mês estimado: dia 1 e prazo ≈' as teste, extract(day from e.data) = 1 and e.horario_cerimonia is null and bool_or(t.prazo_aproximado) as ok
  from eventos e join tarefas_com_prazo t on t.evento_id = e.id group by e.data, e.horario_cerimonia;
update eventos set data_status = 'indefinida' where id = :'evento';
select 'indefinida: tudo sem prazo (exceto fixo/concluída)' as teste, grupo, count(*) from tarefas_com_prazo group by grupo order by 2;
reset role;

-- ===== 'atrasadas' só para tarefa que já estava no evento antes de vencer
update tarefas set criado_em = now() - interval '60 days' where titulo = 'Montar o kit do dia D';
set role authenticated;
update eventos set data_status = 'definida', data = current_date - 10 where id = :'evento';  -- kit D-3 venceu há 13 dias
select 'tarefa antiga vencida = atrasada; nova vencida = começar agora' as teste,
  (select grupo from tarefas_com_prazo where titulo='Montar o kit do dia D') = 'atrasadas'
  and (select grupo from tarefas_com_prazo where titulo='Reconfirmar todos os fornecedores') = 'comecar_agora' as ok;
select 'agradecer D+14 fica no futuro' as teste, grupo, prazo_efetivo = current_date + 4 as ok from tarefas_com_prazo where titulo='Agradecer aos convidados';
reset role;
