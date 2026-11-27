-- =============================================================================
-- Nosso Dia · M2 · #24 Checklists de música e assessoria, e setlist por momento
-- =============================================================================
-- Dois pacotes automáticos. Substituem do M0:
--   contratar_musica → mus_contratar · decidir_assessoria → ass_decidir
-- A música da CERIMÔNIA já tem tarefa nos pacotes de cerimônia do M1 (cel_musica, ev_musicos,
-- cat_musicos, out_musica): aqui ela entra só como momento da setlist, sem tarefa repetida.
-- =============================================================================

insert into public.pacotes (codigo, nome, descricao, automatico, ordem) values
  ('musica',     'Música',                 'Contratar, alinhar e entregar a setlist.',                       true, 29),
  ('assessoria', 'Assessoria e cerimonial', 'Tipo de assessoria, contrato, reuniões e contatos dos fornecedores.', true, 30);

insert into public.tarefa_modelos (codigo, pacote, titulo, descricao, categoria, offset_dias, ordem, substitui) values
  -- música
  ('mus_contratar', 'musica', 'Contratar a música da festa (DJ ou banda)',
   'Peçam vídeos de festas reais e perguntem o que está incluso: som, luz, horas e intervalos.',
   'musica', -240, 120, '{contratar_musica}'),
  ('mus_setlist', 'musica', 'Montar a setlist por momento',
   'Entrada, alianças, saída, primeira dança, festa e o que não tocar.',
   'musica', -45, 208, '{}'),
  ('mus_alinhamento', 'musica', 'Fazer a reunião de alinhamento com o DJ ou a banda',
   'Horários, momentos especiais, anúncios e quem dá o sinal de cada entrada.',
   'musica', -30, 211, '{}'),
  ('mus_entregar', 'musica', 'Entregar a setlist ao DJ, à banda e aos músicos',
   'Imprimam a setlist pelo app e mandem também por mensagem.',
   'musica', -14, 216, '{}'),
  -- assessoria
  ('ass_decidir', 'assessoria', 'Decidir se terão assessoria ou cerimonial',
   'Assessoria completa, só do dia ou nenhuma: isso muda o resto do planejamento. Sem assessoria, podem excluir as outras tarefas daqui.',
   'assessoria', -300, 70, '{decidir_assessoria}'),
  ('ass_contratar', 'assessoria', 'Contratar a assessoria',
   'Combinem no contrato quantas reuniões, quantos assistentes no dia e o que fica com ela.',
   'assessoria', -270, 92, '{}'),
  ('ass_reunioes', 'assessoria', 'Agendar as reuniões com a assessoria',
   null,
   'assessoria', -120, 185, '{}'),
  ('ass_contatos', 'assessoria', 'Passar à assessoria os contatos de todos os fornecedores',
   'Nome, telefone e o que foi contratado de cada um, para ela coordenar o dia.',
   'assessoria', -30, 214, '{}');

insert into public.tarefa_modelo_subitens (modelo_id, texto, ordem, link)
select m.id, s.texto, s.ordem, s.link
  from public.tarefa_modelos m
  join (values
    ('mus_setlist', 'Música da cerimônia (entradas, alianças, saída)', 1, '/musica'),
    ('mus_setlist', 'Primeira dança', 2, '/musica'),
    ('mus_setlist', 'Festa e o que não tocar', 3, '/musica'),
    ('mus_alinhamento', 'Horário de cada momento', 1, null),
    ('mus_alinhamento', 'Anúncios (entrada dos noivos, bolo, buquê)', 2, null),
    ('mus_alinhamento', 'Equipamento de som da cerimônia', 3, null),
    ('ass_reunioes', 'Reunião de planejamento', 1, null),
    ('ass_reunioes', 'Roteiro do dia', 2, null),
    ('ass_reunioes', 'Ensaio da cerimônia', 3, null),
    ('ass_contatos', 'Lista de fornecedores contratados', 1, '/fornecedores')
  ) as s (codigo, texto, ordem, link) on s.codigo = m.codigo;

update public.tarefa_modelos set ativo = false where codigo in ('contratar_musica', 'decidir_assessoria');

select public._aplicar_pacote_em_todos('musica');
select public._aplicar_pacote_em_todos('assessoria');

-- -----------------------------------------------------------------------------
-- Setlist: músicas do casal por momento
-- -----------------------------------------------------------------------------
create table public.musicas (
  id         uuid primary key default gen_random_uuid(),
  evento_id  uuid not null references public.eventos (id) on delete cascade,
  -- momentos na ordem da festa (src/lib/musica.ts · MOMENTOS)
  momento    text not null check (momento in (
               'entrada_padrinhos', 'entrada_noivos', 'aliancas', 'saida', 'primeira_danca', 'festa', 'nao_tocar')),
  titulo     text not null check (char_length(btrim(titulo)) between 1 and 200),
  artista    text check (char_length(artista) <= 200),
  link       text check (link ~ '^https?://[^\s/$.?#][^\s]*$' and char_length(link) <= 2000),
  ordem      integer not null default 0,
  criado_em  timestamptz not null default now()
);

create index musicas_evento_idx on public.musicas (evento_id, momento, ordem);

alter table public.musicas enable row level security;
revoke all on public.musicas from anon;
grant select, insert, update, delete on public.musicas to authenticated;

create policy musicas_select on public.musicas
  for select to authenticated using (public.eh_membro(evento_id));
create policy musicas_insert on public.musicas
  for insert to authenticated with check (public.eh_membro(evento_id));
create policy musicas_update on public.musicas
  for update to authenticated using (public.eh_membro(evento_id)) with check (public.eh_membro(evento_id));
create policy musicas_delete on public.musicas
  for delete to authenticated using (public.eh_membro(evento_id));
