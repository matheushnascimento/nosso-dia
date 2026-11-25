"use server";

import { redirect } from "next/navigation";
import { requireSessao } from "@/lib/dal";
import { lerData } from "@/lib/campos-evento";
import { mensagemDeErro, type EstadoForm } from "@/lib/erros";
import { parseBRL, parseInteiro, texto } from "@/lib/formato";
import { UFS } from "@/lib/rotulos";

export async function criarEvento(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { supabase } = await requireSessao();

  const nome1 = texto(fd, "nome1");
  const nome2 = texto(fd, "nome2");
  if (!nome1 || !nome2) return { erro: "Preencha o nome de vocês dois." };

  const data = lerData(fd);
  if ("erro" in data) return { erro: data.erro };

  const uf = texto(fd, "uf").toUpperCase();
  if (uf && !(UFS as readonly string[]).includes(uf)) return { erro: "UF inválida." };

  const convidados = parseInteiro(fd.get("convidados"));
  if (Number.isNaN(convidados) || (convidados !== null && (convidados < 1 || convidados > 5000))) {
    return { erro: "Informe um número de convidados entre 1 e 5000." };
  }

  const orcamento = parseBRL(texto(fd, "orcamento"));
  if (Number.isNaN(orcamento)) return { erro: "Não entendemos o valor do orçamento. Ex.: 45.000" };

  const { error } = await supabase.rpc("criar_evento", {
    p_nome_exibicao: `${nome1} & ${nome2}`,
    p_data_status: data.data_status,
    p_data: data.data,
    p_horario_cerimonia: data.horario_cerimonia,
    p_horario_festa: data.horario_festa,
    p_cidade: texto(fd, "cidade") || undefined,
    p_uf: uf || undefined,
    p_convidados_estimados: convidados ?? undefined,
    p_orcamento_total_centavos: orcamento ?? undefined,
  });

  if (error) {
    if (error.hint === "ja_tem_evento") redirect("/painel");
    return { erro: mensagemDeErro(error, "Não foi possível criar o casamento.") };
  }

  redirect("/painel?bem-vindos=1");
}
