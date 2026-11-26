"use server";

import { sql } from "kysely";
import { redirect } from "next/navigation";
import { consultar, requireSessao } from "@/lib/dal";
import { lerData } from "@/lib/campos-evento";
import { mensagemDeErro, type EstadoForm } from "@/lib/erros";
import { parseBRL, parseInteiro, texto } from "@/lib/formato";
import { UFS } from "@/lib/rotulos";

export async function criarEvento(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const sessao = await requireSessao();

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

  let jaTinha = false;
  try {
    await consultar(sessao, (trx) =>
      sql`
        select criar_evento(
          p_nome_exibicao            => ${`${nome1} & ${nome2}`},
          p_data_status              => ${data.data_status}::public.data_status,
          p_data                     => ${data.data ?? null}::date,
          p_horario_cerimonia        => ${data.horario_cerimonia ?? null}::time,
          p_horario_festa            => ${data.horario_festa ?? null}::time,
          p_cidade                   => ${texto(fd, "cidade") || null},
          p_uf                       => ${uf || null},
          p_convidados_estimados     => ${convidados ?? null}::integer,
          p_orcamento_total_centavos => ${orcamento ?? null}::bigint
        )
      `.execute(trx),
    );
  } catch (e) {
    if ((e as { hint?: string }).hint !== "ja_tem_evento") {
      return { erro: mensagemDeErro(e, "Não foi possível criar o casamento.") };
    }
    jaTinha = true;
  }
  // redirect fora do try: ele funciona lançando uma exceção do Next
  if (jaTinha) redirect("/painel");

  redirect("/painel?bem-vindos=1");
}
