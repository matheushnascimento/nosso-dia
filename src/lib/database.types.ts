
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "convites_parceiro": {
                  Row: {
                    "aceito_em": string | null,"aceito_por": string | null,"cancelado_em": string | null,"convidado_por": string | null,"criado_em": string,"email": string,"evento_id": string,"expira_em": string,"id": string,"token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aceito_em"?: string | null,"aceito_por"?: string | null,"cancelado_em"?: string | null,"convidado_por"?: string | null,"criado_em"?: string,"email": string,"evento_id": string,"expira_em"?: string,"id"?: string,"token"?: string
                  }
                  Update: {
                    "aceito_em"?: string | null,"aceito_por"?: string | null,"cancelado_em"?: string | null,"convidado_por"?: string | null,"criado_em"?: string,"email"?: string,"evento_id"?: string,"expira_em"?: string,"id"?: string,"token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "convites_parceiro_aceito_por_fkey"
      columns: ["aceito_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "convites_parceiro_convidado_por_fkey"
      columns: ["convidado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "convites_parceiro_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    }
                  ]
                },"evento_pacotes": {
                  Row: {
                    "ativado_em": string,"ativado_por": string | null,"evento_id": string,"pacote": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativado_em"?: string,"ativado_por"?: string | null,"evento_id": string,"pacote": string
                  }
                  Update: {
                    "ativado_em"?: string,"ativado_por"?: string | null,"evento_id"?: string,"pacote"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "evento_pacotes_ativado_por_fkey"
      columns: ["ativado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evento_pacotes_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evento_pacotes_pacote_fkey"
      columns: ["pacote"]
isOneToOne: false
      referencedRelation: "pacotes"
      referencedColumns: ["codigo"]
    }
                  ]
                },"eventos": {
                  Row: {
                    "atualizado_em": string,"cidade": string | null,"convidados_estimados": number | null,"criado_em": string,"criado_por": string | null,"data": string | null,"data_status": Database["public"]['Enums']["data_status"],"fuso": string,"horario_cerimonia": string | null,"horario_festa": string | null,"id": string,"nome_exibicao": string,"orcamento_total_centavos": number | null,"uf": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"cidade"?: string | null,"convidados_estimados"?: number | null,"criado_em"?: string,"criado_por"?: string | null,"data"?: string | null,"data_status"?: Database["public"]['Enums']["data_status"],"fuso"?: string,"horario_cerimonia"?: string | null,"horario_festa"?: string | null,"id"?: string,"nome_exibicao": string,"orcamento_total_centavos"?: number | null,"uf"?: string | null
                  }
                  Update: {
                    "atualizado_em"?: string,"cidade"?: string | null,"convidados_estimados"?: number | null,"criado_em"?: string,"criado_por"?: string | null,"data"?: string | null,"data_status"?: Database["public"]['Enums']["data_status"],"fuso"?: string,"horario_cerimonia"?: string | null,"horario_festa"?: string | null,"id"?: string,"nome_exibicao"?: string,"orcamento_total_centavos"?: number | null,"uf"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "eventos_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"membros": {
                  Row: {
                    "criado_em": string,"evento_id": string,"papel": Database["public"]['Enums']["papel_membro"],"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"evento_id": string,"papel"?: Database["public"]['Enums']["papel_membro"],"usuario_id": string
                  }
                  Update: {
                    "criado_em"?: string,"evento_id"?: string,"papel"?: Database["public"]['Enums']["papel_membro"],"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "membros_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "membros_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"pacotes": {
                  Row: {
                    "ativo": boolean,"automatico": boolean,"codigo": string,"conclui": (string)[],"descricao": string | null,"grupo_escolha": string | null,"nome": string,"ordem": number
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"automatico"?: boolean,"codigo": string,"conclui"?: (string)[],"descricao"?: string | null,"grupo_escolha"?: string | null,"nome": string,"ordem"?: number
                  }
                  Update: {
                    "ativo"?: boolean,"automatico"?: boolean,"codigo"?: string,"conclui"?: (string)[],"descricao"?: string | null,"grupo_escolha"?: string | null,"nome"?: string,"ordem"?: number
                  }
                  Relationships: [
                    
                  ]
                },"perfis": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"id": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"id": string,"nome"?: string
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"id"?: string,"nome"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tarefa_modelo_subitens": {
                  Row: {
                    "id": string,"link": string | null,"modelo_id": string,"ordem": number,"texto": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"link"?: string | null,"modelo_id": string,"ordem"?: number,"texto": string
                  }
                  Update: {
                    "id"?: string,"link"?: string | null,"modelo_id"?: string,"ordem"?: number,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tarefa_modelo_subitens_modelo_id_fkey"
      columns: ["modelo_id"]
isOneToOne: false
      referencedRelation: "tarefa_modelos"
      referencedColumns: ["id"]
    }
                  ]
                },"tarefa_modelos": {
                  Row: {
                    "ativo": boolean,"categoria": string,"codigo": string,"criado_em": string,"descricao": string | null,"guia": string | null,"id": string,"offset_dias": number | null,"ordem": number,"pacote": string,"por_parceiro": boolean,"substitui": (string)[],"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"categoria": string,"codigo": string,"criado_em"?: string,"descricao"?: string | null,"guia"?: string | null,"id"?: string,"offset_dias"?: number | null,"ordem"?: number,"pacote"?: string,"por_parceiro"?: boolean,"substitui"?: (string)[],"titulo": string
                  }
                  Update: {
                    "ativo"?: boolean,"categoria"?: string,"codigo"?: string,"criado_em"?: string,"descricao"?: string | null,"guia"?: string | null,"id"?: string,"offset_dias"?: number | null,"ordem"?: number,"pacote"?: string,"por_parceiro"?: boolean,"substitui"?: (string)[],"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tarefa_modelos_pacote_fkey"
      columns: ["pacote"]
isOneToOne: false
      referencedRelation: "pacotes"
      referencedColumns: ["codigo"]
    }
                  ]
                },"tarefa_subitens": {
                  Row: {
                    "criado_em": string,"feito": boolean,"id": string,"modelo_subitem_id": string | null,"ordem": number,"tarefa_id": string,"texto": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"feito"?: boolean,"id"?: string,"modelo_subitem_id"?: string | null,"ordem"?: number,"tarefa_id": string,"texto": string
                  }
                  Update: {
                    "criado_em"?: string,"feito"?: boolean,"id"?: string,"modelo_subitem_id"?: string | null,"ordem"?: number,"tarefa_id"?: string,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tarefa_subitens_modelo_subitem_id_fkey"
      columns: ["modelo_subitem_id"]
isOneToOne: false
      referencedRelation: "tarefa_modelo_subitens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tarefa_subitens_tarefa_id_fkey"
      columns: ["tarefa_id"]
isOneToOne: false
      referencedRelation: "tarefas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tarefa_subitens_tarefa_id_fkey"
      columns: ["tarefa_id"]
isOneToOne: false
      referencedRelation: "tarefas_com_prazo"
      referencedColumns: ["id"]
    }
                  ]
                },"tarefas": {
                  Row: {
                    "atualizado_em": string,"categoria": string,"concluida_em": string | null,"concluida_por": string | null,"criado_em": string,"descricao": string | null,"editada": boolean,"evento_id": string,"id": string,"modelo_id": string | null,"offset_dias": number | null,"ordem": number,"parceiro": string | null,"prazo_fixo": string | null,"responsavel": string | null,"status": Database["public"]['Enums']["status_tarefa"],"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"categoria"?: string,"concluida_em"?: string | null,"concluida_por"?: string | null,"criado_em"?: string,"descricao"?: string | null,"editada"?: boolean,"evento_id": string,"id"?: string,"modelo_id"?: string | null,"offset_dias"?: number | null,"ordem"?: number,"parceiro"?: string | null,"prazo_fixo"?: string | null,"responsavel"?: string | null,"status"?: Database["public"]['Enums']["status_tarefa"],"titulo": string
                  }
                  Update: {
                    "atualizado_em"?: string,"categoria"?: string,"concluida_em"?: string | null,"concluida_por"?: string | null,"criado_em"?: string,"descricao"?: string | null,"editada"?: boolean,"evento_id"?: string,"id"?: string,"modelo_id"?: string | null,"offset_dias"?: number | null,"ordem"?: number,"parceiro"?: string | null,"prazo_fixo"?: string | null,"responsavel"?: string | null,"status"?: Database["public"]['Enums']["status_tarefa"],"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tarefas_concluida_por_fkey"
      columns: ["concluida_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tarefas_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tarefas_modelo_id_fkey"
      columns: ["modelo_id"]
isOneToOne: false
      referencedRelation: "tarefa_modelos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tarefas_parceiro_fkey"
      columns: ["parceiro"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tarefas_responsavel_fkey"
      columns: ["responsavel"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"votos": {
                  Row: {
                    "atualizado_em": string,"autor_id": string,"evento_id": string,"pronto": boolean,"texto": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"autor_id": string,"evento_id": string,"pronto"?: boolean,"texto"?: string
                  }
                  Update: {
                    "atualizado_em"?: string,"autor_id"?: string,"evento_id"?: string,"pronto"?: boolean,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "votos_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "tarefas_com_prazo": {
                  Row: {
                    "atualizado_em": string,"categoria": string,"concluida_em": string | null,"concluida_por": string | null,"criado_em": string,"descricao": string | null,"editada": boolean,"evento_id": string,"grupo": string | null,"guia": string | null,"id": string,"modelo_id": string | null,"offset_dias": number | null,"ordem": number,"pacote": string | null,"prazo_aproximado": boolean | null,"prazo_efetivo": string | null,"prazo_fixo": string | null,"prazo_travado": boolean | null,"responsavel": string | null,"status": Database["public"]['Enums']["status_tarefa"],"subitens_feitos": number | null,"subitens_total": number | null,"titulo": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "tarefa_modelos_pacote_fkey"
      columns: ["pacote"]
isOneToOne: false
      referencedRelation: "pacotes"
      referencedColumns: ["codigo"]
    },{
      foreignKeyName: "tarefas_concluida_por_fkey"
      columns: ["concluida_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tarefas_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tarefas_modelo_id_fkey"
      columns: ["modelo_id"]
isOneToOne: false
      referencedRelation: "tarefa_modelos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tarefas_responsavel_fkey"
      columns: ["responsavel"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "_aplicar_pacote_em_todos":
{ Args: { "p_pacote": string }; Returns: number
                           },
"_completar_por_parceiro":
{ Args: { "p_evento_id": string }; Returns: number
                           },
"_copiar_pacote":
{ Args: { "p_evento_id": string,"p_pacote": string }; Returns: number
                           },
"_eh_sistema":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"_remover_pacote":
{ Args: { "p_evento_id": string,"p_pacote": string }; Returns: number
                           },
"aceitar_convite":
{ Args: { "p_token": string }; Returns: string
                           },
"ativar_pacote":
{ Args: { "p_evento_id": string,"p_pacote": string }; Returns: {
              "criadas": number,"removidas": number
            }[]
                           },
"criar_evento":
{ Args: { "p_cidade"?: string,"p_convidados_estimados"?: number,"p_data"?: string,"p_data_status"?: Database["public"]['Enums']["data_status"],"p_horario_cerimonia"?: string,"p_horario_festa"?: string,"p_nome_exibicao": string,"p_orcamento_total_centavos"?: number,"p_uf"?: string }; Returns: string
                           },
"desativar_pacote":
{ Args: { "p_evento_id": string,"p_pacote": string }; Returns: number
                           },
"eh_membro":
{ Args: { "p_evento_id": string }; Returns: boolean
                           },
"eh_membro_tarefa":
{ Args: { "p_tarefa_id": string }; Returns: boolean
                           },
"grupo_tarefa":
{ Args: { "p_criada_em": string,"p_hoje": string,"p_prazo": string,"p_status": Database["public"]['Enums']["status_tarefa"] }; Returns: string
                           },
"hoje_sp":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"obter_convite":
{ Args: { "p_token": string }; Returns: {
              "email": string,"nome_exibicao": string,"situacao": string
            }[]
                           },
"prazo_efetivo":
{ Args: { "p_data_evento": string,"p_offset_dias": number,"p_prazo_fixo": string }; Returns: string
                           },
"previa_mudanca_data":
{ Args: { "p_data"?: string,"p_data_status": Database["public"]['Enums']["data_status"],"p_evento_id": string }; Returns: {
              "ficam_sem_prazo": number,"mudam_de_prazo": number,"passam_a_atrasadas": number,"prazo_travado": number
            }[]
                           },
"salvar_votos":
{ Args: { "p_evento_id": string,"p_pronto"?: boolean,"p_texto": string }; Returns: {
              "atualizado_em": string,"pronto": boolean
            }[]
                           },
"status_votos":
{ Args: { "p_evento_id": string }; Returns: {
              "atualizado_em": string,"autor_id": string,"comecou": boolean,"pronto": boolean
            }[]
                           }
          }
          Enums: {
            "data_status": "definida"|"mes_estimado"|"indefinida","papel_membro": "parceiro","status_tarefa": "pendente"|"concluida"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "data_status": ["definida", "mes_estimado", "indefinida"],"papel_membro": ["parceiro"],"status_tarefa": ["pendente", "concluida"]
          }
        }
} as const
