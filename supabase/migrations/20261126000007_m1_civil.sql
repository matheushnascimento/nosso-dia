-- =============================================================================
-- Nosso Dia · M1 · #2 Casamento civil e regime de bens
-- =============================================================================
-- Pacote automático `civil` (todo casamento precisa do civil, mesmo com cerimônia religiosa
-- ou com celebrante). Substitui a tarefa do M0 `habilitacao_civil`.
--
-- CONTEÚDO INFORMATIVO, A REVISAR por alguém com conhecimento jurídico antes da produção.
-- Base conferida no texto compilado do Planalto em 25/11/2026:
--   Código Civil (Lei 10.406/2002) arts. 1.512, 1.516, 1.525, 1.532, 1.534, 1.565, 1.639–1.641,
--   1.653, 1.657; Lei 6.015/1973 (Registros Públicos) art. 67 § 1º, na redação da Lei 14.382/2022:
--   publicidade eletrônica da habilitação e certificado em até 5 dias.
--
-- Prazos (relativos à data do casamento):
--   cv_habilitacao fica em D-75, e não em D-90 como na issue: com o certificado saindo em poucos
--   dias, entrar em D-90 deixa os 90 dias de validade quase colados na data. D-75 dá folga dos
--   dois lados. O "edital de proclamas" virou "acompanhar a habilitação e retirar o certificado".
-- =============================================================================

insert into public.pacotes (codigo, nome, descricao, automatico, ordem) values
  ('civil', 'Casamento civil', 'Cartório, regime de bens, testemunhas e habilitação.', true, 20);

insert into public.tarefa_modelos (codigo, pacote, titulo, descricao, categoria, offset_dias, ordem, guia, substitui) values
  ('cv_cartorio', 'civil', 'Escolher o cartório e confirmar documentos e taxas',
   'Cartório de Registro Civil (de pessoas naturais). Peçam a lista de documentos, as taxas e, se quiserem casar fora do cartório, se ele faz e quanto custa. Quem não pode pagar tem direito à gratuidade da habilitação, do registro e da primeira certidão.',
   'civil', -150, 185, 'regime-de-bens', '{}'),
  ('cv_regime', 'civil', 'Decidir o regime de bens',
   'Comunhão parcial é o padrão e não precisa de pacto. Qualquer outro regime exige pacto antenupcial em tabelionato, antes da habilitação. O guia explica cada um com um exemplo.',
   'civil', -130, 186, 'regime-de-bens', '{}'),
  ('cv_pacto', 'civil', 'Fazer o pacto antenupcial no tabelionato, se for o caso',
   'Só para comunhão universal, separação de bens ou participação final nos aquestos. É uma escritura pública feita em tabelionato de notas, e a escritura é levada na habilitação. Escolheram comunhão parcial? Concluam esta tarefa.',
   'civil', -110, 187, 'regime-de-bens', '{}'),
  ('cv_testemunhas', 'civil', 'Escolher as testemunhas',
   'Na habilitação, duas pessoas maiores de idade, parentes ou não, declaram que conhecem vocês e que não há impedimento. Na cerimônia civil são pelo menos duas testemunhas, e quatro se for fora do cartório, em local particular (como o espaço da festa). Confirmem com o cartório se podem ser as mesmas.',
   'civil', -110, 188, null, '{}'),
  ('cv_habilitacao', 'civil', 'Dar entrada na habilitação do casamento',
   'Atenção ao prazo: a habilitação vale 90 dias a partir da emissão do certificado, e o cartório costuma emiti-lo em poucos dias se os documentos estiverem em ordem. Cedo demais, ela vence antes do casamento; tarde demais, sobra pouco tempo para resolver pendências. Os dois vão juntos ao cartório (ou por procuração), com os documentos e, se houver, o pacto.',
   'civil', -75, 190, 'regime-de-bens', '{habilitacao_civil}'),
  ('cv_certificado', 'civil', 'Acompanhar a habilitação e retirar o certificado',
   'O cartório publica a habilitação em meio eletrônico e, sem impedimento, emite o certificado. Confiram a validade anotada nele: a data do casamento precisa caber nesses 90 dias. Se a data mudar, pode ser preciso uma nova habilitação.',
   'civil', -65, 191, null, '{}'),
  ('cv_celebracao', 'civil', 'Agendar o civil ou o registro do religioso com efeito civil',
   'Civil: marquem dia, hora e local com o cartório. Religioso com efeito civil: entreguem a certidão de habilitação ao celebrante; depois da cerimônia, o registro no cartório precisa ser pedido dentro do prazo legal (o Código Civil fala em 90 dias). Confirmem com o cartório e com a igreja quem leva o termo.',
   'civil', -60, 192, 'regime-de-bens', '{}'),
  ('cv_pos', 'civil', 'Pedir a certidão de casamento e atualizar documentos',
   'Quem acrescentou o sobrenome do outro atualiza os documentos a partir da certidão.',
   'civil', 15, 600, null, '{}');

insert into public.tarefa_modelo_subitens (modelo_id, texto, ordem)
select m.id, s.texto, s.ordem
  from (values
    ('cv_habilitacao', 'Certidão de nascimento atualizada (o cartório diz de quando precisa ser)', 1),
    ('cv_habilitacao', 'Divorciados: certidão de casamento com a averbação do divórcio. Viúvos: certidão de óbito do cônjuge', 2),
    ('cv_habilitacao', 'Documento de identidade com foto e CPF', 3),
    ('cv_habilitacao', 'Comprovante de residência', 4),
    ('cv_habilitacao', 'Documentos das duas testemunhas', 5),
    ('cv_habilitacao', 'Escritura do pacto antenupcial, se houver', 6),
    ('cv_pos', 'Certidão de casamento (peçam mais de uma via, se precisarem)', 1),
    ('cv_pos', 'Se fizeram pacto: registrá-lo no Registro de Imóveis do domicílio do casal', 2),
    ('cv_pos', 'Sobrenome novo: identidade, CPF, título de eleitor, CNH e passaporte', 3),
    ('cv_pos', 'Estado civil e sobrenome no banco, no trabalho e no plano de saúde', 4)
  ) as s (codigo, texto, ordem)
  join public.tarefa_modelos m on m.codigo = s.codigo;

update public.tarefa_modelos set ativo = false where codigo = 'habilitacao_civil';

select public._aplicar_pacote_em_todos('civil');
