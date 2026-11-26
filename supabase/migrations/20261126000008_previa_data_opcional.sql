-- Correção: previa_mudanca_data sem p_data.
--
-- Ao mudar para "Ainda não sabemos", o app chama a RPC sem p_data (o supabase-js omite valores
-- undefined). Sem valor padrão, o PostgREST não acha a função e a prévia falha. Com `default null`,
-- a chamada sem a data funciona (e os tipos gerados passam a marcar p_data como opcional).
-- O corpo da função não muda: só o parâmetro ganha o default.
do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.previa_mudanca_data(uuid, public.data_status, date)'::regprocedure)
    into v_def;
  v_def := replace(v_def, 'p_data date)', 'p_data date DEFAULT NULL::date)');
  if v_def not like '%DEFAULT NULL::date%' then
    raise exception 'previa_mudanca_data: assinatura inesperada, ajuste esta migration';
  end if;
  execute v_def;
end;
$$;
