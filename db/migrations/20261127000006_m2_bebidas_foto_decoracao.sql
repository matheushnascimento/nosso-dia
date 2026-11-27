-- =============================================================================
-- Nosso Dia · M2 · #23 Checklists de bebidas, foto e vídeo e decoração
-- =============================================================================
-- Três pacotes automáticos. Substituem do M0:
--   contratar_foto → fv_contratar · contratar_decoracao → dec_contratar  (bebidas não tinha tarefa no M0)
-- Para não duplicar o que já existe:
--   · iluminação entra como item do projeto de decoração (os pacotes noite/ao_ar_livre, da #21, têm tarefas próprias);
--   · a visita técnica é a do pacote espaco (#22), que já lista a decoração.
-- =============================================================================

insert into public.pacotes (codigo, nome, descricao, automatico, ordem) values
  ('bebidas',    'Bebidas',                 'Consumo, orçamento, consignado ou por pessoa, drinks e gelo.', true, 26),
  ('foto_video', 'Foto e vídeo',            'Portfólios, contrato, briefing e entrega.',                    true, 27),
  ('decoracao',  'Decoração e flores',      'Referências, orçamento, flores, projeto e buquê.',             true, 28);

insert into public.tarefa_modelos (codigo, pacote, titulo, descricao, categoria, offset_dias, ordem, substitui) values
  -- bebidas
  ('beb_orcar', 'bebidas', 'Pedir orçamentos de bebidas',
   'Se o buffet inclui bebidas, comparem com um fornecedor só de bebidas.',
   'bebidas', -150, 125, '{}'),
  ('beb_estimar', 'bebidas', 'Estimar o consumo de bebidas',
   'Uma estimativa já ajuda a comparar orçamentos. A calculadora do app chega numa próxima versão.',
   'bebidas', -140, 126, '{}'),
  ('beb_contratar', 'bebidas', 'Decidir entre consignado e por pessoa, e contratar',
   'Consignado: paga o que for consumido. Por pessoa: valor fechado, com ou sem limite.',
   'bebidas', -120, 127, '{}'),
  ('beb_drinks', 'bebidas', 'Decidir sobre o bar de drinks',
   'Quais drinks, quantos bartenders e se entra no mesmo contrato das bebidas.',
   'bebidas', -90, 128, '{}'),
  ('beb_gelo', 'bebidas', 'Garantir o gelo',
   'Confirmem quem leva, quanto e a que horas. Em dia quente, falta gelo antes de faltar bebida.',
   'bebidas', -15, 217, '{}'),
  -- foto e vídeo
  ('fv_portfolios', 'foto_video', 'Ver portfólios completos',
   'Peçam um casamento inteiro entregue, não só os destaques do Instagram.',
   'foto_video', -300, 95, '{}'),
  ('fv_contratar', 'foto_video', 'Contratar fotografia e filmagem',
   'Os mais procurados fecham a agenda com até um ano de antecedência.',
   'foto_video', -270, 100, '{contratar_foto}'),
  ('fv_pre_wedding', 'foto_video', 'Fazer o ensaio pré-wedding (opcional)',
   'Ajuda a se acostumarem com a câmera e com o fotógrafo. Se não quiserem, é só excluir.',
   'foto_video', -90, 190, '{}'),
  ('fv_briefing', 'foto_video', 'Passar o briefing com as fotos obrigatórias',
   'Lista de momentos e de pessoas que não podem faltar, com quem vai apontar a família no dia.',
   'foto_video', -30, 212, '{}'),
  ('fv_entrega', 'foto_video', 'Receber as fotos e o vídeo',
   'Confiram com o prazo do contrato e guardem uma cópia em outro lugar.',
   'foto_video', 60, 250, '{}'),
  -- decoração
  ('dec_referencias', 'decoracao', 'Reunir referências de decoração',
   'Guardem os links em Estilo, na categoria Decoração e flores, para mostrar nos orçamentos.',
   'decoracao', -240, 115, '{}'),
  ('dec_orcar', 'decoracao', 'Pedir orçamentos de decoração',
   'Com as mesmas referências e o mesmo número de mesas, para comparar de verdade.',
   'decoracao', -220, 120, '{}'),
  ('dec_contratar', 'decoracao', 'Contratar decoração e flores',
   null,
   'decoracao', -210, 130, '{contratar_decoracao}'),
  ('dec_flores', 'decoracao', 'Escolher as flores da estação',
   'Flores fora de época custam mais e podem faltar. Perguntem quais estarão boas na data.',
   'decoracao', -150, 136, '{}'),
  ('dec_projeto', 'decoracao', 'Fechar o projeto de decoração',
   'Tudo o que vai em cada ambiente, com fotos ou croqui, aprovado pelos dois.',
   'decoracao', -60, 207, '{}'),
  ('dec_buque', 'decoracao', 'Encomendar o buquê',
   'Combinem as flores com a decoração e com o traje.',
   'decoracao', -30, 213, '{}');

insert into public.tarefa_modelo_subitens (modelo_id, texto, ordem)
select m.id, s.texto, s.ordem
  from public.tarefa_modelos m
  join (values
    ('beb_orcar', 'Consignado ou por pessoa', 1),
    ('beb_orcar', 'Marcas e o que está incluso', 2),
    ('beb_orcar', 'Copos, gelo e bartenders inclusos?', 3),
    ('beb_estimar', 'Quantos convidados bebem álcool', 1),
    ('beb_estimar', 'Duração da festa', 2),
    ('beb_estimar', 'Época do ano e clima', 3),
    ('fv_contratar', 'Horas de cobertura', 1),
    ('fv_contratar', 'Prazo de entrega das fotos e do vídeo', 2),
    ('fv_contratar', 'Álbum, segundo fotógrafo e drone', 3),
    ('fv_contratar', 'Direito de uso das imagens', 4),
    ('fv_briefing', 'Making of', 1),
    ('fv_briefing', 'Entrada, alianças e beijo', 2),
    ('fv_briefing', 'Fotos com a família de cada um', 3),
    ('fv_briefing', 'Padrinhos e madrinhas', 4),
    ('fv_briefing', 'Primeira dança e bolo', 5),
    ('fv_briefing', 'Detalhes da decoração', 6),
    ('dec_projeto', 'Mobiliário (mesas, cadeiras, lounge)', 1),
    ('dec_projeto', 'Iluminação', 2),
    ('dec_projeto', 'Centros de mesa', 3),
    ('dec_projeto', 'Mesa do bolo e dos doces', 4),
    ('dec_projeto', 'Cerimônia: altar e corredor', 5),
    ('dec_projeto', 'Montagem e desmontagem', 6)
  ) as s (codigo, texto, ordem) on s.codigo = m.codigo;

update public.tarefa_modelos set ativo = false where codigo in ('contratar_foto', 'contratar_decoracao');

select public._aplicar_pacote_em_todos('bebidas');
select public._aplicar_pacote_em_todos('foto_video');
select public._aplicar_pacote_em_todos('decoracao');
