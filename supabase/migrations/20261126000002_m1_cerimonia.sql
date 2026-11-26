-- =============================================================================
-- Nosso Dia · M1 · #3 Cerimônia religiosa ou com celebrante
-- =============================================================================
-- Grupo de escolha `cerimonia`: o casal escolhe um caminho e recebe o checklist dele.
-- Escolher qualquer opção conclui a tarefa do M0 "Decidir o tipo de cerimônia".
-- Pacotes de escolha NÃO são aplicados a casamentos existentes: o casal escolhe.
--
-- Os textos evitam afirmar exigências como regra universal: variam por paróquia,
-- diocese, igreja e tradição.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Pacotes podem concluir tarefas ao serem ativados (ex.: a decisão que eles representam)
-- -----------------------------------------------------------------------------
alter table public.pacotes add column conclui text[] not null default '{}';

comment on column public.pacotes.conclui is
  'Códigos de tarefa_modelos que são marcados como concluídos quando o pacote é ativado.';

-- _copiar_pacote ganha o passo 5 (concluir). Idêntica à versão da #1 nos passos 1–4.
create or replace function public._copiar_pacote(p_evento_id uuid, p_pacote text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_modelo  public.tarefa_modelos%rowtype;
  v_antiga  uuid;
  v_criadas integer;
begin
  perform set_config('nosso_dia.sistema', '1', true);

  -- 1. absorver tarefas de modelos substituídos
  for v_modelo in
    select * from public.tarefa_modelos
     where pacote = p_pacote and ativo and cardinality(substitui) > 0
  loop
    continue when exists (
      select 1 from public.tarefas where evento_id = p_evento_id and modelo_id = v_modelo.id
    );

    select t.id into v_antiga
      from public.tarefas t
      join public.tarefa_modelos velho on velho.id = t.modelo_id
     where t.evento_id = p_evento_id
       and velho.codigo = any (v_modelo.substitui)
     order by (t.status = 'concluida') desc, t.criado_em
     limit 1;

    if v_antiga is not null then
      update public.tarefas t
         set modelo_id   = v_modelo.id,
             titulo      = case when t.status = 'pendente' and not t.editada then v_modelo.titulo      else t.titulo      end,
             descricao   = case when t.status = 'pendente' and not t.editada then v_modelo.descricao   else t.descricao   end,
             categoria   = case when t.status = 'pendente' and not t.editada then v_modelo.categoria   else t.categoria   end,
             offset_dias = case when t.status = 'pendente' and not t.editada then v_modelo.offset_dias else t.offset_dias end,
             ordem       = case when t.status = 'pendente' and not t.editada then v_modelo.ordem       else t.ordem       end
       where t.id = v_antiga;
    end if;
  end loop;

  -- 2. criar o que falta
  insert into public.tarefas (evento_id, modelo_id, titulo, descricao, categoria, offset_dias, ordem)
  select p_evento_id, m.id, m.titulo, m.descricao, m.categoria, m.offset_dias, m.ordem
    from public.tarefa_modelos m
   where m.pacote = p_pacote and m.ativo
  on conflict (evento_id, modelo_id) where modelo_id is not null do nothing;
  get diagnostics v_criadas = row_count;

  -- 3. subitens
  insert into public.tarefa_subitens (tarefa_id, modelo_subitem_id, texto, ordem)
  select t.id, s.id, s.texto, s.ordem
    from public.tarefas t
    join public.tarefa_modelos m on m.id = t.modelo_id
    join public.tarefa_modelo_subitens s on s.modelo_id = m.id
   where t.evento_id = p_evento_id
     and m.pacote = p_pacote
     and t.status = 'pendente'
     and not t.editada
     and not exists (select 1 from public.tarefa_subitens x where x.tarefa_id = t.id);

  -- 4. registrar
  insert into public.evento_pacotes (evento_id, pacote, ativado_por)
  values (p_evento_id, p_pacote, (select auth.uid()))
  on conflict (evento_id, pacote) do nothing;

  -- 5. concluir as tarefas que a ativação do pacote resolve
  update public.tarefas t
     set status = 'concluida'
    from public.tarefa_modelos m, public.pacotes p
   where m.id = t.modelo_id
     and p.codigo = p_pacote
     and m.codigo = any (p.conclui)
     and t.evento_id = p_evento_id
     and t.status = 'pendente';

  perform set_config('nosso_dia.sistema', '', true);
  return v_criadas;
end;
$$;

revoke execute on function public._copiar_pacote(uuid, text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Pacotes do grupo `cerimonia`
-- -----------------------------------------------------------------------------
insert into public.pacotes (codigo, nome, descricao, grupo_escolha, ordem, conclui) values
  ('religioso_catolico',   'Religiosa católica',
   'Igreja, curso de noivos e processo matrimonial na paróquia.',
   'cerimonia', 100, '{decidir_cerimonia}'),
  ('religioso_evangelico', 'Religiosa evangélica',
   'Conversa com o pastor, aconselhamento e roteiro da cerimônia.',
   'cerimonia', 101, '{decidir_cerimonia}'),
  ('religioso_outro',      'Outra religião',
   'Tarefas gerais para alinhar com a liderança religiosa.',
   'cerimonia', 102, '{decidir_cerimonia}'),
  ('celebrante',           'Com celebrante',
   'Cerimônia personalizada. Não tem efeito civil: o civil é feito à parte, no cartório.',
   'cerimonia', 103, '{decidir_cerimonia}'),
  ('so_civil',             'Só no civil',
   'Sem cerimônia religiosa ou com celebrante.',
   'cerimonia', 104, '{decidir_cerimonia}');

insert into public.tarefa_modelos (codigo, pacote, titulo, descricao, categoria, offset_dias, ordem) values
  -- católica
  ('cat_reservar_igreja', 'religioso_catolico', 'Reservar a igreja e a data',
   'Igrejas mais procuradas fecham a agenda com bastante antecedência. Pergunte também sobre taxas, horários e o que é permitido na decoração.',
   'cerimonia', -300, 300),
  ('cat_curso_noivos', 'religioso_catolico', 'Fazer o curso de noivos',
   'Muitas paróquias pedem o curso de preparação para o matrimônio. Confirme na sua paróquia onde fazer e até quando.',
   'cerimonia', -180, 301),
  ('cat_processo_matrimonial', 'religioso_catolico', 'Abrir o processo matrimonial na paróquia',
   'A lista de documentos varia por diocese e paróquia: confirme com a secretaria paroquial. Os itens abaixo são os mais comuns.',
   'cerimonia', -120, 302),
  ('cat_musicos', 'religioso_catolico', 'Contratar músicos ou coral da cerimônia',
   'Algumas igrejas têm regras sobre repertório e equipe de som. Vale perguntar antes de fechar.',
   'musica', -120, 303),
  ('cat_proclamas', 'religioso_catolico', 'Conferir os proclamas na paróquia',
   'Os proclamas são o anúncio do casamento, em geral publicados nas semanas anteriores. Confirme se está tudo certo com a secretaria.',
   'cerimonia', -60, 304),
  ('cat_roteiro', 'religioso_catolico', 'Combinar o roteiro da cerimônia com o padre',
   'Leituras, quem vai ler, músicas de cada momento e a ordem de entrada do cortejo.',
   'cerimonia', -45, 305),
  ('cat_ensaio', 'religioso_catolico', 'Ensaio da cerimônia',
   'Combine com a igreja se o ensaio pode ser no local e chame quem entra no cortejo.',
   'cerimonia', -3, 306),

  -- evangélica
  ('ev_pastor', 'religioso_evangelico', 'Conversar com o pastor e reservar a igreja',
   'Entenda como a igreja conduz casamentos, a disponibilidade de datas e o que é preciso providenciar.',
   'cerimonia', -300, 300),
  ('ev_aconselhamento', 'religioso_evangelico', 'Fazer o aconselhamento pré-nupcial',
   'Muitas igrejas pedem alguns encontros antes do casamento. Confirme com a sua quantos são e quando começar.',
   'cerimonia', -150, 301),
  ('ev_musicos', 'religioso_evangelico', 'Combinar a música da cerimônia',
   'Ministério de louvor da igreja ou músicos contratados: confirme o que a igreja permite.',
   'musica', -120, 302),
  ('ev_roteiro', 'religioso_evangelico', 'Definir o roteiro da cerimônia',
   'Alinhe com o pastor a ordem dos momentos e quem participa.',
   'cerimonia', -60, 303),
  ('ev_ensaio', 'religioso_evangelico', 'Ensaio da cerimônia',
   'Chame quem entra no cortejo e quem vai participar da cerimônia.',
   'cerimonia', -3, 304),

  -- outra religião
  ('out_lideranca', 'religioso_outro', 'Conversar com a liderança religiosa',
   'Entender requisitos, preparação pedida ao casal e datas disponíveis.',
   'cerimonia', -300, 300),
  ('out_requisitos', 'religioso_outro', 'Cumprir os requisitos e reunir os documentos da cerimônia',
   'Cada tradição tem suas exigências. Anote aqui o que foi pedido usando os itens da tarefa.',
   'cerimonia', -120, 301),
  ('out_musica', 'religioso_outro', 'Combinar a música da cerimônia',
   null,
   'musica', -120, 302),
  ('out_roteiro', 'religioso_outro', 'Definir o roteiro da cerimônia',
   null,
   'cerimonia', -60, 303),
  ('out_ensaio', 'religioso_outro', 'Ensaio da cerimônia',
   null,
   'cerimonia', -3, 304),

  -- celebrante
  ('cel_contratar', 'celebrante', 'Pesquisar e contratar o celebrante',
   'Peça vídeos de cerimônias anteriores e veja se o estilo combina com vocês. A cerimônia com celebrante não tem efeito civil.',
   'cerimonia', -240, 300),
  ('cel_musica', 'celebrante', 'Contratar a música da cerimônia',
   null,
   'musica', -120, 301),
  ('cel_historia', 'celebrante', 'Contar a história de vocês ao celebrante',
   'Em geral é uma reunião ou um questionário. Os itens abaixo ajudam a preparar.',
   'cerimonia', -90, 302),
  ('cel_roteiro', 'celebrante', 'Aprovar o roteiro da cerimônia',
   'Leia com calma e peça ajustes: é a cerimônia de vocês.',
   'cerimonia', -30, 303),
  ('cel_ensaio', 'celebrante', 'Ensaio da cerimônia',
   'Chame quem entra no cortejo e quem vai fazer leituras ou homenagens.',
   'cerimonia', -3, 304);

insert into public.tarefa_modelo_subitens (modelo_id, texto, ordem)
select m.id, s.texto, s.ordem
  from (values
    ('cat_processo_matrimonial', 'Certidão de batismo atualizada de cada um (muitas paróquias pedem emitida há poucos meses)', 1),
    ('cat_processo_matrimonial', 'Certificado do curso de noivos', 2),
    ('cat_processo_matrimonial', 'Documento de identidade de cada um', 3),
    ('cat_processo_matrimonial', 'Comprovante da habilitação do casamento civil, se for o caso', 4),
    ('cat_processo_matrimonial', 'Dados das testemunhas', 5),
    ('cat_roteiro', 'Leituras e quem vai ler', 1),
    ('cat_roteiro', 'Músicas de entrada, alianças e saída', 2),
    ('cat_roteiro', 'Ordem de entrada do cortejo', 3),
    ('ev_roteiro', 'Músicas de entrada e saída', 1),
    ('ev_roteiro', 'Louvores durante a cerimônia', 2),
    ('ev_roteiro', 'Leituras ou mensagens', 3),
    ('ev_roteiro', 'Ordem de entrada do cortejo', 4),
    ('out_roteiro', 'Momentos e rituais da cerimônia', 1),
    ('out_roteiro', 'Músicas de cada momento', 2),
    ('out_roteiro', 'Ordem de entrada do cortejo', 3),
    ('cel_historia', 'Como vocês se conheceram', 1),
    ('cel_historia', 'Momentos marcantes da relação', 2),
    ('cel_historia', 'Pessoas que vão participar (leituras, homenagens)', 3),
    ('cel_historia', 'Rituais que querem incluir (areia, laços, vinho…)', 4),
    ('cel_roteiro', 'Músicas de entrada, alianças e saída', 1),
    ('cel_roteiro', 'Ordem de entrada do cortejo', 2)
  ) as s (codigo, texto, ordem)
  join public.tarefa_modelos m on m.codigo = s.codigo;
