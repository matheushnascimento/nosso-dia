-- =============================================================================
-- Nosso Dia · M2 · #18 Orçamento por categoria e prioridades
-- Valor planejado por categoria; o contratado vem da soma dos fornecedores `contratado`.
-- A distribuição sugerida é calculada no app (src/lib/orcamento.ts) e gravada aqui.
-- =============================================================================

create table public.orcamento_categorias (
  id                  uuid primary key default gen_random_uuid(),
  evento_id           uuid not null references public.eventos (id) on delete cascade,
  -- Categorias de fornecedor (mesmo check de fornecedores.categoria) + a reserva para imprevistos.
  categoria           text not null check (categoria in (
                        'local', 'buffet', 'bebidas', 'foto_video', 'decoracao', 'musica',
                        'assessoria', 'trajes', 'beleza', 'aliancas', 'convites', 'cerimonia',
                        'outros', 'reserva')),
  planejado_centavos  bigint not null default 0 check (planejado_centavos between 0 and 100000000000),
  prioridade          smallint check (prioridade between 1 and 3),
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  constraint orcamento_categorias_unica unique (evento_id, categoria),
  -- Até 3 categorias priorizadas, cada uma com uma prioridade diferente (nulos não conflitam).
  constraint orcamento_categorias_prioridade_unica unique (evento_id, prioridade),
  constraint orcamento_categorias_reserva_sem_prioridade check (categoria <> 'reserva' or prioridade is null)
);

create trigger orcamento_categorias_atualizado_em
  before update on public.orcamento_categorias
  for each row execute function public.tg_set_atualizado_em();

create or replace function public.tg_orcamento_categorias_regras()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.evento_id <> old.evento_id then
    raise exception 'Uma categoria de orçamento não pode mudar de casamento.';
  end if;
  return new;
end;
$$;

create trigger orcamento_categorias_regras
  before update on public.orcamento_categorias
  for each row execute function public.tg_orcamento_categorias_regras();

-- -----------------------------------------------------------------------------
-- RLS: CRUD completo para membros do evento; nada para anônimos.
-- -----------------------------------------------------------------------------
alter table public.orcamento_categorias enable row level security;
revoke all on public.orcamento_categorias from anon;
grant select, insert, update, delete on public.orcamento_categorias to authenticated;

create policy orcamento_categorias_select on public.orcamento_categorias
  for select to authenticated
  using (public.eh_membro(evento_id));

create policy orcamento_categorias_insert on public.orcamento_categorias
  for insert to authenticated
  with check (public.eh_membro(evento_id));

create policy orcamento_categorias_update on public.orcamento_categorias
  for update to authenticated
  using (public.eh_membro(evento_id))
  with check (public.eh_membro(evento_id));

create policy orcamento_categorias_delete on public.orcamento_categorias
  for delete to authenticated
  using (public.eh_membro(evento_id));
