# Nosso Dia

Planejamento de casamento para os dois, num só lugar. Este repositório contém o **M0 · Fundação**:
conta do casal, onboarding, convite do parceiro, painel e um checklist cujos prazos se ajustam
sozinhos à data do casamento.

**Stack:** Next.js 16 (App Router, Cache Components, Server Actions) · Postgres com RLS (Neon em produção) · Tailwind CSS 4.

> **Migração em andamento** (milestone "Migração · Neon + Better Auth"): o banco já roda em Postgres puro
> (`db/`), mas o login e a leitura dos dados ainda passam pelo Supabase até as issues #26 e #27.

## Rodando localmente

Pré-requisitos: Node 20+ e Docker.

```bash
npm install
cp .env.example .env.local   # DATABASE_URL já aponta para o Postgres local
npm run db:start             # Postgres 17 em Docker (porta 54320)
npm run db:migrate           # aplica as migrations de db/migrations
npm run db:test              # testes SQL do banco
npm run dev
```

Enquanto a migração não termina, o login e as telas ainda usam o Supabase local (`npx supabase start` e as
variáveis `NEXT_PUBLIC_SUPABASE_*` do `.env.local`).

Abrindo o `npm run dev` **de outro computador** (pelo IP ou nome da máquina)? Ponha esse endereço em
`DEV_ORIGINS` no `.env.local` (ex.: `DEV_ORIGINS=192.168.0.10`) e em `NEXT_PUBLIC_SITE_URL`. Sem isso, o
servidor de desenvolvimento bloqueia os próprios scripts: a página carrega, mas botões como o
"Continuar" do onboarding não respondem.

### Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (exige as variáveis de `.env.example`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Gera tipos de rota e roda `tsc` |
| `npm run db:start` / `db:stop` | Sobe / para o Postgres local (Docker) |
| `npm run db:migrate` / `db:status` | Aplica as migrations pendentes / mostra a situação |
| `npm run db:reset` | Apaga e recria o banco **local** com todas as migrations |
| `npm run db:test` | Testes SQL do banco (dentro do contêiner) |

## Deploy e página "em construção"

Sem `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou com `EM_CONSTRUCAO=1`), o `proxy.ts`
serve `public/em-construcao.html` em **todas** as rotas, com `noindex`. O build não precisa de nenhuma variável.

Para lançar o app num projeto da Vercel que está mostrando o placeholder:
1. Configure as variáveis do `.env.example` no projeto (Production).
2. Remova `EM_CONSTRUCAO`, se existir.
3. Faça um novo deploy. As `NEXT_PUBLIC_*` são embutidas no build, então só salvar as variáveis não basta.

## Estrutura

```text
db/
  migrations/          schema, regras (RPCs, triggers, view), RLS, catálogo de tarefas
  testes/              testes SQL dos critérios de aceite (rodam num Postgres comum)
src/
  proxy.ts             renova a sessão e redireciona rotas protegidas (antigo middleware)
  lib/
    dal.ts             Data Access Layer: único ponto que lê a sessão (getSessao, requireEvento…)
    supabase/server.ts cliente Supabase por requisição
    database.types.ts  tipos do banco, gerados com `npm run db:types` (não editar à mão)
    tarefas.ts         leitura e ordenação das tarefas e dos subitens
    pacotes.ts         checklists ativos e grupos de escolha
    datas.ts           datas em America/Sao_Paulo
    formato.ts         dinheiro em centavos, parse de formulários
    rotulos.ts         categorias, grupos, UFs
    erros.ts           mensagens de erro em português (mapeia os `hint` do banco)
    email.ts           envio do convite via Resend (opcional)
  conteudo/guias/      guias estáticos (/guias/<slug>), ligados a tarefas por `tarefa_modelos.guia`
  components/          UI básica (ui.tsx), botão com estado de envio, campos de data
  app/
    page.tsx           landing (estática)
    (auth)/            entrar, cadastrar, recuperar-senha, nova-senha + actions
    auth/callback/     troca o ?code= dos links de e-mail por sessão
    onboarding/        T2 · 4 passos → rpc criar_evento
    convite/[token]/   T3 · landing do convite e aceite
    (app)/painel/      T4 · contagem regressiva, progresso, orçamento, próximas tarefas
    (app)/tarefas/     T5 · lista agrupada, filtros, nova/editar/concluir/excluir
    (app)/configuracoes/ T6 · dados do casamento com prévia da mudança de data, convite, perfil
    (app)/votos/       votos de cada um: editor privado, salvamento automático, impressão
```

## Decisões que valem conhecer

- **O prazo não é gravado.** A view `tarefas_com_prazo` calcula `prazo_efetivo` e `grupo` a cada leitura;
  mudar a data do casamento reorganiza tudo sem job.
- **Escrita estrutural só por RPC.** Criar casamento e entrar como parceiro passam por funções no banco
  (`criar_evento`, `aceitar_convite`); o RLS bloqueia o resto.
- **Cache Components está ligado.** Toda leitura de sessão fica dentro de `<Suspense>`; o casco das páginas
  é pré-renderizado e o conteúdo do casal chega por streaming. Nada do casal é cacheado no servidor.
- **Server Actions sempre reautenticam** pela DAL e filtram por `evento_id`, além do RLS.
- **Votos são privados de verdade.** Só o autor lê o texto (RLS); o parceiro vê apenas a situação, pela RPC
  `status_votos`, que nunca devolve o texto. A escrita é só pela RPC `salvar_votos`.
- **Migrations são imutáveis depois de aplicadas.** Para mudar algo, crie uma migration nova; o `db:migrate`
  recusa rodar se uma já aplicada foi editada.
- **`database.types.ts`** ainda é o gerado pelo Supabase; na #27 ele dá lugar aos tipos gerados do Postgres.

## Testes do banco sem Docker

```bash
npm run db:test   # ou: PGHOST=localhost PGUSER=postgres db/testes/rodar.sh
```

Detalhes do contrato entre telas e banco: [`db/README.md`](db/README.md).
