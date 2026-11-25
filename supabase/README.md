# Nosso Dia · Supabase

## M0 · Fundação

| Migration | Conteúdo |
|---|---|
| `20261125000001_m0_schema.sql` | Tipos, tabelas, constraints, índices |
| `20261125000002_m0_funcoes.sql` | Prazo efetivo, view `tarefas_com_prazo`, triggers, RPCs |
| `20261125000003_m0_rls.sql` | RLS, grants por coluna, permissões das funções |
| `20261125000004_m0_tarefa_modelos.sql` | Catálogo inicial de 24 tarefas |

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

Erros de regra de negócio vêm com `hint`: `ja_tem_evento`, `limite_parceiros`, `convite_invalido`, `email_diferente`.

### Testes locais (sem Docker)

`testes/00_stub_supabase.sql` simula o schema `auth` e os papéis do Supabase em um Postgres comum;
`testes/10_testes.sql` cobre os critérios de aceite do M0. Rodar em um banco vazio:

```bash
psql -d nd -f testes/00_stub_supabase.sql
for f in migrations/*.sql; do psql -d nd -v ON_ERROR_STOP=1 -f "$f"; done
psql -d nd -f testes/10_testes.sql
```
