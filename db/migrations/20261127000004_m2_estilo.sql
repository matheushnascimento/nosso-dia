-- =============================================================================
-- Nosso Dia · M2 · #21 Estilo e formato: questionário, tags, pacotes por tag e referências
-- =============================================================================
--
-- O questionário de /estilo vira tags do casamento (definir_tags, da #20). Algumas tags ativam
-- checklists: ao_ar_livre, noite e destination. "Misto" (parte ao ar livre) também leva a tag
-- ao_ar_livre: o app grava as duas.
-- mini_wedding foi avaliado e não ganha pacote agora: as tarefas do M0 valem para casamentos
-- pequenos, e substituir sem um checklist enxuto pensado de ponta a ponta deixaria lacunas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Grupo da tag (pergunta do questionário)
-- -----------------------------------------------------------------------------
alter table public.tags add column grupo text check (grupo ~ '^[a-z0-9_]+$');

insert into public.tags (codigo, grupo, nome, descricao, ordem) values
  -- formato
  ('tradicional',  'formato',  'Tradicional',     'Cerimônia e festa com a maioria dos convidados.', 10),
  ('mini_wedding', 'formato',  'Mini wedding',    'Até umas 50 pessoas, mais intimista.', 11),
  ('elopement',    'formato',  'Elopement',       'Só o casal, ou quase: poucas testemunhas.', 12),
  ('destination',  'formato',  'Destination',     'Em outra cidade ou país: os convidados viajam.', 13),
  -- período
  ('dia',          'periodo',  'Durante o dia',   null, 20),
  ('fim_de_tarde', 'periodo',  'Fim de tarde',    'Cerimônia no pôr do sol, festa entrando na noite.', 21),
  ('noite',        'periodo',  'À noite',         null, 22),
  -- ambiente
  ('ao_ar_livre',  'ambiente', 'Ao ar livre',     null, 30),
  ('fechado',      'ambiente', 'Em local fechado', null, 31),
  ('misto',        'ambiente', 'Misto',           'Uma parte ao ar livre (ex.: cerimônia no jardim, festa no salão).', 32),
  -- estilo (pode mais de um)
  ('classico',     'estilo',   'Clássico',        null, 40),
  ('rustico',      'estilo',   'Rústico',         null, 41),
  ('praia',        'estilo',   'Praia',           null, 42),
  ('moderno',      'estilo',   'Moderno',         null, 43),
  ('boho',         'estilo',   'Boho',            null, 44);

-- -----------------------------------------------------------------------------
-- Pacotes por tag
-- -----------------------------------------------------------------------------
insert into public.pacotes (codigo, nome, descricao, tag, ordem) values
  ('ao_ar_livre', 'Casamento ao ar livre', 'Plano B, cobertura, luz, banheiros e energia.', 'ao_ar_livre', 60),
  ('noite',       'Casamento à noite',     'Iluminação da cerimônia e da festa.',          'noite',       61),
  ('destination', 'Destination wedding',   'Hospedagem e transporte dos convidados e viagem dos fornecedores.', 'destination', 62);

insert into public.tarefa_modelos (codigo, pacote, titulo, descricao, categoria, offset_dias, ordem) values
  -- ao ar livre
  ('ext_plano_b', 'ao_ar_livre', 'Definir o plano B para chuva',
   'Onde fica cada parte se chover, quem decide e até quando. Combine com o espaço e a decoração.',
   'local', -120, 300),
  ('ext_tenda', 'ao_ar_livre', 'Avaliar tenda ou cobertura',
   'Mesmo com previsão boa: sol forte também atrapalha. Peça orçamento com montagem e piso.',
   'local', -120, 301),
  ('ext_iluminacao', 'ao_ar_livre', 'Planejar a iluminação da área externa',
   'Caminhos, mesas e pista. Ao ar livre, depois do pôr do sol, tudo depende dela.',
   'decoracao', -60, 302),
  ('ext_banheiros', 'ao_ar_livre', 'Garantir banheiros para os convidados',
   'Confira quantos o espaço tem para o número de convidados; se faltar, alugue banheiros móveis.',
   'local', -90, 303),
  ('ext_energia', 'ao_ar_livre', 'Conferir a energia elétrica',
   'Som, luz, buffet e bar somados. Se o espaço não aguentar, alugue gerador.',
   'local', -60, 304),
  -- noite
  ('noi_luz_cerimonia', 'noite', 'Planejar a iluminação da cerimônia',
   'Para os convidados verem e para as fotos: altar, corredor e o caminho até lá.',
   'decoracao', -60, 310),
  ('noi_luz_festa', 'noite', 'Planejar a iluminação da festa',
   'Luz de ambiente nas mesas, pista e áreas de passagem. Alinhe com a decoração e o DJ ou a banda.',
   'decoracao', -60, 311),
  -- destination
  ('dst_hospedagem', 'destination', 'Reservar hospedagem para os convidados',
   'Negocie um bloco de quartos ou indique opções em faixas de preço. Reserve cedo na alta temporada.',
   'convidados', -240, 320),
  ('dst_transporte', 'destination', 'Organizar o transporte dos convidados',
   'Do aeroporto ou rodoviária até o hotel e do hotel até o casamento, ida e volta.',
   'convidados', -90, 321),
  ('dst_fornecedores', 'destination', 'Combinar a viagem dos fornecedores',
   'Quem vai de fora (foto, assessoria, beleza…), quem paga passagem, hospedagem e alimentação.',
   'fornecedores', -120, 322),
  ('dst_guia', 'destination', 'Enviar aos convidados o guia da viagem',
   'Como chegar, onde ficar, clima, roupa e o que fazer na cidade.',
   'convidados', -90, 323);

insert into public.tarefa_modelo_subitens (modelo_id, texto, ordem)
select m.id, s.texto, s.ordem
  from public.tarefa_modelos m
  join (values
    ('ext_plano_b', 'Local coberto para a cerimônia', 1),
    ('ext_plano_b', 'Local coberto para a festa', 2),
    ('ext_plano_b', 'Até que horas decidir', 3),
    ('ext_plano_b', 'Quem avisa os fornecedores', 4),
    ('dst_hospedagem', 'Opções de hospedagem em faixas de preço', 1),
    ('dst_hospedagem', 'Código ou link de reserva para os convidados', 2),
    ('dst_hospedagem', 'Prazo para os convidados reservarem', 3)
  ) as s (codigo, texto, ordem) on s.codigo = m.codigo;

-- -----------------------------------------------------------------------------
-- Referências: links de inspiração do casal, com categoria e nota
-- -----------------------------------------------------------------------------
create table public.referencias (
  id         uuid primary key default gen_random_uuid(),
  evento_id  uuid not null references public.eventos (id) on delete cascade,
  -- mesmas categorias de fornecedor
  categoria  text not null check (categoria in (
               'local', 'buffet', 'bebidas', 'foto_video', 'decoracao', 'musica',
               'assessoria', 'trajes', 'beleza', 'aliancas', 'convites', 'cerimonia',
               'outros')),
  url        text not null check (url ~ '^https?://[^\s/$.?#][^\s]*$' and char_length(url) <= 2000),
  nota       text check (char_length(nota) <= 500),
  criado_por uuid references public.perfis (id) on delete set null,
  criado_em  timestamptz not null default now()
);

create index referencias_evento_idx on public.referencias (evento_id, categoria);

alter table public.referencias enable row level security;
revoke all on public.referencias from anon;
grant select, insert, update, delete on public.referencias to authenticated;

create policy referencias_select on public.referencias
  for select to authenticated using (public.eh_membro(evento_id));
create policy referencias_insert on public.referencias
  for insert to authenticated with check (public.eh_membro(evento_id));
create policy referencias_update on public.referencias
  for update to authenticated using (public.eh_membro(evento_id)) with check (public.eh_membro(evento_id));
create policy referencias_delete on public.referencias
  for delete to authenticated using (public.eh_membro(evento_id));
