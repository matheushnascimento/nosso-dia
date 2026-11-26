-- Testes da #26 · tabelas do Better Auth (rodada C).
\set ON_ERROR_STOP 1
\pset footer off
\pset tuples_only on
\pset format unaligned

create function pg_temp.ok(teste text, condicao boolean) returns text language sql as $$
  select case when condicao then 'ok    ' else 'FALHOU' end || ' · ' || teste; $$;
grant execute on function pg_temp.ok(text, boolean) to authenticated, anon;
create function pg_temp.erro(sql text) returns text language plpgsql as $$
declare e text;
begin execute sql; return null;
exception when others then get stacked diagnostics e = returned_sqlstate; return e;
end $$;
grant execute on function pg_temp.erro(text) to authenticated, anon;

-- o Better Auth (como dono do banco) cria a conta
insert into ba_user (id, name, email, "emailVerified")
values ('00000000-0000-0000-0000-0000000000e1', '  Lia Souza  ', 'Lia@Teste.com', false);
insert into ba_session ("expiresAt", token, "updatedAt", "userId")
values (now() + interval '1 day', 'token-secreto', now(), '00000000-0000-0000-0000-0000000000e1');
insert into ba_account ("accountId", "providerId", "userId", password, "updatedAt")
values ('00000000-0000-0000-0000-0000000000e1', 'credential', '00000000-0000-0000-0000-0000000000e1', 'hash-da-senha', now());

select pg_temp.ok('criar em ba_user cria auth.users (mesmo id, e-mail minúsculo, nome)',
  exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000e1'
           and email = 'lia@teste.com' and raw_user_meta_data ->> 'nome' = 'Lia Souza'));
select pg_temp.ok('...e o perfil, pelo trigger do M0',
  (select nome from perfis where id = '00000000-0000-0000-0000-0000000000e1') = 'Lia Souza');

update ba_user set email = 'lia.nova@teste.com' where id = '00000000-0000-0000-0000-0000000000e1';
select pg_temp.ok('trocar o e-mail atualiza auth.users',
  (select email from auth.users where id = '00000000-0000-0000-0000-0000000000e1') = 'lia.nova@teste.com');

-- os papéis do app não enxergam nada do login
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false) \g /dev/null
set role authenticated;
select pg_temp.ok('logado não lê sessões, contas (senhas), usuários nem verificações',
  pg_temp.erro('select * from ba_session') = '42501' and pg_temp.erro('select * from ba_account') = '42501'
  and pg_temp.erro('select * from ba_user') = '42501' and pg_temp.erro('select * from ba_verification') = '42501');
select pg_temp.ok('logado não cria usuário nem sessão',
  pg_temp.erro($$insert into ba_user (name, email, "emailVerified") values ('x', 'x@x.com', true)$$) = '42501');
reset role;
set role anon;
select pg_temp.ok('visitante também não',
  pg_temp.erro('select * from ba_session') = '42501' and pg_temp.erro('select * from ba_rate_limit') = '42501');
reset role;

delete from ba_user where id = '00000000-0000-0000-0000-0000000000e1';
select pg_temp.ok('apagar a conta apaga auth.users, perfil, sessões e contas em cascata',
  not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000e1')
  and not exists (select 1 from perfis where id = '00000000-0000-0000-0000-0000000000e1')
  and not exists (select 1 from ba_session where "userId" = '00000000-0000-0000-0000-0000000000e1')
  and not exists (select 1 from ba_account where "userId" = '00000000-0000-0000-0000-0000000000e1'));
