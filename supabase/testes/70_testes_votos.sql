-- Testes do M1 · #9 votos (rodada C). Ana e Bruno já são um casal (50_*); Hugo está sozinho (60_*).
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
create function pg_temp.hint(sql text) returns text language plpgsql as $$
declare h text; e text;
begin execute sql; return null;
exception when others then get stacked diagnostics h = pg_exception_hint, e = returned_sqlstate;
  return coalesce(nullif(h, ''), e);
end $$;
grant execute on function pg_temp.hint(text) to authenticated;
-- quantas linhas uma consulta devolve, como o usuário atual
create function pg_temp.linhas(sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute format('select count(*) from (%s) x', sql) into n; return n; end $$;
grant execute on function pg_temp.linhas(text) to authenticated;
create function pg_temp.tarefa_votos(ev uuid, quem uuid) returns text language sql as $$
  select t.status::text from tarefas t join tarefa_modelos m on m.id = t.modelo_id
   where m.codigo = 'vt_escrever' and t.evento_id = ev and t.parceiro = quem $$;
grant execute on function pg_temp.tarefa_votos(uuid, uuid) to authenticated;

select id as ev from eventos where nome_exibicao = 'Ana & Bruno' \gset
select id as hugo_ev from eventos where nome_exibicao = 'Hugo & Iris' \gset
\set ana   '00000000-0000-0000-0000-00000000000a'
\set bruno '00000000-0000-0000-0000-00000000000b'
\set carla '00000000-0000-0000-0000-00000000000c'
\set hugo  '00000000-0000-0000-0000-0000000000d1'

-- ------------------------------------------------------------------ tarefa automática
select pg_temp.ok('casal: uma "Escrever os votos" para cada um, D-30',
  (select count(*) = 2 and bool_and(t.responsavel = t.parceiro) and bool_and(t.offset_dias = -30)
     from tarefas t join tarefa_modelos m on m.id = t.modelo_id
    where m.codigo = 'vt_escrever' and t.evento_id = :'ev'));
select pg_temp.ok('kit do dia D: "Votos impressos" aponta para /votos',
  (select link = '/votos' from tarefa_modelo_subitens where texto = 'Votos impressos'));

-- ------------------------------------------------------------------ Ana escreve
select pg_temp.como(:'ana', 'ana@x.com') \g /dev/null
set role authenticated;
select pg_temp.ok('Ana salva um rascunho',
  pg_temp.hint(format($$select salvar_votos(%L, 'Prometo te amar, Bruno, segredo da Ana')$$, :'ev')) is null);
select pg_temp.ok('não marca como pronto com texto vazio (hint votos_vazios)',
  pg_temp.hint(format($$select salvar_votos(%L, '   ', true)$$, :'ev')) = 'votos_vazios');
select pg_temp.ok('...e o rascunho anterior continua lá',
  (select texto from votos where autor_id = :'ana') like 'Prometo%');
select pg_temp.ok('Ana marca como prontos e a tarefa dela conclui',
  (select pronto from salvar_votos(:'ev', 'Prometo te amar, Bruno, segredo da Ana', true))
  and pg_temp.tarefa_votos(:'ev', :'ana') = 'concluida'
  and pg_temp.tarefa_votos(:'ev', :'bruno') = 'pendente');
select pg_temp.ok('salvar o texto sem mexer no "pronto" mantém pronto',
  (select pronto from salvar_votos(:'ev', 'Prometo te amar, Bruno, segredo da Ana!')));
select pg_temp.ok('passar do limite de 10.000 caracteres é recusado',
  pg_temp.hint(format($$select salvar_votos(%L, repeat('a', 10001))$$, :'ev')) = 'votos_longos');
select pg_temp.ok('não escreve direto na tabela',
  pg_temp.hint(format($$insert into votos (evento_id, autor_id, texto) values (%L, %L, 'x')$$, :'ev', :'ana')) = '42501'
  and pg_temp.hint($$update votos set texto = 'x'$$) = '42501');
reset role;

-- ------------------------------------------------------------------ Bruno não lê o texto da Ana
select pg_temp.como(:'bruno', 'bruno@x.com') \g /dev/null
set role authenticated;
select pg_temp.ok('tabela: Bruno não vê a linha da Ana',
  pg_temp.linhas('select * from votos') = 0);
select pg_temp.ok('RPC status_votos: vê que a Ana está pronta, sem texto',
  (select pronto and comecou from status_votos(:'ev') where autor_id = :'ana'));
select pg_temp.ok('nenhuma função ou view pública devolve o texto (procura o segredo no retorno)',
  not exists (select 1 from status_votos(:'ev') s where s::text like '%segredo%'));
select pg_temp.ok('salvar_votos do Bruno grava só os dele, não sobrescreve os da Ana',
  pg_temp.hint(format($$select salvar_votos(%L, 'Votos do Bruno')$$, :'ev')) is null);
reset role;
select pg_temp.ok('...conferindo como superusuário: 2 linhas, a da Ana intacta',
  (select count(*) from votos where evento_id = :'ev') = 2
  and (select texto from votos where autor_id = :'ana') = 'Prometo te amar, Bruno, segredo da Ana!');

select pg_temp.ok('catálogo: nenhuma view lê a tabela votos',
  not exists (select 1 from pg_depend d join pg_rewrite r on r.oid = d.objid
               where d.refobjid = 'public.votos'::regclass and r.ev_class <> 'public.votos'::regclass));
select pg_temp.ok('catálogo: só salvar_votos e status_votos tocam votos, e nenhuma devolve texto',
  (select array_agg(p.proname::text order by p.proname) from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prosrc ~ 'public\.votos'
      and p.proname not like 'tg\_%') = array['salvar_votos', 'status_votos']
  and not exists (select 1 from pg_proc p where p.proname in ('salvar_votos', 'status_votos')
                   and 'texto' = any (p.proargnames) and p.proargmodes is not null
                   and p.proargmodes[array_position(p.proargnames, 'texto')] = 't'));

-- ------------------------------------------------------------------ fora do casal
select pg_temp.como(:'carla', 'carla@x.com') \g /dev/null
set role authenticated;
select pg_temp.ok('Carla (outro casamento) não vê status nem grava no casamento da Ana',
  pg_temp.linhas(format('select * from status_votos(%L)', :'ev')) = 0
  and pg_temp.hint(format($$select salvar_votos(%L, 'intrusa')$$, :'ev')) = '42501');
reset role;
select pg_temp.como('00000000-0000-0000-0000-000000000000', 'x@x.com') \g /dev/null
set role anon;
select pg_temp.ok('anônimo não acessa a tabela nem as funções',
  pg_temp.hint('select * from votos') = '42501'
  and pg_temp.hint(format($$select * from status_votos(%L)$$, :'ev')) = '42501');
reset role;

-- ------------------------------------------------------------------ desmarcar reabre
select pg_temp.como(:'ana', 'ana@x.com') \g /dev/null
set role authenticated;
select pg_temp.ok('Ana desmarca "pronto": a tarefa dela reabre',
  not (select pronto from salvar_votos(:'ev', 'Prometo te amar, Bruno, segredo da Ana!', false))
  and pg_temp.tarefa_votos(:'ev', :'ana') = 'pendente');
reset role;

-- ------------------------------------------------------------------ casal ainda sem parceiro
select pg_temp.como(:'hugo', 'hugo@teste.com') \g /dev/null
set role authenticated;
select pronto as hugo_pronto from salvar_votos(:'hugo_ev', 'Votos do Hugo', true) \gset
select pg_temp.ok('Hugo sozinho: tarefa compartilhada conclui quando ele marca pronto',
  :'hugo_pronto'::boolean
  and (select t.status = 'concluida' from tarefas t join tarefa_modelos m on m.id = t.modelo_id
        where m.codigo = 'vt_escrever' and t.evento_id = :'hugo_ev'));
reset role;
