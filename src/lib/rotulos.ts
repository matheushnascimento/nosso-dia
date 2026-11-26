export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

/** Categorias de tarefa. As chaves batem com `tarefas.categoria` no banco. */
export const CATEGORIAS: Record<string, string> = {
  planejamento: "Planejamento",
  convidados: "Convidados",
  assessoria: "Assessoria",
  cortejo: "Padrinhos e cortejo",
  civil: "Civil",
  cerimonia: "Cerimônia",
  local: "Local",
  buffet: "Buffet e doces",
  bebidas: "Bebidas",
  foto_video: "Foto e vídeo",
  decoracao: "Decoração",
  musica: "Música",
  trajes: "Trajes",
  aliancas: "Alianças",
  beleza: "Beleza",
  convites: "Convites",
  fornecedores: "Fornecedores",
  lua_de_mel: "Lua de mel",
  dia_d: "Dia D",
  pos_evento: "Pós-casamento",
  outros: "Outros",
};

export function rotuloCategoria(slug: string | null): string {
  return (slug && CATEGORIAS[slug]) || "Outros";
}

/** Grupos calculados pela view `tarefas_com_prazo`, na ordem de exibição. */
export const GRUPOS = [
  { id: "atrasadas", titulo: "Atrasadas", tom: "alerta" },
  { id: "comecar_agora", titulo: "Começar agora", tom: "destaque" },
  { id: "este_mes", titulo: "Este mês", tom: "normal" },
  { id: "proximos_3_meses", titulo: "Próximos 3 meses", tom: "normal" },
  { id: "depois", titulo: "Depois", tom: "suave" },
  { id: "sem_prazo", titulo: "Sem prazo", tom: "suave" },
  { id: "concluidas", titulo: "Concluídas", tom: "suave" },
] as const;

export type GrupoId = (typeof GRUPOS)[number]["id"];

export const ORDEM_GRUPO: Record<string, number> = Object.fromEntries(
  GRUPOS.map((g, i) => [g.id, i]),
);

/** Sugestões rápidas de tamanho no onboarding. */
export const FAIXAS_CONVIDADOS = [
  { rotulo: "até 50", valor: 50 },
  { rotulo: "50–100", valor: 80 },
  { rotulo: "100–200", valor: 150 },
  { rotulo: "200+", valor: 250 },
];

/** Perguntas dos grupos de escolha de pacotes (`pacotes.grupo_escolha`). */
export const GRUPOS_ESCOLHA: Record<string, string> = {
  cerimonia: "Como vai ser a cerimônia?",
};

export function rotuloGrupoEscolha(grupo: string): string {
  return GRUPOS_ESCOLHA[grupo] ?? grupo;
}

/**
 * Categorias de fornecedor, na ordem de exibição. É a mesma lista do orçamento (M2 · #18) e as chaves
 * batem com `tarefas.categoria`, para o fornecedor mostrar as tarefas da categoria dele.
 * O banco confere a lista (check em `fornecedores.categoria`): mudou aqui, precisa de migration.
 */
export const CATEGORIAS_FORNECEDOR = {
  local: "Espaço",
  buffet: "Buffet, bolo e doces",
  bebidas: "Bebidas",
  foto_video: "Foto e vídeo",
  decoracao: "Decoração e flores",
  musica: "Música",
  assessoria: "Assessoria",
  cerimonia: "Celebrante e cerimônia",
  trajes: "Trajes",
  beleza: "Beleza",
  aliancas: "Alianças",
  convites: "Convites e papelaria",
  outros: "Outros",
} as const;

export type CategoriaFornecedor = keyof typeof CATEGORIAS_FORNECEDOR;

export function ehCategoriaFornecedor(c: string): c is CategoriaFornecedor {
  return Object.hasOwn(CATEGORIAS_FORNECEDOR, c);
}

/** Situação do fornecedor, na ordem do funil. `descartado` fica fora do funil. */
export const STATUS_FORNECEDOR = {
  pesquisando: { rotulo: "Pesquisando", tom: "neutro" },
  orcamento_pedido: { rotulo: "Orçamento pedido", tom: "neutro" },
  orcamento_recebido: { rotulo: "Orçamento recebido", tom: "rose" },
  visita: { rotulo: "Visita ou reunião", tom: "rose" },
  contratado: { rotulo: "Contratado", tom: "salvia" },
  descartado: { rotulo: "Descartado", tom: "alerta" },
} as const;

export type StatusFornecedor = keyof typeof STATUS_FORNECEDOR;

export function ehStatusFornecedor(s: string): s is StatusFornecedor {
  return Object.hasOwn(STATUS_FORNECEDOR, s);
}
