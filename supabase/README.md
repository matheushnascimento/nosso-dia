# Nosso Dia · Supabase

## M0 · Fundação

| Migration | Conteúdo |
|---|---|
| `20261125000001_m0_schema.sql` | Tipos, tabelas, constraints, índices |
| `20261125000002_m0_funcoes.sql` | Prazo efetivo, view `tarefas_com_prazo`, triggers, RPCs |
| `20261125000003_m0_rls.sql` | RLS, grants por coluna, permissões das funções |
| `20261125000004_m0_tarefa_modelos.sql` | Catálogo inicial de 24 tarefas |
| `20261126000001_m1_pacotes.sql` | M1 #1: pacotes de checklist, subitens, guias, `ativar_pacote`/`desativar_pacote`, backfill |

## Pacotes de checklist (M1)

- **Pacote** = conjunto de `tarefa_modelos`. `automatico = true` entra em todo casamento; com
  `grupo_escolha` o casal escolhe um por grupo (ativar um desativa os outros do grupo).
- **Subitens**: `tarefa_modelo_subitens` são copiados para `tarefa_subitens` quando o pacote é ativado.
- **Guia**: `tarefa_modelos.guia` é o slug de um guia estático em `src/conteudo/guias/`.
- **`substitui`**: códigos de modelos antigos que o novo absorve. A tarefa existente é reaproveitada,
  sem duplicar: se estava intacta, recebe o conteúdo novo; se foi concluída ou editada, só troca de modelo.
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
supabase init          # se o projeto ainda não tiver supabase/config.toml
supabase start         # local (Docker)
supabase db reset      # aplica todas as migrations
supabase gen types typescript --local > src/lib/database.types.ts
```

Remoto: `supabase link --project-ref <ref>` e depois `supabase db push`.

### Contrato com o front (Next.js)

| Tela | Chamada |
|---|---|
| T1 Cadastro | `supabase.auth.signUp({ email, password, options: { data: { nome } } })`. O perfil é criado por trigger |
| T2 Onboarding | `rpc('criar_evento', { p_nome_exibicao, p_data_status, p_data, ... })` → `evento_id` |
| T3 Convite | `from('convites_parceiro').insert({ evento_id, email, convidado_por: user.id })` → `token`; e-mail enviado pelo Next (server action) com link `/convite/<token>` |
| T3 Landing | `rpc('obter_convite', { p_token })` (funciona sem login) |
| T3 Aceitar | `rpc('aceitar_convite', { p_token })`. Exige e-mail da conta = e-mail convidado |
| T4/T5 Painel e Tarefas | `from('tarefas_com_prazo').select()`, com colunas `prazo_efetivo`, `grupo`, `prazo_travado`, `prazo_aproximado` |
| T5 Ações | `update` em `tarefas` (`status`, `responsavel`, `prazo_fixo`...); conclusão carimbada por trigger |
| T6 Mudar data | `rpc('previa_mudanca_data', ...)` → confirmar → `update` em `eventos` |
| T6 Checklists | `rpc('ativar_pacote', { p_evento_id, p_pacote })` → `{ criadas, removidas }`; `rpc('desativar_pacote', ...)` |
| T5 Itens | `tarefa_subitens` (select/insert/update `feito`/delete); contagem em `tarefas_com_prazo.subitens_total/feitos` |

Erros de regra de negócio vêm com `hint`: `ja_tem_evento`, `limite_parceiros`, `convite_invalido`, `email_diferente`,
`pacote_automatico`, `pacote_inexistente`.

### Testes locais (sem Docker)

Num Postgres comum (cria os bancos `nd_teste_a` e `nd_teste_b`):

```bash
PGHOST=localhost PGUSER=postgres supabase/testes/rodar.sh
```

- Rodada A: todas as migrations e os testes do M0 (`10_testes.sql`), para pegar regressões.
- Rodada B: migrations do M0, dados "antigos" (`15_dados_pre_m1.sql`), migrations do M1 e os testes do M1
  (`20_testes_m1.sql`: backfill, absorção de modelos substituídos, escolha de pacotes, subitens, RLS).
