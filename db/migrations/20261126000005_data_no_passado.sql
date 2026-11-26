-- Correção: a data do casamento não pode ser marcada no passado.
--
-- Vale ao criar o casamento e ao MUDAR a data. Um casamento cuja data já passou (porque o dia
-- chegou) continua editável: salvar outros campos sem mexer na data não dispara a regra.
-- "Hoje" é sempre o de America/Sao_Paulo, como no resto do app.
-- Cópias do sistema (nosso_dia.sistema = '1') e os testes que simulam a passagem do tempo
-- ficam de fora.

create or replace function public.hoje_sp()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

create or replace function public.tg_eventos_data_no_futuro()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public._eh_sistema() or new.data is null then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.data is not distinct from old.data
     and new.data_status is not distinct from old.data_status then
    return new;
  end if;

  if new.data_status = 'definida' and new.data < public.hoje_sp() then
    raise exception 'A data do casamento não pode estar no passado.'
      using errcode = 'P0001', hint = 'data_passada';
  end if;
  -- mês estimado: o mês atual ainda vale (a data é normalizada para o dia 1)
  if new.data_status = 'mes_estimado'
     and new.data < date_trunc('month', public.hoje_sp())::date then
    raise exception 'O mês do casamento não pode estar no passado.'
      using errcode = 'P0001', hint = 'data_passada';
  end if;
  return new;
end;
$$;

-- "z_" para rodar depois de eventos_normaliza (triggers BEFORE disparam em ordem alfabética),
-- que já ajustou o mês estimado para o dia 1.
drop trigger if exists z_eventos_data_no_futuro on public.eventos;
create trigger z_eventos_data_no_futuro
  before insert or update of data, data_status on public.eventos
  for each row execute function public.tg_eventos_data_no_futuro();
