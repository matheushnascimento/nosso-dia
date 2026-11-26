-- =============================================================================
-- Nosso Dia · M2 · #17 Infra de fornecedores
-- Cadastro de fornecedores do casal, da pesquisa à contratação.
-- Os dois parceiros leem e editam (RLS igual às tarefas).
-- =============================================================================

create type public.status_fornecedor as enum (
  'pesquisando', 'orcamento_pedido', 'orcamento_recebido', 'visita', 'contratado', 'descartado'
);

create table public.fornecedores (
  id                          uuid primary key default gen_random_uuid(),
  evento_id                   uuid not null references public.eventos (id) on delete cascade,
  -- Mesma lista do orçamento (src/lib/rotulos.ts · CATEGORIAS_FORNECEDOR). Chaves iguais às de tarefas.categoria.
  categoria                   text not null check (categoria in (
                                'local', 'buffet', 'bebidas', 'foto_video', 'decoracao', 'musica',
                                'assessoria', 'trajes', 'beleza', 'aliancas', 'convites', 'cerimonia',
                                'outros')),
  nome                        text not null check (char_length(btrim(nome)) between 1 and 120),
  telefone                    text check (char_length(telefone) <= 40),
  email                       text check (char_length(email) <= 254),
  instagram                   text check (char_length(instagram) <= 60),
  site                        text check (char_length(site) <= 300),
  status                      public.status_fornecedor not null default 'pesquisando',
  valor_orcado_centavos       bigint check (valor_orcado_centavos between 0 and 100000000000),
  valor_contratado_centavos   bigint check (valor_contratado_centavos between 0 and 100000000000),
  notas                       text check (char_length(notas) <= 5000),
  -- Campos próprios da categoria (#19). Sempre um objeto.
  detalhes                    jsonb not null default '{}'::jsonb check (jsonb_typeof(detalhes) = 'object'),
  criado_em                   timestamptz not null default now(),
  atualizado_em               timestamptz not null default now(),
  constraint fornecedores_contratado_com_valor
    check (status <> 'contratado' or valor_contratado_centavos is not null)
);

create index fornecedores_evento_idx on public.fornecedores (evento_id, categoria);

create trigger fornecedores_atualizado_em
  before update on public.fornecedores
  for each row execute function public.tg_set_atualizado_em();

create or replace function public.tg_fornecedores_regras()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.evento_id <> old.evento_id then
    raise exception 'Um fornecedor não pode mudar de casamento.';
  end if;
  return new;
end;
$$;

create trigger fornecedores_regras
  before update on public.fornecedores
  for each row execute function public.tg_fornecedores_regras();

-- -----------------------------------------------------------------------------
-- RLS: CRUD completo para membros do evento; nada para anônimos.
-- -----------------------------------------------------------------------------
alter table public.fornecedores enable row level security;
revoke all on public.fornecedores from anon;
grant select, insert, update, delete on public.fornecedores to authenticated;

create policy fornecedores_select on public.fornecedores
  for select to authenticated
  using (public.eh_membro(evento_id));

create policy fornecedores_insert on public.fornecedores
  for insert to authenticated
  with check (public.eh_membro(evento_id));

create policy fornecedores_update on public.fornecedores
  for update to authenticated
  using (public.eh_membro(evento_id))
  with check (public.eh_membro(evento_id));

create policy fornecedores_delete on public.fornecedores
  for delete to authenticated
  using (public.eh_membro(evento_id));
