# Nosso Dia

Planejamento de casamento para os dois, num só lugar: conta do casal, onboarding, convite do parceiro,
painel, checklists guiados (cerimônia, civil, trajes, kit do dia D…) cujos prazos se ajustam sozinhos à data
do casamento, e os votos de cada um.

**Stack:** Next.js 16 (App Router, Cache Components, Server Actions) · Postgres com RLS (Neon em produção) ·
Better Auth · Kysely · Resend · Tailwind CSS 4.

## Rodando localmente

Pré-requisitos: Node 20+ e Docker.

```bash
npm install
cp .env.example .env.local   # DATABASE_URL já aponta para o Postgres local; gere o BETTER_AUTH_SECRET
npm run db:start             # Postgres 17 em Docker (porta 54320)
npm run db:migrate           # aplica as migrations de db/migrations
npm run db:test              # testes SQL do banco
npm run db:test:app          # RLS pela camada do app (usa o banco do .env.local)
npm run dev
```

**Login:** Better Auth, com usuários e sessões no mesmo Postgres. Sem `RESEND_API_KEY`, os e-mails de confirmação
e de nova senha não saem: o link aparece no terminal do `npm run dev`.

Abrindo o `npm run dev` **de outro computador** (pelo IP ou nome da máquina)? Ponha esse endereço em
`DEV_ORIGINS` no `.env.local` (ex.: `DEV_ORIGINS=192.168.0.10`) e em `NEXT_PUBLIC_SITE_URL`. Sem isso, o
servidor de desenvolvimento bloqueia os próprios scripts (a página carrega, mas botões como o "Continuar" do
onboarding não respondem) e o login recusa o pedido por vir de uma origem desconhecida.

### Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (exige as variáveis de `.env.example`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Gera tipos de rota e roda `tsc` |
| `npm test` | Testes unitários (`src/**/*.test.ts`, com `node:test`) |
| `npm run db:start` / `db:stop` | Sobe / para o Postgres local (Docker) |
| `npm run db:migrate` / `db:status` | Aplica as migrations pendentes / mostra a situação |
| `npm run db:reset` | Apaga e recria o banco **local** com todas as migrations |
| `npm run db:test` | Testes SQL do banco (dentro do contêiner) |
| `npm run db:test:app` | Teste de RLS pela camada do app (`comoUsuario`) |
| `npm run db:types` | Gera `src/lib/db.types.ts` a partir do banco (`.kysely-codegenrc.json`) |

## Deploy e página "em construção"

Sem `DATABASE_URL` ou `BETTER_AUTH_SECRET` (ou com `EM_CONSTRUCAO=1`), o `proxy.ts` serve
`public/em-construcao.html` em **todas** as rotas, com `noindex`. O build não precisa de nenhuma variável.

Produção: Vercel + Neon (pela integração do Marketplace, que cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED`) +
Resend. Variáveis só no ambiente **Production**; os previews ficam sem banco e mostram o "em construção".

| Variável | Valor |
|---|---|
| `DATABASE_URL` | criada pela integração do Neon (com pooler) |
| `DATABASE_URL_UNPOOLED` | criada pela integração (conexão direta, usada pelas migrations) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32`, só deste ambiente (**secreta**) |
| `NEXT_PUBLIC_SITE_URL` | `https://nossodia.mhdn.com.br` |
| `RESEND_API_KEY` | chave do Resend (**secreta**) |
| `EMAIL_REMETENTE` | `Nosso Dia <nao-responda@...>`, num domínio verificado no Resend |

Nenhuma chave secreta vai em `NEXT_PUBLIC_*`: essas são embutidas no JavaScript do navegador.

**Migrations no deploy de produção.** O `npm run build` começa por `node scripts/db.mjs deploy`, que só age no
deploy de produção da Vercel (`VERCEL_ENV=production`): aplica as migrations pendentes pela conexão direta
(`DATABASE_URL_UNPOOLED`) antes do `next build`. Previews e builds locais nunca tocam no banco. Se uma migration
falhar, o build falha e a versão anterior continua no ar. Por isso as migrations precisam ser compatíveis com o
código que ainda está no ar durante o build (criar tabela ou coluna nova: sim; apagar ou renomear: em dois passos).

Para aplicar à mão (por exemplo, antes de um merge), da sua máquina:

```bash
MIGRATIONS_DATABASE_URL='<DATABASE_URL_UNPOOLED do Neon>' npm run db:migrate
```

O `db:migrate` é idempotente, trava contra execuções simultâneas e recusa migrations já aplicadas que foram
editadas. Nunca rode `db:reset` nem os testes (`db:test:app`) contra produção.

Para lançar o app num projeto da Vercel que está mostrando o placeholder:
1. Configure as variáveis da tabela (Production) e remova `EM_CONSTRUCAO`, se existir.
2. Faça um novo deploy (ele aplica as migrations). As `NEXT_PUBLIC_*` são embutidas no build, então só salvar as variáveis não basta.

## Estrutura

```text
db/
  migrations/          schema, regras (RPCs, triggers, view), RLS, catálogo de tarefas
  testes/              testes SQL dos critérios de aceite (rodam num Postgres comum)
src/
  proxy.ts             redireciona rotas protegidas e telas de visitante (antigo middleware)
  lib/
    dal.ts             Data Access Layer: único ponto que lê a sessão (getSessao, consultar, requireEvento…)
    auth.ts            Better Auth (e-mail e senha, confirmação, nova senha)
    db.ts              conexões com o Postgres (app e login); acesso só por noBanco/noBancoVisitante
    rls.ts             comoUsuario/comoVisitante: papel e identidade da requisição em cada transação
    db.types.ts        tipos do banco, gerados com `npm run db:types` (não editar à mão)
    tipos.ts           tipos de linha usados pelas telas (Evento, Convite…)
    tarefas.ts         leitura e ordenação das tarefas e dos subitens
    pacotes.ts         checklists ativos e grupos de escolha
    fornecedores.ts    leitura, ordenação e resumo dos fornecedores
    campos-fornecedor/ campos próprios de cada categoria (um módulo por categoria), validação e resumo
    convidados.ts      faixas, confirmações, lados, contagem e filtros da lista (puro, com testes)
    convidados-dados.ts convites e pessoas do casal
    importar-convidados.ts leitura de CSV, colunas, validação, repetidos e agrupamento (puro, com testes)
    musica.ts          momentos da setlist
    musica-dados.ts    setlist do casal por momento
    estilo.ts          perguntas do questionário de estilo e formato, respostas ↔ tags (puro, com testes)
    estilo-dados.ts    catálogo de tags, respostas do casal e referências
    orcamento.ts       categorias do orçamento, distribuição sugerida e prioridades (puro, com testes)
    orcamento-dados.ts planejado × contratado × restante por categoria
    datas.ts           datas em America/Sao_Paulo
    formato.ts         dinheiro em centavos, parse de formulários
    rotulos.ts         categorias, grupos, UFs
    erros.ts           mensagens de erro em português (mapeia os `hint` do banco)
    email.ts           e-mails via Resend (confirmação, nova senha, convite)
  conteudo/guias/      guias estáticos (/guias/<slug>), ligados a tarefas por `tarefa_modelos.guia`
  components/          UI básica (ui.tsx), botão com estado de envio, campos de data
  app/
    page.tsx           landing (estática)
    (auth)/            entrar, cadastrar, recuperar-senha, nova-senha + actions
    api/auth/          endpoints do Better Auth (links de confirmação e de nova senha)
    onboarding/        T2 · 4 passos → criar_evento
    convite/[token]/   T3 · landing do convite e aceite
    (app)/painel/      T4 · contagem regressiva, progresso, orçamento, próximas tarefas
    (app)/tarefas/     T5 · lista agrupada, filtros, nova/editar/concluir/excluir
    (app)/configuracoes/ T6 · dados do casamento com prévia da mudança de data, convite, perfil
    (app)/votos/       votos de cada um: editor privado, salvamento automático, impressão
    (app)/convidados/  lista por convite, cadastro rápido, filtros, confirmação em lote, edição de cada pessoa;
                       importar/ traz uma planilha (CSV ou colada) com prévia antes de gravar
    (app)/musica/      setlist por momento: adicionar, reordenar, imprimir para o DJ ou a banda
    (app)/estilo/      questionário de estilo e formato (tags que ativam checklists) e referências
    (app)/orcamento/   total, distribuição por categoria, prioridades e alertas de estouro
    (app)/fornecedores/ lista por categoria, cadastro, detalhe com as tarefas da categoria
```

## Decisões que valem conhecer

- **O prazo não é gravado.** A view `tarefas_com_prazo` calcula `prazo_efetivo` e `grupo` a cada leitura;
  mudar a data do casamento reorganiza tudo sem job.
- **Escrita estrutural só por RPC.** Criar casamento e entrar como parceiro passam por funções no banco
  (`criar_evento`, `aceitar_convite`); o RLS bloqueia o resto.
- **Cache Components está ligado.** Toda leitura de sessão fica dentro de `<Suspense>`; o casco das páginas
  é pré-renderizado e o conteúdo do casal chega por streaming. Nada do casal é cacheado no servidor.
- **Toda consulta roda como o usuário.** O app entra no banco como dono, mas cada consulta passa por
  `consultar(sessao, ...)` (DAL), que abre uma transação com o papel `authenticated` e a identidade da sessão
  (`auth.uid()`). O RLS vale sempre, como no Supabase. Visitante sem login: `noBancoVisitante` (papel `anon`).
- **Server Actions sempre reautenticam** pela DAL e filtram por `evento_id`, além do RLS.
- **Login fora do alcance do app.** As tabelas do Better Auth (`ba_*`) só são acessíveis ao dono; um trigger
  copia cada conta para `auth.users`, que é o que o resto do banco usa.
- **Votos são privados de verdade.** Só o autor lê o texto (RLS); o parceiro vê apenas a situação, pela RPC
  `status_votos`, que nunca devolve o texto. A escrita é só pela RPC `salvar_votos`.
- **Fornecedores dos dois.** Os parceiros leem e editam todos (RLS por `eh_membro`, como as tarefas). Categorias
  em `CATEGORIAS_FORNECEDOR` (`rotulos.ts`), conferidas também por um check no banco; "contratado" exige valor
  contratado (check `fornecedores_contratado_com_valor`).
- **Campos por categoria em código.** Cada categoria declara seus campos em `src/lib/campos-fornecedor/`; o mesmo
  esquema monta o formulário e valida na Server Action. Vai para `fornecedores.detalhes` só o que é da categoria
  atual: campos desconhecidos são descartados e trocar de categoria descarta os da anterior.
- **Orçamento: planejado gravado, contratado calculado.** `orcamento_categorias` guarda só o planejado e as
  prioridades; o contratado é sempre a soma dos fornecedores `contratado`. A distribuição sugerida divide em reais
  inteiros pelos maiores restos e põe os centavos na reserva, então a soma é sempre exatamente o total.
- **Convidados por convite.** Toda pessoa pertence a um `convites_familia` (um casal, uma família ou uma pessoa
  só); lado e grupo ficam no convite, que é a unidade do RSVP público do M5. Um convite que fica sem ninguém é
  apagado por trigger. O lado `a` é o primeiro membro do casamento e `b` o parceiro; a tela mostra o primeiro nome
  de cada um. Telefone, e-mail e restrição alimentar são dados de terceiros: só os membros do casal acessam (RLS).
- **Importação em duas passadas.** A planilha é lida no navegador para a prévia e lida de novo no servidor ao
  importar, a partir do texto: o servidor refaz a validação e os repetidos contra a lista atual e não confia na
  prévia. Nada fica guardado entre as etapas.
- **Migrations são imutáveis depois de aplicadas.** Para mudar algo, crie uma migration nova; o `db:migrate`
  recusa rodar se uma já aplicada foi editada.
- **Tipos gerados do banco** (`npm run db:types`): datas como `"YYYY-MM-DD"`, timestamps como texto ISO e
  centavos como número, que é como a conexão do app devolve.

## Testes do banco sem Docker

```bash
npm run db:test   # ou: PGHOST=localhost PGUSER=postgres db/testes/rodar.sh
```

Detalhes do contrato entre telas e banco: [`db/README.md`](db/README.md).
