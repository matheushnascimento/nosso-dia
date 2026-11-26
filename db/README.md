# Nosso Dia · Banco

Postgres puro (Neon em produção, Docker no desenvolvimento). As migrations ficam em `db/migrations` e são
aplicadas em ordem por `scripts/db.mjs`, que registra cada uma em `migracoes.aplicadas` com o hash do arquivo.

## Base (o que vinha do Supabase)

`20261124000000_base.sql` roda antes de tudo e cria o que o app usava do Supabase:

- papéis `anon` e `authenticated` (NOLOGIN). O usuário dono do banco, o mesmo do app, recebe o direito de
  assumi-los (`WITH SET TRUE`, necessário no Postgres 16+ sem superusuário, como no Neon);
- schema `auth`: tabela `auth.users` (preenchida pelo app ao criar a conta) e as funções `auth.uid()` e
  `auth.jwt()`, que leem `request.jwt.claim.sub` e `request.jwt.claims`;
- as mesmas permissões padrão que o Supabase dava em `public`, para o RLS das migrations seguintes valer igual.

**Como o app usa** (`src/lib/rls.ts`): cada consulta abre uma transação, troca para o papel `authenticated` e
define a identidade, tudo com escopo da transação:

```sql
begin;
select set_config('role', 'authenticated', true),
       set_config('request.jwt.claim.sub', '<id do usuário>', true),
       set_config('request.jwt.claims', '{"sub": "<id>", "email": "<e-mail>"}', true);
-- consultas do app: o RLS vale como no Supabase
commit;
```

## Migrations

| Migration | Conteúdo |
|---|---|
| `20261124000000_base.sql` | Papéis, schema `auth`, permissões padrão (substitui o Supabase) |
| `20261125000001_m0_schema.sql` | Tipos, tabelas, constraints, índices |
| `20261125000002_m0_funcoes.sql` | Prazo efetivo, view `tarefas_com_prazo`, triggers, RPCs |
| `20261125000003_m0_rls.sql` | RLS, grants por coluna, permissões das funções |
| `20261125000004_m0_tarefa_modelos.sql` | Catálogo inicial de 24 tarefas |
| `20261126000001_m1_pacotes.sql` | M1 #1: pacotes de checklist, subitens, guias, `ativar_pacote`/`desativar_pacote`, backfill |
| `20261126000002_m1_cerimonia.sql` | M1 #3: grupo de escolha `cerimonia` (católica, evangélica, outra, celebrante, só civil) e `pacotes.conclui` |
| `20261126000003_m1_aliancas_lua_de_mel_kit.sql` | M1 #4, #7, #8: pacotes automáticos `aliancas`, `lua_de_mel`, `dia_d`; marca edições anteriores ao M1 |
| `20261126000004_m1_trajes_beleza.sql` | M1 #5, #6: modelos **por parceiro** (`trajes_noivos`), `beleza`; `aceitar_convite` divide as tarefas por parceiro |
| `20261126000005_data_no_passado.sql` | Data do casamento não pode ser marcada no passado (`hint data_passada`) |
| `20261126000006_m1_votos.sql` | M1 #9: votos privados (`salvar_votos`, `status_votos`), tarefa por parceiro, link no kit |
| `20261126000007_m1_civil.sql` | M1 #2: pacote `civil` (habilitação, regime de bens, pacto) |
| `20261126000008_previa_data_opcional.sql` | `previa_mudanca_data` com `p_data default null` |
| `20261126000009_better_auth.sql` | Tabelas `ba_*` do Better Auth (só o dono acessa) e trigger `ba_user` → `auth.users` |
| `20261127000001_m2_fornecedores.sql` | M2 #17: `fornecedores` (funil, valores em centavos, `detalhes` jsonb), RLS dos membros |
| `20261127000002_m2_orcamento.sql` | M2 #18: `orcamento_categorias` (planejado e prioridade por categoria) |
| `20261127000003_m2_pacotes_por_tag.sql` | M2 #20: catálogo `tags`, `pacotes.tag`, `evento_tags`, `previa_tags`, `definir_tags` |
| `20261127000004_m2_estilo.sql` | M2 #21: tags do questionário (`tags.grupo`), pacotes `ao_ar_livre`, `noite`, `destination`; `referencias` |
| `20261127000005_m2_espaco_buffet.sql` | M2 #22: pacotes automáticos `espaco` e `buffet`; absorvem `pesquisar_espaco`, `contratar_espaco`, `contratar_buffet` |

## Pacotes de checklist (M1)

- **Pacote** = conjunto de `tarefa_modelos`. `automatico = true` entra em todo casamento; com
  `grupo_escolha` o casal escolhe um por grupo (ativar um desativa os outros do grupo); com `tag` (M2) entra
  quando o casamento tem a tag (catálogo em `tags`, tags do casamento em `evento_tags`). As três formas são
  exclusivas. Pacote por tag só muda por `definir_tags`; `ativar_pacote`/`desativar_pacote` recusam
  (`hint pacote_por_tag`). Conteúdo novo de um pacote por tag chega aos casamentos com
  `select public._aplicar_pacote_por_tag('<pacote>')`.
- **Subitens**: `tarefa_modelo_subitens` são copiados para `tarefa_subitens` quando o pacote é ativado.
- **Guia**: `tarefa_modelos.guia` é o slug de um guia estático em `src/conteudo/guias/`.
- **`substitui`**: códigos de modelos antigos que o novo absorve. A tarefa existente é reaproveitada,
  sem duplicar: se estava intacta, recebe o conteúdo novo; se foi concluída ou editada, só troca de modelo.
- **`pacotes.conclui`**: códigos de modelos concluídos automaticamente quando o pacote é ativado
  (ex.: escolher a cerimônia conclui "Decidir o tipo de cerimônia").
- **`tarefa_modelos.por_parceiro`**: cada parceiro tem a própria tarefa (`tarefas.parceiro`). Com um parceiro
  só no app, fica uma tarefa compartilhada; quando o segundo aceita o convite, a compartilhada passa a ser de
  quem já estava (ou do responsável definido) e o recém-chegado ganha as suas.
- **Desativar** remove apenas tarefas `pendente` e não editadas (`tarefas.editada`, mantida pelo banco:
  editar campos ou mexer em subitens marca a tarefa).

### Receita para uma migration de conteúdo (#2…#8)

```sql
insert into public.pacotes (codigo, nome, automatico, ordem) values ('aliancas', 'Alianças', true, 40);
insert into public.tarefa_modelos (codigo, titulo, categoria, offset_dias, ordem, pacote, guia, substitui)
values ('encomendar_aliancas', 'Encomendar as alianças', 'aliancas', -120, 1, 'aliancas', null, '{comprar_aliancas}');
-- modelos substituídos deixam de entrar em casamentos novos
update public.tarefa_modelos set ativo = false where codigo = 'comprar_aliancas';
-- leva o pacote aos casamentos existentes (só para pacotes automáticos)
select public._aplicar_pacote_em_todos('aliancas');
```

Para pacotes de escolha, não rode `_aplicar_pacote_em_todos`: o casal ativa pela tela de Configurações.

### Aplicar

```bash
npm run db:start     # Postgres 17 local (compose.yaml), porta 54320
npm run db:migrate   # aplica as pendentes (lê DATABASE_URL do .env.local)
npm run db:status    # aplicadas × pendentes (e alteradas, que dão erro)
npm run db:reset     # APAGA e recria o banco local; recusa banco que não seja local
```

Produção (Neon): `DATABASE_URL_UNPOOLED=<conexão direta> npm run db:migrate`. Nunca edite uma migration já
aplicada: crie outra. O script recusa rodar se o hash de uma aplicada mudou.

### Contrato com o front (Next.js)

Tudo por SQL no servidor (Kysely), dentro de `consultar(sessao, ...)`. Funções do banco são chamadas com
`select * from funcao(...)`.


| Tela | Chamada |
|---|---|
| T1 Cadastro | Better Auth `signUpEmail({ name, email, password })` → `ba_user` → trigger cria `auth.users` → trigger cria o perfil |
| T2 Onboarding | `select criar_evento(p_nome_exibicao => ..., p_data_status => ..., ...)` → `evento_id` |
| T3 Convite | `insert into convites_parceiro (evento_id, email, convidado_por) ... returning token`; e-mail enviado pelo Next (server action) com link `/convite/<token>` |
| T3 Landing | `select * from obter_convite(token)` como visitante (`noBancoVisitante`) |
| T3 Aceitar | `select aceitar_convite(token)`. Exige e-mail da conta = e-mail convidado |
| T4/T5 Painel e Tarefas | `select * from tarefas_com_prazo`, com colunas `prazo_efetivo`, `grupo`, `prazo_travado`, `prazo_aproximado` |
| T5 Ações | `update` em `tarefas` (`status`, `responsavel`, `prazo_fixo`...); conclusão carimbada por trigger |
| T6 Mudar data | `select * from previa_mudanca_data(...)` → confirmar → `update` em `eventos` |
| T6 Checklists | `select * from ativar_pacote(evento, pacote)` → `criadas, removidas`; `select desativar_pacote(...)` |
| Tags (M2) | `select * from previa_tags(evento, tags[])` → `entram, saem, ficam`; confirmar → `select * from definir_tags(evento, tags[])` → `criadas, removidas` (o casamento passa a ter exatamente essas tags) |
| T5 Itens | `tarefa_subitens` (select/insert/update `feito`/delete); contagem em `tarefas_com_prazo.subitens_total/feitos` |

Erros de regra de negócio vêm com `hint`: `ja_tem_evento`, `limite_parceiros`, `convite_invalido`, `email_diferente`,
`pacote_automatico`, `pacote_inexistente`, `pacote_por_tag`, `tag_inexistente`.

### Testes do banco

```bash
npm run db:test                                  # dentro do contêiner do db:start (não precisa de psql)
PGHOST=localhost PGUSER=postgres db/testes/rodar.sh   # ou em qualquer Postgres 16+ com psql
```

Cada rodada cria um banco próprio (`nd_teste_a`, `_b`, `_c`) e começa pela migration base.

- Rodada A: todas as migrations e os testes do M0 (`10_testes.sql`), para pegar regressões.
- Rodada B: M0, dados "antigos" (`15_dados_pre_m1.sql`), só a infra do M1 e `20_testes_m1.sql`
  (backfill, absorção, escolha de pacotes, subitens, RLS, com pacotes fictícios).
- Rodada C: M0, dados "antigos", todas as migrations e os testes de conteúdo
  (`30_` a `80_testes_*.sql`).

Cada rodada usa um banco próprio. Uma migration de conteúdo nova ganha seu arquivo de testes na rodada C.
