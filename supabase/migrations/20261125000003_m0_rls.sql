-- =============================================================================
-- Nosso Dia · M0 · Fundação
-- 03 · Row Level Security e permissões
-- Escrita estrutural (criar evento, entrar como membro) só via RPC.
-- =============================================================================

alter table public.perfis            enable row level security;
alter table public.eventos           enable row level security;
alter table public.membros           enable row level security;
alter table public.convites_parceiro enable row level security;
alter table public.tarefa_modelos    enable row level security;
alter table public.tarefas           enable row level security;

-- Nada para anônimos nas tabelas.
revoke all on public.perfis, public.eventos, public.membros, public.convites_parceiro,
              public.tarefa_modelos, public.tarefas, public.tarefas_com_prazo
  from anon;

-- -----------------------------------------------------------------------------
-- perfis: vejo o meu e o de quem divide casamento comigo; edito só o meu
-- -----------------------------------------------------------------------------
create policy perfis_select on public.perfis
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.membros m
       where m.usuario_id = perfis.id and public.eh_membro(m.evento_id)
    )
  );

create policy perfis_update on public.perfis
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke insert, delete on public.perfis from authenticated;
revoke update on public.perfis from authenticated;
grant  update (nome) on public.perfis to authenticated;

-- -----------------------------------------------------------------------------
-- eventos: membros leem e editam; criação só por criar_evento()
-- -----------------------------------------------------------------------------
create policy eventos_select on public.eventos
  for select to authenticated
  using (public.eh_membro(id));

create policy eventos_update on public.eventos
  for update to authenticated
  using (public.eh_membro(id))
  with check (public.eh_membro(id));

revoke insert, delete on public.eventos from authenticated;
revoke update on public.eventos from authenticated;
grant  update (nome_exibicao, data_status, data, horario_cerimonia, horario_festa,
               cidade, uf, convidados_estimados, orcamento_total_centavos)
  on public.eventos to authenticated;

-- -----------------------------------------------------------------------------
-- membros: leitura para quem é do evento; escrita só por RPC
-- -----------------------------------------------------------------------------
create policy membros_select on public.membros
  for select to authenticated
  using (public.eh_membro(evento_id));

revoke insert, update, delete on public.membros from authenticated;

-- -----------------------------------------------------------------------------
-- convites_parceiro: membros criam, veem e cancelam
-- -----------------------------------------------------------------------------
create policy convites_select on public.convites_parceiro
  for select to authenticated
  using (public.eh_membro(evento_id));

create policy convites_insert on public.convites_parceiro
  for insert to authenticated
  with check (
    public.eh_membro(evento_id)
    and convidado_por = (select auth.uid())
    and aceito_em is null and aceito_por is null and cancelado_em is null
    and (select count(*) from public.membros m
          where m.evento_id = convites_parceiro.evento_id and m.papel = 'parceiro') < 2
  );

create policy convites_update on public.convites_parceiro
  for update to authenticated
  using (public.eh_membro(evento_id) and aceito_em is null)
  with check (public.eh_membro(evento_id));

revoke delete on public.convites_parceiro from authenticated;
revoke update on public.convites_parceiro from authenticated;
grant  update (cancelado_em) on public.convites_parceiro to authenticated;

-- -----------------------------------------------------------------------------
-- tarefa_modelos: catálogo só leitura
-- -----------------------------------------------------------------------------
create policy tarefa_modelos_select on public.tarefa_modelos
  for select to authenticated
  using (ativo);

revoke insert, update, delete on public.tarefa_modelos from authenticated;

-- -----------------------------------------------------------------------------
-- tarefas: CRUD completo para membros do evento
-- -----------------------------------------------------------------------------
create policy tarefas_select on public.tarefas
  for select to authenticated
  using (public.eh_membro(evento_id));

create policy tarefas_insert on public.tarefas
  for insert to authenticated
  with check (public.eh_membro(evento_id) and modelo_id is null);  -- cópia de modelo só via RPC

create policy tarefas_update on public.tarefas
  for update to authenticated
  using (public.eh_membro(evento_id))
  with check (public.eh_membro(evento_id));

create policy tarefas_delete on public.tarefas
  for delete to authenticated
  using (public.eh_membro(evento_id));

grant select on public.tarefas_com_prazo to authenticated;

-- -----------------------------------------------------------------------------
-- Funções: ninguém executa por padrão; liberamos o necessário
-- -----------------------------------------------------------------------------
revoke execute on function
  public.eh_membro(uuid),
  public.criar_evento(text, public.data_status, date, time, time, text, text, integer, bigint),
  public.previa_mudanca_data(uuid, public.data_status, date),
  public.obter_convite(uuid),
  public.aceitar_convite(uuid),
  public.tg_auth_novo_usuario()
from public, anon, authenticated;

grant execute on function public.eh_membro(uuid)                                   to authenticated;
grant execute on function public.criar_evento(text, public.data_status, date, time, time,
                                              text, text, integer, bigint)          to authenticated;
grant execute on function public.previa_mudanca_data(uuid, public.data_status, date) to authenticated;
grant execute on function public.aceitar_convite(uuid)                              to authenticated;
grant execute on function public.obter_convite(uuid)                                to anon, authenticated;
