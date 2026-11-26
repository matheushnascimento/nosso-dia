-- M1 · #9 Votos dos noivos
--
-- Cada parceiro escreve os próprios votos. O texto é PRIVADO: só o autor lê e escreve.
-- O outro enxerga apenas se já estão prontos e quando foram mexidos, pela RPC status_votos.
-- Revelar os votos ao parceiro não existe no M1.
--
-- Tarefa automática "Escrever os votos" (D-30), uma por parceiro; se conclui ao marcar "pronto"
-- e reabre se a pessoa desmarcar.

-- -----------------------------------------------------------------------------
-- Tabela
-- -----------------------------------------------------------------------------
create table public.votos (
  evento_id     uuid not null references public.eventos (id) on delete cascade,
  autor_id      uuid not null references auth.users (id) on delete cascade,
  texto         text not null default '' check (char_length(texto) <= 10000),
  pronto        boolean not null default false,
  atualizado_em timestamptz not null default now(),
  primary key (evento_id, autor_id),
  constraint votos_pronto_com_texto check (not pronto or char_length(btrim(texto)) > 0)
);

alter table public.votos enable row level security;
revoke all on public.votos from public, anon, authenticated;

-- Só o autor, e só enquanto é membro do casamento. Escrita passa pela RPC salvar_votos.
grant select on public.votos to authenticated;
create policy votos_select_autor on public.votos
  for select to authenticated
  using (autor_id = (select auth.uid()) and public.eh_membro(evento_id));

-- -----------------------------------------------------------------------------
-- RPC · salvar_votos (salvamento automático do editor e "marcar como prontos")
-- -----------------------------------------------------------------------------
create or replace function public.salvar_votos(
  p_evento_id uuid,
  p_texto     text,
  p_pronto    boolean default null   -- null = mantém
)
returns table (pronto boolean, atualizado_em timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;
  if not public.eh_membro(p_evento_id) then
    raise exception 'Você não participa deste casamento.' using errcode = '42501';
  end if;
  if char_length(coalesce(p_texto, '')) > 10000 then
    raise exception 'Os votos passaram do limite de 10.000 caracteres.'
      using errcode = 'P0001', hint = 'votos_longos';
  end if;
  if p_pronto and char_length(btrim(coalesce(p_texto, ''))) = 0 then
    raise exception 'Escreva os votos antes de marcar como prontos.'
      using errcode = 'P0001', hint = 'votos_vazios';
  end if;

  return query
  insert into public.votos as v (evento_id, autor_id, texto, pronto)
  values (p_evento_id, v_uid, coalesce(p_texto, ''), coalesce(p_pronto, false))
  on conflict (evento_id, autor_id) do update
     set texto         = excluded.texto,
         -- apagar todo o texto desmarca "pronto"
         pronto        = case when char_length(btrim(excluded.texto)) = 0 then false
                              else coalesce(p_pronto, v.pronto) end,
         atualizado_em = case when (v.texto, v.pronto) is distinct from
                                   (excluded.texto, coalesce(p_pronto, v.pronto))
                              then now() else v.atualizado_em end
  returning v.pronto, v.atualizado_em;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC · status_votos (painel): de cada membro, só pronto/atualizado_em. Nunca o texto.
-- -----------------------------------------------------------------------------
create or replace function public.status_votos(p_evento_id uuid)
returns table (autor_id uuid, pronto boolean, comecou boolean, atualizado_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.usuario_id,
         coalesce(v.pronto, false),
         coalesce(char_length(btrim(v.texto)) > 0, false),
         v.atualizado_em
    from public.membros m
    left join public.votos v on v.evento_id = m.evento_id and v.autor_id = m.usuario_id
   where m.evento_id = p_evento_id
     and public.eh_membro(p_evento_id);
$$;

revoke execute on function public.salvar_votos(uuid, text, boolean), public.status_votos(uuid)
  from public, anon;
grant execute on function public.salvar_votos(uuid, text, boolean), public.status_votos(uuid)
  to authenticated;

-- -----------------------------------------------------------------------------
-- "pronto" conclui (ou reabre) a tarefa "Escrever os votos" de quem escreveu
-- -----------------------------------------------------------------------------
create or replace function public.tg_votos_tarefa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.pronto is not distinct from old.pronto then
    return null;
  end if;
  if tg_op = 'INSERT' and not new.pronto then
    return null;
  end if;

  update public.tarefas t
     set status = case when new.pronto then 'concluida' else 'pendente' end::public.status_tarefa
    from public.tarefa_modelos m
   where m.id = t.modelo_id
     and m.codigo = 'vt_escrever'
     and t.evento_id = new.evento_id
     -- a de cada um; se o casal ainda não se dividiu, a compartilhada
     and (t.parceiro = new.autor_id
          or (t.parceiro is null and (t.responsavel is null or t.responsavel = new.autor_id)))
     and t.status <> case when new.pronto then 'concluida' else 'pendente' end::public.status_tarefa;
  return null;
end;
$$;

revoke execute on function public.tg_votos_tarefa() from public, anon, authenticated;

create trigger votos_tarefa
  after insert or update of pronto on public.votos
  for each row execute function public.tg_votos_tarefa();

-- -----------------------------------------------------------------------------
-- Link no subitem "Votos impressos" do kit do dia D
-- -----------------------------------------------------------------------------
alter table public.tarefa_modelo_subitens
  add column link text check (link ~ '^/[a-z0-9/_-]*$');

update public.tarefa_modelo_subitens s
   set link = '/votos'
  from public.tarefa_modelos m
 where m.id = s.modelo_id and m.codigo = 'dd_itens' and s.texto = 'Votos impressos';

-- -----------------------------------------------------------------------------
-- Conteúdo
-- -----------------------------------------------------------------------------
insert into public.pacotes (codigo, nome, descricao, automatico, ordem) values
  ('votos', 'Votos', 'Os votos de cada um, escritos em particular.', true, 70);

insert into public.tarefa_modelos (codigo, pacote, titulo, descricao, categoria, offset_dias, ordem, por_parceiro) values
  ('vt_escrever', 'votos', 'Escrever os votos',
   'Em Votos, cada um escreve os seus em particular: o outro só vê se já estão prontos. Marque como prontos para concluir esta tarefa.',
   'cerimonia', -30, 165, true);

select public._aplicar_pacote_em_todos('votos');
