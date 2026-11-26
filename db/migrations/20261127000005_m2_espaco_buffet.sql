-- =============================================================================
-- Nosso Dia · M2 · #22 Checklists de espaço e buffet
-- =============================================================================
-- Dois pacotes automáticos que substituem tarefas do M0:
--   pesquisar_espaco → esp_visitar · contratar_espaco → esp_contratar · contratar_buffet → buf_contratar
-- A tarefa existente é absorvida (_copiar_pacote): intacta recebe o conteúdo novo e os itens;
-- concluída ou editada só troca de modelo e fica como está.
-- O plano B entra como item da visita e da conferência: a tarefa própria é do pacote ao_ar_livre (#21).
-- =============================================================================

insert into public.pacotes (codigo, nome, descricao, automatico, ordem) values
  ('espaco', 'Espaço',          'Da visita à visita técnica com os fornecedores.',                true, 20),
  ('buffet', 'Buffet, bolo e doces', 'Orçamentos, degustação, cardápio, bolo, doces e bem-casados.', true, 25);

insert into public.tarefa_modelos (codigo, pacote, titulo, descricao, categoria, offset_dias, ordem, guia, substitui) values
  -- espaço
  ('esp_visitar', 'espaco', 'Pesquisar e visitar espaços',
   'Levem a lista do que perguntar e anotem tudo: depois de três visitas, os espaços se confundem.',
   'local', -330, 50, 'visita-ao-espaco', '{pesquisar_espaco}'),
  ('esp_conferir', 'espaco', 'Conferir capacidade, horário e plano B do preferido',
   'Antes de assinar, confiram de novo com a lista de convidados e o horário que vocês imaginam.',
   'local', -310, 55, 'visita-ao-espaco', '{}'),
  ('esp_contratar', 'espaco', 'Contratar o espaço',
   'Tudo o que foi combinado na visita precisa estar no contrato.',
   'local', -300, 60, null, '{contratar_espaco}'),
  ('esp_visita_tecnica', 'espaco', 'Fazer a visita técnica com os fornecedores',
   'Uma visita ao espaço com quem vai montar e servir, para ninguém descobrir problema no dia.',
   'local', -30, 215, null, '{}'),
  -- buffet, bolo e doces
  ('buf_orcamentos', 'buffet', 'Pedir orçamentos de buffet',
   'Peçam pelo mesmo número de convidados e o mesmo tipo de serviço, para comparar de verdade.',
   'buffet', -300, 85, null, '{}'),
  ('buf_degustacao', 'buffet', 'Fazer a degustação',
   'Provem com calma os pratos que estão em dúvida. Perguntem o que pode ser trocado no cardápio.',
   'buffet', -280, 88, null, '{}'),
  ('buf_contratar', 'buffet', 'Contratar o buffet',
   'Confiram no contrato o número mínimo de convidados e até quando dá para mudar o número final.',
   'buffet', -270, 90, null, '{contratar_buffet}'),
  ('buf_bolo_doces', 'buffet', 'Encomendar o bolo e os doces',
   'Se não vêm com o buffet, peçam degustação também. Doces finos costumam ser os primeiros a lotar a agenda.',
   'buffet', -150, 135, null, '{}'),
  ('buf_cardapio', 'buffet', 'Fechar o cardápio',
   'Com a lista quase fechada, confirmem as restrições alimentares dos convidados.',
   'buffet', -60, 205, null, '{}'),
  ('buf_bem_casados', 'buffet', 'Encomendar os bem-casados',
   null,
   'buffet', -60, 206, null, '{}'),
  ('buf_numero_final', 'buffet', 'Confirmar o número final com o buffet',
   'Depois de fechar a lista de confirmados, avisem o buffet dentro do prazo do contrato.',
   'buffet', -10, 218, null, '{}');

insert into public.tarefa_modelo_subitens (modelo_id, texto, ordem)
select m.id, s.texto, s.ordem
  from public.tarefa_modelos m
  join (values
    ('esp_visitar', 'Capacidade para o número de convidados', 1),
    ('esp_visitar', 'Datas livres e valor na data de vocês', 2),
    ('esp_visitar', 'O que está incluso (mobiliário, louça, limpeza, segurança)', 3),
    ('esp_visitar', 'Horário limite e valor da hora extra', 4),
    ('esp_visitar', 'Plano B para chuva', 5),
    ('esp_visitar', 'Se exige fornecedores exclusivos e a taxa para os de fora', 6),
    ('esp_visitar', 'Estacionamento e acessibilidade', 7),
    ('esp_visitar', 'Banheiros, energia e sala para os noivos', 8),
    ('esp_visitar', 'Formas de pagamento, multa e remarcação', 9),
    ('esp_conferir', 'Capacidade com folga para a lista atual', 1),
    ('esp_conferir', 'Horário limite cobre a festa que vocês querem', 2),
    ('esp_conferir', 'Plano B para chuva combinado', 3),
    ('esp_contratar', 'Data, horários de montagem e de término', 1),
    ('esp_contratar', 'Valor, parcelas e o que está incluso', 2),
    ('esp_contratar', 'Multa por cancelamento e regra de remarcação', 3),
    ('esp_visita_tecnica', 'Decoração', 1),
    ('esp_visita_tecnica', 'Buffet', 2),
    ('esp_visita_tecnica', 'Foto e vídeo', 3),
    ('esp_visita_tecnica', 'Música e som', 4),
    ('esp_visita_tecnica', 'Assessoria ou cerimonial', 5),
    ('buf_orcamentos', 'Preço por pessoa e número mínimo de convidados', 1),
    ('buf_orcamentos', 'Cardápio: entradas, pratos e sobremesa', 2),
    ('buf_orcamentos', 'Tipo de serviço e número de garçons', 3),
    ('buf_orcamentos', 'Louça, toalhas e equipe de cozinha inclusas?', 4),
    ('buf_orcamentos', 'Bebidas inclusas ou à parte', 5),
    ('buf_orcamentos', 'Degustação: quando e para quantas pessoas', 6),
    ('buf_cardapio', 'Entradas e prato principal', 1),
    ('buf_cardapio', 'Opção vegetariana ou vegana', 2),
    ('buf_cardapio', 'Restrições alimentares (alergias, sem glúten, sem lactose)', 3),
    ('buf_cardapio', 'Cardápio infantil', 4),
    ('buf_cardapio', 'Refeição dos fornecedores', 5),
    ('buf_bolo_doces', 'Degustação do bolo', 1),
    ('buf_bolo_doces', 'Sabor, recheio e tamanho do bolo', 2),
    ('buf_bolo_doces', 'Quantidade de doces por convidado', 3),
    ('buf_bolo_doces', 'Mesa e apresentação', 4),
    ('buf_bem_casados', 'Quantidade (em geral, um por convidado)', 1),
    ('buf_bem_casados', 'Embalagem e fita', 2),
    ('buf_bem_casados', 'Entrega no espaço', 3)
  ) as s (codigo, texto, ordem) on s.codigo = m.codigo;

-- Os modelos do M0 saem do catálogo (casamentos novos já nascem com os do pacote)
update public.tarefa_modelos set ativo = false
 where codigo in ('pesquisar_espaco', 'contratar_espaco', 'contratar_buffet');

-- Leva os pacotes aos casamentos existentes (absorve as tarefas do M0 sem duplicar)
select public._aplicar_pacote_em_todos('espaco');
select public._aplicar_pacote_em_todos('buffet');
