-- Dados criados ANTES da migration do M1 (rodada B de testes/rodar.sh),
-- para testar o backfill em casamentos que já existem.
\set ON_ERROR_STOP 1

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a', 'ana@x.com',   '{"nome":"Ana"}'),
 ('00000000-0000-0000-0000-00000000000c', 'carla@x.com', '{"nome":"Carla"}');

-- Ana: casamento daqui a 120 dias, com "Reconfirmar fornecedores" já concluída
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
select criar_evento('Ana & Bruno', 'definida', current_date + 120);
update tarefas set status = 'concluida' where titulo = 'Reconfirmar todos os fornecedores';
reset role;

-- Carla: outro casamento
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
set role authenticated;
select criar_evento('Carla & Davi', 'indefinida');
reset role;
