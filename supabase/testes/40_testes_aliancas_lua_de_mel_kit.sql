-- Testes do M1 · #4 alianças · #7 lua de mel · #8 kit do dia D (rodada C).
-- Dados de 15_dados_pre_m1.sql: Ana concluiu "Encomendar as alianças" antes do M1;
-- Carla renomeou a tarefa da lua de mel antes do M1.
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

select id as ana   from eventos where nome_exibicao = 'Ana & Bruno'  \gset
select id as carla from eventos where nome_exibicao = 'Carla & Davi' \gset

-- ------------------------------------------------------------------ catálogo
select pg_temp.ok('3 pacotes automáticos novos',
  (select count(*) from pacotes where codigo in ('aliancas', 'lua_de_mel', 'dia_d') and automatico and ativo) = 3);
select pg_temp.ok('modelos substituídos do M0 foram desativados',
  (select count(*) from tarefa_modelos where codigo in ('comprar_aliancas', 'reservar_lua_de_mel', 'kit_dia_d') and not ativo) = 3);
select pg_temp.ok('kit tem 15 itens e "Separar os itens do dia" tem 6',
  (select count(*) from tarefa_modelo_subitens s join tarefa_modelos m on m.id = s.modelo_id where m.codigo = 'dd_kit') = 15
  and (select count(*) from tarefa_modelo_subitens s join tarefa_modelos m on m.id = s.modelo_id where m.codigo = 'dd_itens') = 6);

-- ------------------------------------------------------------------ casamentos existentes
select pg_temp.ok('nenhum casamento ficou com tarefa de modelo desativado',
  not exists (select 1 from tarefas t join tarefa_modelos m on m.id = t.modelo_id where not m.ativo));
select pg_temp.ok('nenhuma tarefa duplicada por modelo',
  not exists (select 1 from tarefas where modelo_id is not null group by evento_id, modelo_id having count(*) > 1));
select pg_temp.ok('Ana: 15 tarefas dos 3 pacotes (as do M0 absorvidas, nenhuma a mais)',
  (select count(*) from tarefas t join tarefa_modelos m on m.id = t.modelo_id
    where t.evento_id = :'ana' and m.pacote in ('aliancas', 'lua_de_mel', 'dia_d')) = 15);

-- #4: quem já tinha encomendado as alianças não recebe a encomenda como pendente
select pg_temp.ok('Ana: "Encomendar as alianças" continua concluída (absorvida pelo modelo novo)',
  (select t.status = 'concluida' from tarefas t join tarefa_modelos m on m.id = t.modelo_id
    where t.evento_id = :'ana' and m.codigo = 'al_encomendar'));
select pg_temp.ok('tarefa concluída absorvida não ganha itens',
  (select subitens_total = 0 from tarefas_com_prazo where evento_id = :'ana' and titulo = 'Encomendar as alianças'));

-- #8: kit intacto é atualizado para o modelo novo, com os itens
select pg_temp.ok('Ana: kit atualizado para "Montar o kit de emergência" com 15 itens',
  (select subitens_total = 15 from tarefas_com_prazo where evento_id = :'ana' and titulo = 'Montar o kit de emergência'));
select pg_temp.ok('"Montar o kit do dia D" (título antigo) não existe mais',
  not exists (select 1 from tarefas where titulo = 'Montar o kit do dia D'));

-- #7: edição anterior ao M1 é preservada
select pg_temp.ok('Carla: lua de mel renomeada antes do M1 mantém o título',
  (select t.titulo = 'Lua de mel em Portugal' and t.editada
     from tarefas t join tarefa_modelos m on m.id = t.modelo_id
    where t.evento_id = :'carla' and m.codigo = 'lm_reservas'));
select pg_temp.ok('Carla: documentos de viagem com 5 itens e guia',
  (select subitens_total = 5 and guia = 'documentos-de-viagem'
     from tarefas_com_prazo where evento_id = :'carla' and titulo = 'Conferir os documentos de viagem'));

select pg_temp.ok('Ana (casamento em 120 dias): nenhuma tarefa nova ficou atrasada',
  not exists (select 1 from tarefas_com_prazo where evento_id = :'ana' and grupo = 'atrasadas'));
select pg_temp.ok('Ana: tarefas novas já vencidas caem em "Começar agora"',
  (select grupo = 'comecar_agora' from tarefas_com_prazo where evento_id = :'ana' and titulo = 'Definir destino, datas e orçamento da lua de mel'));

-- ------------------------------------------------------------------ casamento novo
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000f', 'fabi@x.com');
select pg_temp.como('00000000-0000-0000-0000-00000000000f');
set role authenticated;
select criar_evento('Fabi & Gui', 'definida', current_date + 400) as novo \gset
select pg_temp.ok('casamento novo: 15 tarefas dos 3 pacotes',
  (select count(*) from tarefas t join tarefa_modelos m on m.id = t.modelo_id
    where t.evento_id = :'novo' and m.pacote in ('aliancas', 'lua_de_mel', 'dia_d')) = 15);
select pg_temp.ok('casamento novo: pacotes automáticos registrados',
  (select array_agg(pacote) @> '{aliancas,base,dia_d,lua_de_mel}' from evento_pacotes where evento_id = :'novo'));
select pg_temp.ok('casamento novo: kit com 15 itens, nenhum marcado',
  (select subitens_total = 15 and subitens_feitos = 0 from tarefas_com_prazo where evento_id = :'novo' and titulo = 'Montar o kit de emergência'));

-- #8: o casal adiciona e remove itens do kit
select id as kit from tarefas where evento_id = :'novo' and titulo = 'Montar o kit de emergência' \gset
insert into tarefa_subitens (tarefa_id, texto, ordem) values (:'kit', 'Óculos reserva', 99);
delete from tarefa_subitens where tarefa_id = :'kit' and texto = 'Guarda-chuva';
select pg_temp.ok('casal adiciona e remove itens do kit (continua 15)',
  (select subitens_total = 15 from tarefas_com_prazo where id = :'kit')
  and exists (select 1 from tarefa_subitens where tarefa_id = :'kit' and texto = 'Óculos reserva')
  and not exists (select 1 from tarefa_subitens where tarefa_id = :'kit' and texto = 'Guarda-chuva'));
reset role;
