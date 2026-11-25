// Tipos do banco no formato de `supabase gen types typescript`.
// Escritos à mão a partir das migrations do M0. Regenere com:
//   npm run db:types
// e substitua este arquivo assim que tiver o Supabase local rodando.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      perfis: {
        Row: {
          id: string;
          nome: string;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id: string;
          nome?: string;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          criado_em?: string;
          atualizado_em?: string;
        };
        Relationships: [];
      };
      eventos: {
        Row: {
          id: string;
          nome_exibicao: string;
          data_status: Database["public"]["Enums"]["data_status"];
          data: string | null;
          horario_cerimonia: string | null;
          horario_festa: string | null;
          cidade: string | null;
          uf: string | null;
          convidados_estimados: number | null;
          orcamento_total_centavos: number | null;
          fuso: string;
          criado_por: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          nome_exibicao: string;
          data_status?: Database["public"]["Enums"]["data_status"];
          data?: string | null;
          horario_cerimonia?: string | null;
          horario_festa?: string | null;
          cidade?: string | null;
          uf?: string | null;
          convidados_estimados?: number | null;
          orcamento_total_centavos?: number | null;
          fuso?: string;
          criado_por?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          nome_exibicao?: string;
          data_status?: Database["public"]["Enums"]["data_status"];
          data?: string | null;
          horario_cerimonia?: string | null;
          horario_festa?: string | null;
          cidade?: string | null;
          uf?: string | null;
          convidados_estimados?: number | null;
          orcamento_total_centavos?: number | null;
          fuso?: string;
          criado_por?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "eventos_criado_por_fkey";
            columns: ["criado_por"];
            isOneToOne: false;
            referencedRelation: "perfis";
            referencedColumns: ["id"];
          },
        ];
      };
      membros: {
        Row: {
          evento_id: string;
          usuario_id: string;
          papel: Database["public"]["Enums"]["papel_membro"];
          criado_em: string;
        };
        Insert: {
          evento_id: string;
          usuario_id: string;
          papel?: Database["public"]["Enums"]["papel_membro"];
          criado_em?: string;
        };
        Update: {
          evento_id?: string;
          usuario_id?: string;
          papel?: Database["public"]["Enums"]["papel_membro"];
          criado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "membros_evento_id_fkey";
            columns: ["evento_id"];
            isOneToOne: false;
            referencedRelation: "eventos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "membros_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: true;
            referencedRelation: "perfis";
            referencedColumns: ["id"];
          },
        ];
      };
      convites_parceiro: {
        Row: {
          id: string;
          evento_id: string;
          email: string;
          token: string;
          convidado_por: string | null;
          expira_em: string;
          aceito_em: string | null;
          aceito_por: string | null;
          cancelado_em: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          evento_id: string;
          email: string;
          token?: string;
          convidado_por?: string | null;
          expira_em?: string;
          aceito_em?: string | null;
          aceito_por?: string | null;
          cancelado_em?: string | null;
          criado_em?: string;
        };
        Update: {
          id?: string;
          evento_id?: string;
          email?: string;
          token?: string;
          convidado_por?: string | null;
          expira_em?: string;
          aceito_em?: string | null;
          aceito_por?: string | null;
          cancelado_em?: string | null;
          criado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "convites_parceiro_evento_id_fkey";
            columns: ["evento_id"];
            isOneToOne: false;
            referencedRelation: "eventos";
            referencedColumns: ["id"];
          },
        ];
      };
      tarefa_modelos: {
        Row: {
          id: string;
          codigo: string;
          titulo: string;
          descricao: string | null;
          categoria: string;
          offset_dias: number | null;
          ordem: number;
          ativo: boolean;
          criado_em: string;
          pacote: string;
          guia: string | null;
          substitui: string[];
          por_parceiro: boolean;
        };
        Insert: {
          id?: string;
          codigo: string;
          titulo: string;
          descricao?: string | null;
          categoria: string;
          offset_dias?: number | null;
          ordem?: number;
          ativo?: boolean;
          criado_em?: string;
          pacote?: string;
          guia?: string | null;
          substitui?: string[];
          por_parceiro?: boolean;
        };
        Update: {
          id?: string;
          codigo?: string;
          titulo?: string;
          descricao?: string | null;
          categoria?: string;
          offset_dias?: number | null;
          ordem?: number;
          ativo?: boolean;
          criado_em?: string;
          pacote?: string;
          guia?: string | null;
          substitui?: string[];
          por_parceiro?: boolean;
        };
        Relationships: [];
      };
      tarefas: {
        Row: {
          id: string;
          evento_id: string;
          modelo_id: string | null;
          titulo: string;
          descricao: string | null;
          categoria: string;
          offset_dias: number | null;
          prazo_fixo: string | null;
          status: Database["public"]["Enums"]["status_tarefa"];
          concluida_em: string | null;
          concluida_por: string | null;
          responsavel: string | null;
          ordem: number;
          criado_em: string;
          atualizado_em: string;
          editada: boolean;
          parceiro: string | null;
        };
        Insert: {
          id?: string;
          evento_id: string;
          modelo_id?: string | null;
          titulo: string;
          descricao?: string | null;
          categoria?: string;
          offset_dias?: number | null;
          prazo_fixo?: string | null;
          status?: Database["public"]["Enums"]["status_tarefa"];
          concluida_em?: string | null;
          concluida_por?: string | null;
          responsavel?: string | null;
          ordem?: number;
          criado_em?: string;
          atualizado_em?: string;
          editada?: boolean;
          parceiro?: string | null;
        };
        Update: {
          id?: string;
          evento_id?: string;
          modelo_id?: string | null;
          titulo?: string;
          descricao?: string | null;
          categoria?: string;
          offset_dias?: number | null;
          prazo_fixo?: string | null;
          status?: Database["public"]["Enums"]["status_tarefa"];
          concluida_em?: string | null;
          concluida_por?: string | null;
          responsavel?: string | null;
          ordem?: number;
          criado_em?: string;
          atualizado_em?: string;
          editada?: boolean;
          parceiro?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tarefas_evento_id_fkey";
            columns: ["evento_id"];
            isOneToOne: false;
            referencedRelation: "eventos";
            referencedColumns: ["id"];
          },
        ];
      };
      pacotes: {
        Row: {
          codigo: string;
          nome: string;
          descricao: string | null;
          automatico: boolean;
          grupo_escolha: string | null;
          ordem: number;
          ativo: boolean;
          conclui: string[];
        };
        Insert: {
          codigo: string;
          nome: string;
          descricao?: string | null;
          automatico?: boolean;
          grupo_escolha?: string | null;
          ordem?: number;
          ativo?: boolean;
          conclui?: string[];
        };
        Update: {
          codigo?: string;
          nome?: string;
          descricao?: string | null;
          automatico?: boolean;
          grupo_escolha?: string | null;
          ordem?: number;
          ativo?: boolean;
          conclui?: string[];
        };
        Relationships: [];
      };
      evento_pacotes: {
        Row: {
          evento_id: string;
          pacote: string;
          ativado_em: string;
          ativado_por: string | null;
        };
        Insert: {
          evento_id: string;
          pacote: string;
          ativado_em?: string;
          ativado_por?: string | null;
        };
        Update: {
          evento_id?: string;
          pacote?: string;
          ativado_em?: string;
          ativado_por?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "evento_pacotes_pacote_fkey";
            columns: ["pacote"];
            isOneToOne: false;
            referencedRelation: "pacotes";
            referencedColumns: ["codigo"];
          },
        ];
      };
      tarefa_modelo_subitens: {
        Row: {
          id: string;
          modelo_id: string;
          texto: string;
          ordem: number;
          link: string | null;
        };
        Insert: {
          id?: string;
          modelo_id: string;
          texto: string;
          ordem?: number;
          link?: string | null;
        };
        Update: {
          id?: string;
          modelo_id?: string;
          texto?: string;
          ordem?: number;
          link?: string | null;
        };
        Relationships: [];
      };
      votos: {
        Row: {
          evento_id: string;
          autor_id: string;
          texto: string;
          pronto: boolean;
          atualizado_em: string;
        };
        // escrita só pela RPC salvar_votos (o banco não dá insert/update na tabela)
        Insert: {
          evento_id: string;
          autor_id?: string;
          texto?: string;
          pronto?: boolean;
          atualizado_em?: string;
        };
        Update: {
          evento_id?: string;
          autor_id?: string;
          texto?: string;
          pronto?: boolean;
          atualizado_em?: string;
        };
        Relationships: [];
      };
      tarefa_subitens: {
        Row: {
          id: string;
          tarefa_id: string;
          modelo_subitem_id: string | null;
          texto: string;
          feito: boolean;
          ordem: number;
          criado_em: string;
        };
        Insert: {
          id?: string;
          tarefa_id: string;
          modelo_subitem_id?: string | null;
          texto: string;
          feito?: boolean;
          ordem?: number;
          criado_em?: string;
        };
        Update: {
          id?: string;
          tarefa_id?: string;
          modelo_subitem_id?: string | null;
          texto?: string;
          feito?: boolean;
          ordem?: number;
          criado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tarefa_subitens_tarefa_id_fkey";
            columns: ["tarefa_id"];
            isOneToOne: false;
            referencedRelation: "tarefas";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      tarefas_com_prazo: {
        Row: {
          id: string | null;
          evento_id: string | null;
          modelo_id: string | null;
          titulo: string | null;
          descricao: string | null;
          categoria: string | null;
          offset_dias: number | null;
          prazo_fixo: string | null;
          status: Database["public"]["Enums"]["status_tarefa"] | null;
          concluida_em: string | null;
          concluida_por: string | null;
          responsavel: string | null;
          ordem: number | null;
          criado_em: string | null;
          atualizado_em: string | null;
          prazo_efetivo: string | null;
          prazo_travado: boolean | null;
          prazo_aproximado: boolean | null;
          grupo: string | null;
          editada: boolean | null;
          pacote: string | null;
          guia: string | null;
          subitens_total: number | null;
          subitens_feitos: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      ativar_pacote: {
        Args: { p_evento_id: string; p_pacote: string };
        Returns: { criadas: number; removidas: number }[];
      };
      desativar_pacote: {
        Args: { p_evento_id: string; p_pacote: string };
        Returns: number;
      };
      eh_membro_tarefa: {
        Args: { p_tarefa_id: string };
        Returns: boolean;
      };
      aceitar_convite: {
        Args: { p_token: string };
        Returns: string;
      };
      criar_evento: {
        Args: {
          p_nome_exibicao: string;
          p_data_status?: Database["public"]["Enums"]["data_status"];
          p_data?: string;
          p_horario_cerimonia?: string;
          p_horario_festa?: string;
          p_cidade?: string;
          p_uf?: string;
          p_convidados_estimados?: number;
          p_orcamento_total_centavos?: number;
        };
        Returns: string;
      };
      eh_membro: {
        Args: { p_evento_id: string };
        Returns: boolean;
      };
      hoje_sp: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      salvar_votos: {
        Args: { p_evento_id: string; p_texto: string; p_pronto?: boolean };
        Returns: { pronto: boolean; atualizado_em: string }[];
      };
      status_votos: {
        Args: { p_evento_id: string };
        Returns: { autor_id: string; pronto: boolean; comecou: boolean; atualizado_em: string | null }[];
      };
      obter_convite: {
        Args: { p_token: string };
        Returns: { nome_exibicao: string; email: string; situacao: string }[];
      };
      previa_mudanca_data: {
        Args: {
          p_evento_id: string;
          p_data_status: Database["public"]["Enums"]["data_status"];
          p_data?: string;
        };
        Returns: {
          mudam_de_prazo: number;
          prazo_travado: number;
          passam_a_atrasadas: number;
          ficam_sem_prazo: number;
        }[];
      };
    };
    Enums: {
      data_status: "definida" | "mes_estimado" | "indefinida";
      papel_membro: "parceiro";
      status_tarefa: "pendente" | "concluida";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
