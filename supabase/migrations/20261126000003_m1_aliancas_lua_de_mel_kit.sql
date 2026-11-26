-- =============================================================================
-- Nosso Dia · M1 · #4 Alianças · #7 Noite de núpcias e lua de mel · #8 Kit do dia D
-- =============================================================================
-- Três pacotes automáticos que substituem tarefas do M0:
--   comprar_aliancas → aliancas · reservar_lua_de_mel → lua_de_mel · kit_dia_d → dia_d
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Edições anteriores ao M1
-- `tarefas.editada` nasceu `false` para todo mundo (migration da #1). Esta é a primeira
-- migration que absorve tarefas reais do M0; sem isto, um casal que renomeou uma tarefa
-- antes do M1 teria o título sobrescrito pelo modelo novo.
-- -----------------------------------------------------------------------------
update public.tarefas t
   set editada = true
  from public.tarefa_modelos m
 where m.id = t.modelo_id
   and not t.editada
   and (
     (t.titulo, t.descricao, t.categoria, t.offset_dias) is distinct from
     (m.titulo, m.descricao, m.categoria, m.offset_dias)
     or t.prazo_fixo is not null
   );

-- -----------------------------------------------------------------------------
-- Pacotes
-- -----------------------------------------------------------------------------
insert into public.pacotes (codigo, nome, descricao, automatico, ordem) values
  ('aliancas',   'Alianças',                    'Da escolha à entrega no dia.',                       true, 40),
  ('lua_de_mel', 'Noite de núpcias e lua de mel', 'Destino, documentos, reservas e mala.',            true, 70),
  ('dia_d',      'Kit e itens do dia D',          'Kit de emergência e o que precisa estar no lugar.', true, 80);

-- -----------------------------------------------------------------------------
-- Modelos
-- -----------------------------------------------------------------------------
insert into public.tarefa_modelos (codigo, pacote, titulo, descricao, categoria, offset_dias, ordem, guia, substitui) values
  -- #4 alianças
  ('al_orcamento_estilo', 'aliancas', 'Definir orçamento e estilo das alianças',
   'Cor do ouro (amarelo, branco ou rosé), largura, acabamento e se vão ter pedras.',
   'aliancas', -180, 165, null, '{}'),
  ('al_medida', 'aliancas', 'Tirar a medida dos dois',
   'Prefira o fim do dia: de manhã e com as mãos frias os dedos ficam mais finos e a medida sai menor.',
   'aliancas', -150, 166, null, '{}'),
  ('al_encomendar', 'aliancas', 'Encomendar as alianças',
   'Confirme o prazo de fabricação e de gravação antes de fechar.',
   'aliancas', -120, 170, null, '{comprar_aliancas}'),
  ('al_retirar', 'aliancas', 'Retirar e conferir as alianças',
   'Experimente as duas e confira a gravação letra por letra.',
   'aliancas', -30, 171, null, '{}'),
  ('al_quem_leva', 'aliancas', 'Definir quem leva as alianças na cerimônia',
   'Pajem, daminha, padrinho ou um de vocês. Combinem também quem guarda as alianças até a hora.',
   'aliancas', -14, 172, null, '{}'),

  -- #7 noite de núpcias e lua de mel
  ('lm_destino', 'lua_de_mel', 'Definir destino, datas e orçamento da lua de mel',
   'Vale checar a época do ano no destino (chuvas, alta temporada) antes de decidir.',
   'lua_de_mel', -210, 155, null, '{}'),
  ('lm_documentos', 'lua_de_mel', 'Conferir os documentos de viagem',
   'Exigências mudam por destino e com o tempo: confira sempre nas fontes oficiais.',
   'lua_de_mel', -180, 156, 'documentos-de-viagem', '{}'),
  ('lm_reservas', 'lua_de_mel', 'Reservar voos e hospedagem da lua de mel',
   'Leia as regras de cancelamento e remarcação antes de pagar.',
   'lua_de_mel', -150, 160, null, '{reservar_lua_de_mel}'),
  ('lm_noite_nupcias', 'lua_de_mel', 'Reservar a noite de núpcias',
   'Perto do local da festa facilita. Pergunte sobre horário de check-in tardio e café da manhã.',
   'lua_de_mel', -90, 161, null, '{}'),
  ('lm_seguro', 'lua_de_mel', 'Contratar seguro viagem',
   'Alguns destinos exigem seguro com cobertura mínima. Confira antes de contratar.',
   'lua_de_mel', -30, 162, 'documentos-de-viagem', '{}'),
  ('lm_banco', 'lua_de_mel', 'Avisar o banco e conferir os cartões para a viagem',
   'Veja limite, validade e taxas para compras no exterior.',
   'lua_de_mel', -7, 163, null, '{}'),
  ('lm_mala', 'lua_de_mel', 'Fazer a mala da lua de mel',
   null,
   'lua_de_mel', -5, 164, null, '{}'),

  -- #8 kit e itens do dia D
  ('dd_responsaveis', 'dia_d', 'Definir quem fica com o kit e com as alianças no dia',
   'Uma pessoa de confiança que fique perto de vocês o tempo todo.',
   'dia_d', -7, 228, null, '{}'),
  ('dd_kit', 'dia_d', 'Montar o kit de emergência',
   'Deixem o kit com a pessoa responsável, não com vocês.',
   'dia_d', -3, 230, null, '{kit_dia_d}'),
  ('dd_itens', 'dia_d', 'Separar os itens do dia',
   'Tudo que precisa sair de casa com vocês ou chegar ao local antes da cerimônia.',
   'dia_d', -2, 231, null, '{}');

insert into public.tarefa_modelo_subitens (modelo_id, texto, ordem)
select m.id, s.texto, s.ordem
  from (values
    ('al_encomendar', 'Texto da gravação de cada aliança', 1),
    ('al_encomendar', 'Prazo de entrega confirmado', 2),
    ('al_encomendar', 'Nota fiscal e certificado guardados', 3),

    ('lm_documentos', 'Passaporte válido (muitos países pedem validade mínima de 6 meses)', 1),
    ('lm_documentos', 'Visto, se o destino exigir', 2),
    ('lm_documentos', 'Vacinas exigidas ou recomendadas e o certificado internacional, se pedido', 3),
    ('lm_documentos', 'Permissão internacional para dirigir, se forem alugar carro', 4),
    ('lm_documentos', 'Cópias digitais dos documentos num lugar seguro', 5),

    ('lm_mala', 'Documentos e reservas', 1),
    ('lm_mala', 'Remédios de uso contínuo', 2),
    ('lm_mala', 'Carregadores e adaptador de tomada', 3),
    ('lm_mala', 'Roupas para o clima do destino', 4),
    ('lm_mala', 'Roupa e itens para a noite de núpcias', 5),

    ('dd_kit', 'Agulha e linha nas cores dos trajes', 1),
    ('dd_kit', 'Alfinetes', 2),
    ('dd_kit', 'Tesoura pequena', 3),
    ('dd_kit', 'Fita dupla face', 4),
    ('dd_kit', 'Analgésico', 5),
    ('dd_kit', 'Antialérgico', 6),
    ('dd_kit', 'Curativos', 7),
    ('dd_kit', 'Absorventes', 8),
    ('dd_kit', 'Desodorante', 9),
    ('dd_kit', 'Lenços', 10),
    ('dd_kit', 'Escova e pasta de dente', 11),
    ('dd_kit', 'Spray fixador e grampos', 12),
    ('dd_kit', 'Carregador de celular', 13),
    ('dd_kit', 'Sapato confortável para a festa', 14),
    ('dd_kit', 'Guarda-chuva', 15),

    ('dd_itens', 'Alianças', 1),
    ('dd_itens', 'Documentos', 2),
    ('dd_itens', 'Votos impressos', 3),
    ('dd_itens', 'Trajes e acessórios', 4),
    ('dd_itens', 'Presentes dos padrinhos', 5),
    ('dd_itens', 'Lista de contatos dos fornecedores', 6)
  ) as s (codigo, texto, ordem)
  join public.tarefa_modelos m on m.codigo = s.codigo;

-- -----------------------------------------------------------------------------
-- Modelos substituídos deixam de entrar em casamentos novos
-- -----------------------------------------------------------------------------
update public.tarefa_modelos
   set ativo = false
 where codigo in ('comprar_aliancas', 'reservar_lua_de_mel', 'kit_dia_d');

-- -----------------------------------------------------------------------------
-- Levar aos casamentos existentes (absorve as tarefas antigas, sem duplicar)
-- -----------------------------------------------------------------------------
select public._aplicar_pacote_em_todos('aliancas');
select public._aplicar_pacote_em_todos('lua_de_mel');
select public._aplicar_pacote_em_todos('dia_d');
